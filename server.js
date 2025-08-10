import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "change-moi-en-prod";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

/* ---------- Utils ---------- */
const norm = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // si jamais env Node ne supporte pas, on tombera juste sur la chaîne d'origine
    .toLowerCase();

function pickPublicDir() {
  const c = [
    path.join(process.cwd(), 'public'),
    path.join(__dirname, 'public'),
    path.join(__dirname, '..', 'public'),
    path.join(__dirname, '..', '..', 'public'),
  ];
  for (const p of c) if (fs.existsSync(p)) return p;
  return path.join(process.cwd(), 'public');
}
const PUBLIC_DIR = pickPublicDir();
console.log('🪟 Dossier statique :', PUBLIC_DIR);

/* ---------- Dataset local pour l'autocomplétion ---------- */
const DATA_FILE_CANDIDATES = [
  path.join(process.cwd(), 'data', 'european_summits.json'),
  path.join(__dirname, 'data', 'european_summits.json'),
  path.join(__dirname, '..', 'data', 'european_summits.json'),
];
let SUMMITS = [];
(function loadDataset(){
  for (const p of DATA_FILE_CANDIDATES) {
    if (fs.existsSync(p)) {
      try {
        SUMMITS = JSON.parse(fs.readFileSync(p, 'utf8'));
        console.log(`✓ Dataset sommets chargé (${SUMMITS.length}) depuis`, p);
      } catch (e) {
        console.error('Dataset sommets invalide', e);
      }
      break;
    }
  }
  if (!SUMMITS.length) console.warn('⚠️ Aucune base de sommets trouvée (data/european_summits.json)');
})();
function searchLocalSummits(q, limit = 10) {
  const nq = norm(q);
  const arr = SUMMITS.map(s => ({
    nom: s.name,
    altitude: s.altitude_m ?? null,
    latitude: s.latitude,
    longitude: s.longitude,
    wikidata_id: s.wikidata_id,
  }));
  const pref = arr.filter(x => norm(x.nom).startsWith(nq));
  const incl = arr.filter(x => !norm(x.nom).startsWith(nq) && norm(x.nom).includes(nq));
  return [...pref, ...incl].slice(0, limit);
}

/* ---------- Middlewares ---------- */
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

/* ---------- Connexion Mongo (non bloquante) ---------- */
if (!process.env.MONGODB_URI) {
  console.error("⚠️ MONGODB_URI manquant !");
}
const client = process.env.MONGODB_URI ? new MongoClient(process.env.MONGODB_URI) : null;
let db = null;
async function connectMongo() {
  if (!client) return;
  try {
    await client.connect();
    db = client.db('aiguilog');
    console.log('✓ Connecté à MongoDB Atlas');
  } catch (err) {
    console.error('❌ Connexion Mongo a échoué :', err.message);
  }
}
connectMongo();

/* ---------- Health ---------- */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: !!db });
});

/* ---------- Auth ---------- */
app.post('/api/register', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Base de données indisponible, réessaie dans 1 minute." });

    const { firstName, lastName, username, password, birthdate } = req.body;
    if (!firstName || !lastName || !username || !password || !birthdate) {
      return res.status(400).json({ error: "Tous les champs sont requis" });
    }
    const existingUser = await db.collection('users').findOne({ username });
    if (existingUser) return res.status(400).json({ error: "Identifiant déjà utilisé" });

    const passwordHash = await bcrypt.hash(password, 10);
    const userDoc = { firstName, lastName, username, passwordHash, birthdate, createdAt: new Date() };
    const result = await db.collection('users').insertOne(userDoc);

    const token = jwt.sign({ userId: result.insertedId.toString(), username }, JWT_SECRET, { expiresIn: '1h' });
    const userResponse = { firstName, lastName, username, birthdate, createdAt: userDoc.createdAt };
    res.json({ message: "Inscription réussie", token, user: userResponse });
  } catch (err) {
    console.error('Erreur /api/register :', err);
    res.status(500).json({ error: "Erreur serveur lors de l'inscription" });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Base de données indisponible, réessaie dans 1 minute." });

    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Identifiant et mot de passe requis" });

    const user = await db.collection('users').findOne({ username });
    if (!user) return res.status(400).json({ error: "Utilisateur non trouvé" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ error: "Mot de passe incorrect" });

    const token = jwt.sign({ userId: user._id.toString(), username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    const userResponse = {
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      birthdate: user.birthdate,
      createdAt: user.createdAt
    };
    res.json({ token, user: userResponse });
  } catch (err) {
    console.error('Erreur /api/login :', err);
    res.status(500).json({ error: "Erreur serveur lors de la connexion" });
  }
});

