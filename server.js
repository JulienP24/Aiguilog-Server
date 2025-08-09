import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import sortieRoutes from './routes/sorties.js';

dotenv.config();

// Affiche l'état des variables d'environnement
console.log('Variables d\'environnement:');
console.log('MONGO_URI:', process.env.MONGO_URI ? '[OK]' : '[NON TROUVÉ]');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '[OK]' : '[NON TROUVÉ]');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_URL = process.env.CLIENT_URL;

// Vérification variables obligatoires
if (!MONGO_URI || !process.env.JWT_SECRET) {
  console.error('❌ MONGO_URI ou JWT_SECRET non définis dans .env');
  process.exit(1);
}

// CORS whitelist
const whitelist = [CLIENT_URL, 'http://localhost:5500'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Autorise les requêtes sans origin (ex: curl)
    if (whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Connexion à MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connecté à MongoDB'))
  .catch(err => {
    console.error('❌ Erreur connexion MongoDB:', err);
    process.exit(1);
  });

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/sorties', sortieRoutes);

// Fichiers statiques du frontend
app.use(express.static(path.join(__dirname, 'public')));

// Fallback SPA (compatible Express 5)
app.get('/:path(*)', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});
