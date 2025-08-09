// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  pseudo: { type: String, required: true, unique: true },
  dateNaissance: { type: Date, required: true },
  password: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
