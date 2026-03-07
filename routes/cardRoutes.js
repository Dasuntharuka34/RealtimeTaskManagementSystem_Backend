import express from 'express';
import multer from 'multer';
import {
    getCards,
    getCardsByBoard,
    createCard,
    updateCard,
    updateCardsOrder,
    deleteCard,
    addAttachment,
    deleteAttachment
} from '../controllers/cardController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

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

router.post('/:id/attachments', protect, upload.single('file'), addAttachment);
router.delete('/:id/attachments/:attachmentId', protect, deleteAttachment);

export default router;
