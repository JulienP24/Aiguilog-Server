import express from 'express';
import { addSortie, getSorties, deleteSortie, updateSortie, verifyToken } from '../controllers/sortieController.js';

const router = express.Router();

// Middleware d'authentification sur toutes les routes sorties
router.use(verifyToken);

router.post('/', addSortie);
router.get('/', getSorties);
router.delete('/:id', deleteSortie);
router.put('/:id', updateSortie);

export default router;
