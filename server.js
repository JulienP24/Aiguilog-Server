// server.js

require('dotenv').config(); // Charger les variables d'environnement
console.log("MONGODB_URI:", process.env.MONGODB_URI);

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri); // useUnifiedTopology n'est plus nécessaire

client.connect()
  .then(() => {
    console.log("Connecté à MongoDB Atlas");
    const db = client.db("aiguilog");

    // ---------- Inscription (REGISTER) ----------
    app.post('/api/register', async (req, res) => {
      try {
        const { firstName, lastName, username, password, birthdate } = req.body;
        if (!firstName || !lastName || !username || !password || !birthdate) {
          return res.status(400).json({ error: "Tous les champs sont requis" });
        }
        const existingUser = await db.collection("users").findOne({ username });
        if (existingUser) {
          return res.status(400).json({ error: "Identifiant déjà utilisé" });
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const userDoc = {
          firstName,
          lastName,
          username,
          passwordHash,
          birthdate,
          createdAt: new Date()
        };
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
        console.error("Erreur dans /api/register :", err);
        res.status(500).json({ error: "Erreur serveur lors de l'inscription" });
      }
    });

    // ---------- Connexion (LOGIN) ----------
    app.post('/api/login', async (req, res) => {
      try {
        const { username, password } = req.body;
        if (!username || !password) {
          return res.status(400).json({ error: "Identifiant et mot de passe sont requis" });
        }
        const user = await db.collection("users").findOne({ username });
        if (!user) {
          return res.status(400).json({ error: "Utilisateur non trouvé" });
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return res.status(400).json({ error: "Mot de passe incorrect" });
        }
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
        console.error("Erreur dans /api/login :", err);
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

    // ---------- Ajout d'une sortie (SORTIES) ----------
    app.post('/api/sorties', authMiddleware, async (req, res) => {
      try {
        const sortieData = req.body;
        // Pour le type "fait", vérifiez que le champ "date" est présent ; pour "a-faire", que le champ "annee" est présent
        if (sortieData.type === "fait" && !sortieData.date) {
          return res.status(400).json({ error: "La date est requise pour une sortie réalisée" });
        }
        if (sortieData.type === "a-faire" && !sortieData.annee) {
          return res.status(400).json({ error: "L'année est requise pour une sortie à faire" });
        }
        sortieData.createdAt = new Date();
        sortieData.userId = ObjectId(req.user.userId);
        await db.collection("sorties").insertOne(sortieData);
        res.json({ message: "Sortie ajoutée" });
      } catch (err) {
        console.error("Erreur dans /api/sorties (POST):", err);
        res.status(500).json({ error: "Erreur serveur lors de l'ajout de la sortie" });
      }
    });

    // ---------- Récupération des sorties ----------
    app.get('/api/sorties', authMiddleware, async (req, res) => {
      try {
        const sorties = await db.collection("sorties").find({ userId: ObjectId(req.user.userId) }).toArray();
        res.json(sorties);
      } catch (err) {
        console.error("Erreur dans /api/sorties (GET):", err);
        res.status(500).json({ error: "Erreur serveur lors de la récupération des sorties" });
      }
    });

    app.listen(PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });

  })
  .catch(err => {
    console.error("Erreur lors de la connexion à MongoDB Atlas :", err);
  });
