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
const client = new MongoClient(uri); // Option useUnifiedTopology n'est plus nécessaire avec les versions récentes

client.connect()
  .then(() => {
    console.log("Connecté à MongoDB Atlas");
    // On utilise la base 'aiguilog'. Assurez-vous que le nom correspond à celui souhaité.
    const db = client.db("aiguilog");

    /**
     * Endpoint d'inscription.
     * Attendu : { firstName, lastName, username, password, birthdate }
     * Vérifie que l'utilisateur n'existe pas déjà,
     * hache le mot de passe, insère l'utilisateur et renvoie un token ainsi que les infos (sans le mot de passe).
     */
    app.post('/api/register', async (req, res) => {
      try {
        const { firstName, lastName, username, password, birthdate } = req.body;
        if (!firstName || !lastName || !username || !password || !birthdate) {
          return res.status(400).json({ error: "Tous les champs sont requis" });
        }
  
        // Vérifier si un utilisateur avec ce username existe déjà
        const existingUser = await db.collection("users").findOne({ username });
        if (existingUser) {
          return res.status(400).json({ error: "Identifiant déjà utilisé" });
        }
  
        // Hachage du mot de passe
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
  
        // Génération du token. On peut inclure l'id et le username dans le token.
        const token = jwt.sign({ userId: result.insertedId, username }, JWT_SECRET, { expiresIn: "1h" });
  
        // Préparer l'objet utilisateur à renvoyer (sans le password)
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
  
    /**
     * Endpoint de connexion.
     * Attendu : { username, password }
     * Vérifie les identifiants et renvoie un token ainsi que les infos utilisateur.
     */
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
  
        // Préparer l'objet utilisateur (en excluant le mot de passe)
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
  
    /**
     * Middleware d'authentification.
     * Vérifie que le token fourni dans l'en-tête Authorization est valide.
     */
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
  
    /**
     * Endpoint pour ajouter une sortie.
     * Attendu : objet sortie contenant les champs requis.
     * L'endpoint est protégé par authMiddleware.
     */
    app.post('/api/sorties', authMiddleware, async (req, res) => {
      try {
        const sortieData = req.body;
        // Ajoutez ici toute validation nécessaire (par exemple, vérifier les champs obligatoires)
        sortieData.createdAt = new Date();
        // L'identifiant de l'utilisateur est extrait du token (req.user.userId)
        sortieData.userId = ObjectId(req.user.userId);
  
        await db.collection("sorties").insertOne(sortieData);
        res.json({ message: "Sortie ajoutée" });
      } catch (err) {
        console.error("Erreur dans /api/sorties (POST):", err);
        res.status(500).json({ error: "Erreur serveur lors de l'ajout de la sortie" });
      }
    });
  
    /**
     * Endpoint pour récupérer les sorties de l'utilisateur connecté.
     * Protégé par authMiddleware.
     */
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
