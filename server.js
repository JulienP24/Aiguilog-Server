require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Vérification des variables d'environnement
if (!mongoUri) {
  console.error("ERREUR: La variable d'environnement MONGODB_URI n'est pas définie !");
  process.exit(1);
}

// Connexion MongoDB Atlas
mongoose.connect(mongoUri)
  .then(() => console.log('✅ Connecté à MongoDB Atlas'))
  .catch((err) => {
    console.error('❌ Erreur connexion MongoDB:', err);
    process.exit(1);
  });

// Middlewares
app.use(cors());
app.use(express.json());

// Schemas Mongoose

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
});

const sortieSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sommet: String,
  altitude: Number,
  denivele: Number,
  methode: String,
  cotation: String,
  annee: Number,
  date: Date,          // Pour sorties faites
  details: String,
  status: { type: String, enum: ['a-faire', 'fait'], required: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Sortie = mongoose.model('Sortie', sortieSchema);

// Middleware auth
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant ou invalide' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

// Routes

// Inscription
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Identifiant et mot de passe requis' });

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser)
      return res.status(400).json({ error: 'Identifiant déjà utilisé' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ username, passwordHash });
    await user.save();
    res.status(201).json({ message: 'Compte créé avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Connexion
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Identifiant et mot de passe requis' });

  try {
    const user = await User.findOne({ username });
    if (!user)
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer infos utilisateur connecté
app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('username');
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json({ username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// CRUD sorties

// Créer sortie (a-faire ou fait)
app.post('/api/sorties', authMiddleware, async (req, res) => {
  const { sommet, altitude, denivele, methode, cotation, annee, date, details, status } = req.body;
  if (!['a-faire', 'fait'].includes(status)) {
    return res.status(400).json({ error: 'Status invalide (doit être "a-faire" ou "fait")' });
  }
  try {
    const sortie = new Sortie({
      userId: req.userId,
      sommet,
      altitude,
      denivele,
      methode,
      cotation,
      annee,
      date: status === 'fait' && date ? new Date(date) : null,
      details,
      status,
    });
    await sortie.save();
    res.status(201).json(sortie);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer toutes sorties user, avec option status
app.get('/api/sorties', authMiddleware, async (req, res) => {
  const { status } = req.query; // 'a-faire' ou 'fait'
  const filter = { userId: req.userId };
  if (status) filter.status = status;

  try {
    const sorties = await Sortie.find(filter).sort({ createdAt: -1 });
    res.json(sorties);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier sortie (id dans params)
app.put('/api/sorties/:id', authMiddleware, async (req, res) => {
  const sortieId = req.params.id;
  const updates = req.body;

  try {
    const sortie = await Sortie.findOne({ _id: sortieId, userId: req.userId });
    if (!sortie) return res.status(404).json({ error: 'Sortie non trouvée' });

    Object.assign(sortie, updates);
    await sortie.save();
    res.json(sortie);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer sortie
app.delete('/api/sorties/:id', authMiddleware, async (req, res) => {
  const sortieId = req.params.id;

  try {
    const sortie = await Sortie.findOneAndDelete({ _id: sortieId, userId: req.userId });
    if (!sortie) return res.status(404).json({ error: 'Sortie non trouvée' });
    res.json({ message: 'Sortie supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Démarrage serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
