import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "change-moi-en-prod";

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
    app.get(['/api/summits', '/api/sommets'], async (req, res) => {
      const q = req.query.q;
      if (!q) return res.json([]);
      try {
        const results = await db.collection("summits")
          .find({ nom: { $regex: q, $options: "i" } })
          .toArray();
        res.json(results);
      } catch (err) {
        console.error("Erreur dans /api/summits :", err);
        res.status(500).json({ error: "Erreur serveur lors de la recherche" });
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
