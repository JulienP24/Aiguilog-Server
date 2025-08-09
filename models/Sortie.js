import mongoose from 'mongoose';

const sortieSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sommet: { type: String, required: true },
  altitude: { type: Number, required: true },
  denivele: { type: Number, required: true },
  methode: { type: String, enum: ['Alpinisme', 'Randonnée', 'Escalade'], required: true },
  cotation: { type: String, required: false },
  date: { type: Date, required: false }, // date effective pour sorties faites
  details: { type: String, default: '' },
  done: { type: Boolean, required: true }, // true = sortie faite, false = à faire
}, { timestamps: true });

export default mongoose.model('Sortie', sortieSchema);