/* ---------- Middleware auth ---------- */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Non autorisé" });
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide" });
  }
}

/* ---------- Sommets (local + mongo fusion) ---------- */
app.get(['/api/summits', '/api/sommets'], async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  try {
    // Résultats Mongo (si dispo)
    let mongo = [];
    if (db) {
      try {
        const raw = await db.collection('summits')
          .find({ nom: { $regex: q, $options: 'i' } })
          .limit(10).toArray();
        mongo = raw.map(s => ({ nom: s.nom || s.name, altitude: s.altitude ?? s.altitude_m ?? null }));
      } catch { /* ignore */ }
    }

    // Résultats dataset local
    const local = searchLocalSummits(q, 10);

    // Merge + dédoublonnage
    const seen = new Set();
    const merged = [...mongo, ...local].filter(it => {
      const k = norm(it.nom);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 12);

    res.json(merged);
  } catch (err) {
    console.error('Erreur /api/sommets :', err);
    res.status(500).json({ error: 'Erreur serveur lors de la recherche' });
  }
});

/* ---------- Sorties CRUD ---------- */
app.post('/api/sorties', authMiddleware, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Base de données indisponible." });
    const s = req.body;
    if (s.type === 'fait' && !s.date) return res.status(400).json({ error: "La date est requise pour une sortie réalisée" });
    if (s.type === 'a-faire' && !s.annee) return res.status(400).json({ error: "L'année est requise pour une sortie à faire" });
    s.createdAt = new Date();
    s.userId = new ObjectId(req.user.userId);
    const result = await db.collection('sorties').insertOne(s);
    res.json({ message: "Sortie ajoutée", id: result.insertedId });
  } catch (err) {
    console.error('Erreur /api/sorties (POST) :', err);
    res.status(500).json({ error: "Erreur serveur lors de l'ajout de la sortie" });
  }
});

app.get('/api/sorties', authMiddleware, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Base de données indisponible." });
    const sorties = await db.collection('sorties')
      .find({ userId: new ObjectId(req.user.userId) })
      .toArray();
    res.json(sorties);
  } catch (err) {
    console.error('Erreur /api/sorties (GET) :', err);
    res.status(500).json({ error: "Erreur serveur lors de la récupération des sorties" });
  }
});

app.put('/api/sorties/:id', authMiddleware, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Base de données indisponible." });
    const id = req.params.id;
    const update = req.body;
    const result = await db.collection('sorties').updateOne(
      { _id: new ObjectId(id), userId: new ObjectId(req.user.userId) },
      { $set: update }
    );
    if (result.modifiedCount === 1) return res.json({ message: "Sortie mise à jour" });
    res.status(400).json({ error: "Aucune mise à jour effectuée" });
  } catch (err) {
    console.error('Erreur /api/sorties (PUT) :', err);
    res.status(500).json({ error: "Erreur serveur lors de la mise à jour" });
  }
});

app.delete('/api/sorties/:id', authMiddleware, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Base de données indisponible." });
    const id = req.params.id;
    const result = await db.collection('sorties').deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId)
    });
    if (result.deletedCount === 1) return res.json({ message: "Sortie supprimée" });
    res.status(400).json({ error: "Sortie non trouvée ou non supprimée" });
  } catch (err) {
    console.error('Erreur /api/sorties (DELETE) :', err);
    res.status(500).json({ error: "Erreur serveur lors de la suppression" });
  }
});

/* ---------- Pages ---------- */
app.get(['/accueil.html','/acceuil.html'], (req, res) => {
  const good = path.join(PUBLIC_DIR, 'accueil.html');
  const typo = path.join(PUBLIC_DIR, 'acceuil.html');
  if (fs.existsSync(good)) return res.sendFile(good);
  if (fs.existsSync(typo)) return res.sendFile(typo);
  return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur sur http://localhost:${PORT}`);
});
