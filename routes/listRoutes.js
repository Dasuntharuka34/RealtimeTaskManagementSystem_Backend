import express from 'express';
import { getLists, createList, updateListsOrder, updateList, deleteList } from '../controllers/listController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.put('/reorder', protect, updateListsOrder);
router.route('/')
    .post(protect, createList);
router.route('/:boardId')
    .get(protect, getLists);

router.route('/:id')
    .put(protect, updateList)
    .delete(protect, deleteList);

export default router;
