import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';

console.log("MONGODB_URI:", process.env.MONGODB_URI);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

client.connect()
  .then(() => {
    console.log("Connecté à MongoDB Atlas");
    const db = client.db("aiguilog");

    // ---------- Inscription ----------
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
        
        const token = jwt.sign({ userId: result.insertedId, username }, JWT_SECRET, { expiresIn: "1h" });
        const userResponse = {
          firstName,
          lastName,
          username,
          birthdate,
          createdAt: userDoc.createdAt
        };
        res.json({ message: "Inscription réussie", token, user: userResponse });
      } catch (err) {
        console.error("Erreur /api/register :", err);
        res.status(500).json({ error: "Erreur serveur lors de l'inscription" });
      }
    });

    // ---------- Recherche de sommets ----------
    app.get('/api/summits', async (req, res) => {
      const q = req.query.q;
      if (!q) return res.json([]);
      try {
        const results = await db.collection("summits").find({
          nom: { $regex: q, $options: "i" }
        }).toArray();
        res.json(results);
      } catch (err) {
        console.error("Erreur dans /api/summits :", err);
        res.status(500).json({ error: "Erreur serveur lors de la recherche" });
      }
    });

    // ---------- Connexion ----------
    app.post('/api/login', async (req, res) => {
      try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: "Identifiant et mot de passe requis" });
        
        const user = await db.collection("users").findOne({ username });
        if (!user) return res.status(400).json({ error: "Utilisateur non trouvé" });
        
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return res.status(400).json({ error: "Mot de passe incorrect" });
        
        const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: "1h" });
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

    // ---------- Middleware d'authentification ----------
    function authMiddleware(req, res, next) {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Non autorisé" });
      const token = authHeader.split(" ")[1];
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
      } catch (err) {
        return res.status(401).json({ error: "Token invalide" });
      }
    }

    // ---------- Ajouter une sortie ----------
    app.post('/api/sorties', authMiddleware, async (req, res) => {
      try {
        const sortieData = req.body;
        if (sortieData.type === "fait" && !sortieData.date) {
          return res.status(400).json({ error: "La date est requise pour une sortie réalisée" });
        } else if (sortieData.type === "a-faire" && !sortieData.annee) {
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

    // ---------- Récupérer les sorties ----------
    app.get('/api/sorties', authMiddleware, async (req, res) => {
      try {
        const sorties = await db.collection("sorties").find({
          userId: new ObjectId(req.user.userId)
        }).toArray();
        res.json(sorties);
      } catch (err) {
        console.error("Erreur /api/sorties (GET):", err);
        res.status(500).json({ error: "Erreur serveur lors de la récupération des sorties" });
      }
    });

    // ---------- Mettre à jour une sortie ----------
    app.put('/api/sorties/:id', authMiddleware, async (req, res) => {
      try {
        const sortieId = req.params.id;
        const updateData = req.body;

        const result = await db.collection("sorties").updateOne(
          { _id: new ObjectId(sortieId), userId: new ObjectId(req.user.userId) },
          { $set: updateData }
        );
        if (result.modifiedCount === 1) {
          res.json({ message: "Sortie mise à jour" });
        } else {
          res.status(400).json({ error: "Aucune mise à jour effectuée" });
        }
      } catch (err) {
        console.error("Erreur /api/sorties (PUT):", err);
        res.status(500).json({ error: "Erreur serveur lors de la mise à jour" });
      }
    });

    // ---------- Supprimer une sortie ----------
    app.delete('/api/sorties/:id', authMiddleware, async (req, res) => {
      try {
        const sortieId = req.params.id;
        const result = await db.collection("sorties").deleteOne({
          _id: new ObjectId(sortieId),
          userId: new ObjectId(req.user.userId)
        });
        if (result.deletedCount === 1) {
          res.json({ message: "Sortie supprimée" });
        } else {
          res.status(400).json({ error: "Sortie non trouvée ou non supprimée" });
        }
      } catch (err) {
        console.error("Erreur /api/sorties (DELETE):", err);
        res.status(500).json({ error: "Erreur serveur lors de la suppression" });
      }
    });
  
    app.listen(PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
  
  })
  .catch(err => {
    console.error("Erreur de connexion à MongoDB Atlas :", err);
  });
