// controllers/authController.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const saltRounds = 10;
const JWT_SECRET = process.env.JWT_SECRET;

export const register = async (req, res) => {
  try {
    const { nom, prenom, pseudo, dateNaissance, password } = req.body;
    if (!nom || !prenom || !pseudo || !dateNaissance || !password) 
      return res.status(400).json({ message: 'Tous les champs sont obligatoires.' });

    const existingUser = await User.findOne({ pseudo });
    if (existingUser) return res.status(409).json({ message: 'Pseudo déjà utilisé' });

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = new User({
      nom, prenom, pseudo, dateNaissance: new Date(dateNaissance), password: hashedPassword
    });
    await newUser.save();

    // Après inscription, on peut directement générer le token et renvoyer l'user sans le mdp
    const token = jwt.sign({ id: newUser._id, pseudo: newUser.pseudo }, JWT_SECRET, { expiresIn: '12h' });
    const { password: _, ...userData } = newUser.toObject();

    res.status(201).json({ message: 'Utilisateur créé', user: userData, token });
  } catch (err) {
    console.error('Erreur register:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const login = async (req, res) => {
  try {
    const { pseudo, password } = req.body;
    if (!pseudo || !password) return res.status(400).json({ message: 'Pseudo et mot de passe requis' });

    const user = await User.findOne({ pseudo });
    if (!user) return res.status(401).json({ message: 'Pseudo ou mot de passe incorrect' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Pseudo ou mot de passe incorrect' });

    const token = jwt.sign({ id: user._id, pseudo: user.pseudo }, JWT_SECRET, { expiresIn: '12h' });
    const { password: _, ...userData } = user.toObject();

    res.json({ message: 'Connexion réussie', user: userData, token });
  } catch (err) {
    console.error('Erreur login:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
