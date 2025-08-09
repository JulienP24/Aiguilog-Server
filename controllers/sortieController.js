import Sortie from '../models/Sortie.js';

// Middleware pour vérifier le token et récupérer userId (middleware auth)
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET;

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Token manquant' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token manquant' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token invalide' });
  }
};

// CRUD sorties

// Ajouter une sortie
export const addSortie = async (req, res) => {
  try {
    const { sommet, altitude, denivele, methode, cotation, date, details, done } = req.body;
    if (!sommet || altitude == null || denivele == null || !methode || done == null) {
      return res.status(400).json({ message: 'Champs obligatoires manquants' });
    }

    const sortie = new Sortie({
      userId: req.user.id,
      sommet,
      altitude,
      denivele,
      methode,
      cotation: cotation || '',
      date: date ? new Date(date) : null,
      details: details || '',
      done,
    });

    await sortie.save();
    res.status(201).json({ message: 'Sortie ajoutée', sortie });
  } catch (err) {
    console.error('Erreur addSortie:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer toutes les sorties d’un user, filtrage possible par done (true/false)
export const getSorties = async (req, res) => {
  try {
    const doneFilter = req.query.done === 'true' ? true : (req.query.done === 'false' ? false : null);
    let filter = { userId: req.user.id };
    if (doneFilter !== null) filter.done = doneFilter;

    const sorties = await Sortie.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(sorties);
  } catch (err) {
    console.error('Erreur getSorties:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer une sortie
export const deleteSortie = async (req, res) => {
  try {
    const { id } = req.params;
    const sortie = await Sortie.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!sortie) return res.status(404).json({ message: 'Sortie non trouvée' });
    res.json({ message: 'Sortie supprimée' });
  } catch (err) {
    console.error('Erreur deleteSortie:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Modifier une sortie
export const updateSortie = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const sortie = await Sortie.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      updateData,
      { new: true }
    );
    if (!sortie) return res.status(404).json({ message: 'Sortie non trouvée' });
    res.json({ message: 'Sortie modifiée', sortie });
  } catch (err) {
    console.error('Erreur updateSortie:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
