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

// charge data/european_summits.json (peu importe où tourne le serveur)
const DATA_FILE_CANDIDATES = [
  path.join(process.cwd(), 'data', 'european_summits.json'),
  path.join(__dirname, 'data', 'european_summits.json'),
  path.join(__dirname, '..', 'data', 'european_summits.json'),
];

let SUMMITS = [];
(function loadDataset(){
  for (const p of DATA_FILE_CANDIDATES){
    if (fs.existsSync(p)){
      try {
        SUMMITS = JSON.parse(fs.readFileSync(p, 'utf8'));
        console.log(`✓ Dataset sommets chargé (${SUMMITS.length}) depuis`, p);
      } catch(e){ console.error('Dataset sommets invalide', e); }
      break;
    }
  }
  if (!SUMMITS.length) console.warn('⚠️ Aucune base de sommets trouvée (data/european_summits.json)');
})();

const norm = s => (s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
function searchLocalSummits(q, limit=10){
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

// Dossier statique (tes .html/.css/.js)
const PUBLIC_DIR = path.resolve('public');

if (!process.env.MONGODB_URI) {
  console.error("⚠️ Erreur : MONGODB_URI non défini !");
  process.exit(1);
}

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());

// Sert /index.html, /accueil.html, style.css, script.js, etc.
app.use(express.static(PUBLIC_DIR));

const client = new MongoClient(process.env.MONGODB_URI);

async function start() {
  try {
    await client.connect();
    console.log("Connecté à MongoDB Atlas");
    const db = client.db("aiguilog");

    // ---------- Auth ----------
    app.post('/api/register', async (req, res) => {
      try {
        const { firstName, lastName, username, password, birthdate } = req.body;
        if (!firstName || !lastName || !username || !password || !birthdate) {
          return res.status(400).json({ error: "Tous les champs sont requis" });
        }
        const existingUser = await db.collection("users").findOne({ username });
        if (existingUser) return res.status(400).json({ error: "Identifiant déjà utilisé" });

        const passwordHash = await bcrypt.hash(password, 10);
        const userDoc = { firstName, lastName, username, passwordHash, birthdate, createdAt: new Date() };
        const result = await db.collection("users").insertOne(userDoc);

        const token = jwt.sign(
          { userId: result.insertedId.toString(), username },
          JWT_SECRET,
          { expiresIn: "1h" }
        );
        const userResponse = { firstName, lastName, username, birthdate, createdAt: userDoc.createdAt };
        res.json({ message: "Inscription réussie", token, user: userResponse });
      } catch (err) {
        console.error("Erreur /api/register :", err);
        res.status(500).json({ error: "Erreur serveur lors de l'inscription" });
      }
    });

    app.post('/api/login', async (req, res) => {
      try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: "Identifiant et mot de passe requis" });

        const user = await db.collection("users").findOne({ username });
        if (!user) return res.status(400).json({ error: "Utilisateur non trouvé" });

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return res.status(400).json({ error: "Mot de passe incorrect" });

        const token = jwt.sign(
          { userId: user._id.toString(), username: user.username },
          JWT_SECRET,
          { expiresIn: "1h" }
        );
        const userResponse = {
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          birthdate: user.birthdate,
          createdAt: user.createdAt
        };
        res.json({ token, user: userResponse });
      } catch (err) {
        console.error("Erreur /api/login :", err);
        res.status(500).json({ error: "Erreur serveur lors de la connexion" });
      }
    });

    // ---------- Middleware auth ----------
    function authMiddleware(req, res, next) {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Non autorisé" });
      const token = authHeader.split(" ")[1];
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
      } catch {
        return res.status(401).json({ error: "Token invalide" });
      }
    }

    // ---------- Sommets (alias EN/FR pour matcher le front) ----------
    app.get(['/api/summits','/api/sommets'], async (req, res) => {
      const q = (req.query.q || '').trim();
      if (!q) return res.json([]);

      try {
        // Mongo (si tu as une collection "summits", sinon ça renverra vide)
        let mongo = [];
        try {
          mongo = await client.db("aiguilog").collection("summits")
            .find({ nom: { $regex: q, $options: 'i' } })
            .limit(10).toArray();
          mongo = mongo.map(s => ({ nom: s.nom || s.name, altitude: s.altitude ?? s.altitude_m ?? null }));
        } catch { mongo = []; }

        // Local JSON
        const local = searchLocalSummits(q, 10);

        // Merge + dedupe par nom
        const seen = new Set();
        const merged = [...mongo, ...local].filter(it => {
          const k = norm(it.nom);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        }).slice(0, 12);

        res.json(merged);
      } catch (err) {
        console.error('Erreur /api/sommets:', err);
        res.status(500).json({ error: 'Erreur serveur lors de la recherche' });
      }
    });


    // ---------- Sorties ----------
    app.post('/api/sorties', authMiddleware, async (req, res) => {
      try {
        const sortieData = req.body;
        if (sortieData.type === "fait" && !sortieData.date) {
          return res.status(400).json({ error: "La date est requise pour une sortie réalisée" });
        }
        if (sortieData.type === "a-faire" && !sortieData.annee) {
          return res.status(400).json({ error: "L'année est requise pour une sortie à faire" });
        }
        sortieData.createdAt = new Date();
        sortieData.userId = new ObjectId(req.user.userId);

        const result = await db.collection("sorties").insertOne(sortieData);
        res.json({ message: "Sortie ajoutée", id: result.insertedId });
      } catch (err) {
        console.error("Erreur /api/sorties (POST):", err);
        res.status(500).json({ error: "Erreur serveur lors de l'ajout de la sortie" });
      }
    });

    app.get('/api/sorties', authMiddleware, async (req, res) => {
      try {
        const sorties = await db.collection("sorties")
          .find({ userId: new ObjectId(req.user.userId) })
          .toArray();
        res.json(sorties);
      } catch (err) {
        console.error("Erreur /api/sorties (GET):", err);
        res.status(500).json({ error: "Erreur serveur lors de la récupération des sorties" });
      }
    });

    app.put('/api/sorties/:id', authMiddleware, async (req, res) => {
      try {
        const sortieId = req.params.id;
        const updateData = req.body;
        const result = await db.collection("sorties").updateOne(
          { _id: new ObjectId(sortieId), userId: new ObjectId(req.user.userId) },
          { $set: updateData }
        );
        if (result.modifiedCount === 1) return res.json({ message: "Sortie mise à jour" });
        res.status(400).json({ error: "Aucune mise à jour effectuée" });
      } catch (err) {
        console.error("Erreur /api/sorties (PUT):", err);
        res.status(500).json({ error: "Erreur serveur lors de la mise à jour" });
      }
    });

    app.delete('/api/sorties/:id', authMiddleware, async (req, res) => {
      try {
        const sortieId = req.params.id;
        const result = await db.collection("sorties").deleteOne({
          _id: new ObjectId(sortieId),
          userId: new ObjectId(req.user.userId)
        });
        if (result.deletedCount === 1) return res.json({ message: "Sortie supprimée" });
        res.status(400).json({ error: "Sortie non trouvée ou non supprimée" });
      } catch (err) {
        console.error("Erreur /api/sorties (DELETE):", err);
        res.status(500).json({ error: "Erreur serveur lors de la suppression" });
      }
    });

    // ---------- Routes de pages ----------
    // Sert explicitement /accueil.html (évite le Cannot GET si déploiement capricieux)
    app.get('/accueil.html', (req, res) => {
      res.sendFile('accueil.html', { root: PUBLIC_DIR });
    });

    // (Optionnel) fallback SPA : renvoyer index.html pour les routes inconnues non-API
    // app.get(/^\/(?!api\/).*/, (req, res) => {
    //   res.sendFile('index.html', { root: PUBLIC_DIR });
    // });

    app.listen(PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error("Erreur de connexion à MongoDB Atlas :", err);
    process.exit(1);
  }
}

start();
