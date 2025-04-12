// server.js

require('dotenv').config(); // Charger les variables d'environnement
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(express.json());
app.use(cors());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useUnifiedTopology: true });

client.connect()
  .then(() => {
    console.log("Connecté à MongoDB Atlas");
    const db = client.db("aiguilog"); // Assurez-vous d'utiliser le même nom que dans la chaîne de connexion

    // Inscription - REGISTER
    app.post('/api/register', async (req, res) => {
      const { username, password, birthdate } = req.body;
      const existingUser = await db.collection("users").findOne({ username });
      if (existingUser) return res.status(400).json({ error: "Utilisateur existant" });
      const passwordHash = await bcrypt.hash(password, 10);
      await db.collection("users").insertOne({
        username,
        passwordHash,
        birthdate,
        createdAt: new Date()
      });
      res.json({ message: "Inscription réussie" });
    });

    // Connexion - LOGIN
    app.post('/api/login', async (req, res) => {
      const { username, password } = req.body;
      const user = await db.collection("users").findOne({ username });
      if (!user) return res.status(400).json({ error: "Utilisateur non trouvé" });
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(400).json({ error: "Mot de passe incorrect" });
      const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: "1h" });
      res.json({ token });
    });

    // Middleware d'authentification
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

    // Exemple d'endpoint pour ajouter une sortie (les données de l'utilisateur)
    app.post('/api/sorties', authMiddleware, async (req, res) => {
      const { sommet, altitude, denivele, details, methode, cotation, annee } = req.body;
      const sortie = {
        userId: ObjectId(req.user.userId),
        sommet,
        altitude,
        denivele,
        details,
        methode,
        cotation,
        annee,
        createdAt: new Date()
      };
      await db.collection("sorties").insertOne(sortie);
      res.json({ message: "Sortie ajoutée" });
    });

    // Endpoint pour récupérer les sorties de l'utilisateur
    app.get('/api/sorties', authMiddleware, async (req, res) => {
      const sorties = await db.collection("sorties").find({ userId: ObjectId(req.user.userId) }).toArray();
      res.json(sorties);
    });

    app.listen(PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });

  })
  .catch(err => {
    console.error("Erreur lors de la connexion à MongoDB Atlas :", err);
  });
