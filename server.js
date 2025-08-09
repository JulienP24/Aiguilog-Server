import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI non défini dans .env');
  process.exit(1);
}

// Middlewares
app.use(cors({
  origin: '*', // adapter en prod
  credentials: true,
}));
app.use(express.json());

// Connexion à MongoDB Atlas
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connecté à MongoDB Atlas'))
  .catch((err) => {
    console.error('❌ Erreur connexion MongoDB :', err);
    process.exit(1);
  });

// Schéma utilisateur
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// Routes API

// Enregistrement utilisateur
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Champs manquants' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'Utilisateur déjà existant' });
    }

    // Ici, on pourrait hasher le mot de passe (bcrypt), mais tu n’as pas demandé ça explicitement

    const newUser = new User({ username, password });
    await newUser.save();

    return res.status(201).json({ message: 'Utilisateur créé' });
  } catch (error) {
    console.error('Erreur /api/register:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Connexion utilisateur
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Champs manquants' });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ message: 'Identifiant ou mot de passe incorrect' });
    }

    // Comparaison simple, pas sécurisée (à remplacer par bcrypt.compare)
    if (user.password !== password) {
      return res.status(401).json({ message: 'Identifiant ou mot de passe incorrect' });
    }

    // Retour simple, tu peux ajouter JWT si tu veux
    return res.json({ message: 'Connexion réussie', username: user.username });
  } catch (error) {
    console.error('Erreur /api/login:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Servir fichiers statiques frontend depuis /public
app.use(express.static(path.join(process.cwd(), 'public')));

// Toutes les autres routes redirigent vers index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// Démarrage serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
