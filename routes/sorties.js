import express from 'express';
import { addSortie, getSorties, deleteSortie, updateSortie, verifyToken } from '../controllers/sortieController.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', getSorties);
router.post('/', addSortie);
router.delete('/:id', deleteSortie);
router.put('/:id', updateSortie);

export default router;
