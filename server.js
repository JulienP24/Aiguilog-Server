require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // sert les fichiers statiques

// --- Connexion MongoDB Atlas ---
mongoose.connect(process.env.MONGODB_URI, {
  // plus besoin de useNewUrlParser et useUnifiedTopology avec mongoose 6+
})
.then(() => console.log('✅ Connecté à MongoDB Atlas'))
.catch(err => {
  console.error('❌ Erreur connexion MongoDB:', err.message);
  process.exit(1);
});

// --- Schemas & Models ---
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
});

const SortieSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sommet: String,
  altitude: Number,
  denivele: Number,
  methode: String,
  cotation: String,
  annee: Number,   // pour sorties "à faire"
  date: Date,      // pour sorties "faites"
  details: String,
  status: { type: String, enum: ['a-faire', 'faite'], required: true },
});

const User = mongoose.model('User', UserSchema);
const Sortie = mongoose.model('Sortie', SortieSchema);

// --- Middleware auth JWT ---
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Token manquant' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token manquant' });

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(401).json({ message: 'Token invalide' });
    req.userId = payload.id;
    next();
  });
}

// --- Routes ---

// Inscription
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Champs manquants' });

    const existingUser = await User.findOne({ username });
    if (existingUser)
      return res.status(409).json({ message: 'Nom d’utilisateur déjà pris' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ username, passwordHash });
    await user.save();

    res.status(201).json({ message: 'Utilisateur créé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Connexion
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Champs manquants' });

    const user = await User.findOne({ username });
    if (!user)
      return res.status(401).json({ message: 'Identifiants incorrects' });

    const validPass = await bcrypt.compare(password, user.passwordHash);
    if (!validPass)
      return res.status(401).json({ message: 'Identifiants incorrects' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupérer infos utilisateur connecté
app.get('/api/users/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// --- Sorties à faire ---
// Liste
app.get('/api/sorties/a-faire', authMiddleware, async (req, res) => {
  try {
    const sorties = await Sortie.find({ userId: req.userId, status: 'a-faire' }).lean();
    res.json(sorties);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Ajout
app.post('/api/sorties/a-faire', authMiddleware, async (req, res) => {
  try {
    const { sommet, altitude, denivele, methode, cotation, annee, details } = req.body;

    if (!sommet || !altitude || !denivele || !methode || !cotation || !annee)
      return res.status(400).json({ message: 'Champs manquants' });

    const sortie = new Sortie({
      userId: req.userId,
      sommet,
      altitude,
      denivele,
      methode,
      cotation,
      annee,
      details,
      status: 'a-faire',
    });

    await sortie.save();
    res.status(201).json(sortie);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Suppression
app.delete('/api/sorties/a-faire/:id', authMiddleware, async (req, res) => {
  try {
    const sortie = await Sortie.findOneAndDelete({ _id: req.params.id, userId: req.userId, status: 'a-faire' });
    if (!sortie) return res.status(404).json({ message: 'Sortie non trouvée' });
    res.json({ message: 'Sortie supprimée' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// --- Sorties faites ---
// Liste
app.get('/api/sorties/faites', authMiddleware, async (req, res) => {
  try {
    const sorties = await Sortie.find({ userId: req.userId, status: 'faite' }).lean();
    res.json(sorties);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Ajout
app.post('/api/sorties/faites', authMiddleware, async (req, res) => {
  try {
    const { sommet, altitude, denivele, methode, cotation, date, details } = req.body;

    if (!sommet || !altitude || !denivele || !methode || !cotation || !date)
      return res.status(400).json({ message: 'Champs manquants' });

    const sortie = new Sortie({
      userId: req.userId,
      sommet,
      altitude,
      denivele,
      methode,
      cotation,
      date,
      details,
      status: 'faite',
    });

    await sortie.save();
    res.status(201).json(sortie);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Suppression
app.delete('/api/sorties/faites/:id', authMiddleware, async (req, res) => {
  try {
    const sortie = await Sortie.findOneAndDelete({ _id: req.params.id, userId: req.userId, status: 'faite' });
    if (!sortie) return res.status(404).json({ message: 'Sortie non trouvée' });
    res.json({ message: 'Sortie supprimée' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// --- Catch-all : pour gérer un GET / (affiche index.html) ---
// (Render utilise le port 10000 mais pas de souci)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Démarrage serveur ---
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
