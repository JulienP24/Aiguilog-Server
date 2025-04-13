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
const client = new MongoClient(uri); // Plus besoin de useUnifiedTopology avec les dernières versions

client.connect()
  .then(() => {
    console.log("Connecté à MongoDB Atlas");
    const db = client.db("aiguilog"); // Assurez-vous d'utiliser le même nom que dans votre chaîne de connexion

    // ----------- Endpoint d'inscription (REGISTER) -------------
    // Attendu : { firstName, lastName, username, password, birthdate }
    app.post('/api/register', async (req, res) => {
      try {
        const { firstName, lastName, username, password, birthdate } = req.body;
        // Vérifier que tous les champs sont fournis
        if (!firstName || !lastName || !username || !password || !birthdate) {
          return res.status(400).json({ error: "Tous les champs sont requis" });
        }
        // Vérifier si l'identifiant est déjà utilisé
        const existingUser = await db.collection("users").findOne({ username });
        if (existingUser) {
          return res.status(400).json({ error: "Identifiant déjà utilisé" });
        }
        // Hacher le mot de passe
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
        // Générer le token JWT
        const token = jwt.sign({ userId: result.insertedId, username }, JWT_SECRET, { expiresIn: "1h" });
        // Préparer la réponse sans le mot de passe
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

    // ----------- Endpoint de connexion (LOGIN) -------------
    // Attendu : { username, password }
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

    // ----------- Middleware d'authentification -------------
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

    // ----------- Endpoint pour ajouter une sortie -------------
    // Utilisé pour les sorties "à faire" ou "faites"
    app.post('/api/sorties', authMiddleware, async (req, res) => {
      try {
        const sortieData = req.body;
        // Vous pouvez ajouter ici une validation pour les champs requis
        sortieData.createdAt = new Date();
        sortieData.userId = ObjectId(req.user.userId);
        await db.collection("sorties").insertOne(sortieData);
        res.json({ message: "Sortie ajoutée" });
      } catch (err) {
        console.error("Erreur dans /api/sorties (POST):", err);
        res.status(500).json({ error: "Erreur serveur lors de l'ajout de la sortie" });
      }
    });

    // ----------- Endpoint pour récupérer les sorties de l'utilisateur -------------
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
