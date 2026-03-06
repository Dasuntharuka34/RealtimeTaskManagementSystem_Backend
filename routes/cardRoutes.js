import express from 'express';
import {
    getCards,
    getCardsByBoard,
    createCard,
    updateCard,
    updateCardsOrder,
    deleteCard
} from '../controllers/cardController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.put('/reorder', protect, updateCardsOrder);
router.route('/')
    .post(protect, createCard);
router.route('/:listId')
    .get(protect, getCards);
router.route('/board/:boardId')
    .get(protect, getCardsByBoard);
router.route('/:id')
    .put(protect, updateCard)
    .delete(protect, deleteCard);

export default router;
