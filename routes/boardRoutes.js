import express from 'express';
import {
    getBoards,
    createBoard,
    getBoardById,
    updateBoard,
    deleteBoard,
    inviteMember,
    removeMember
} from '../controllers/boardController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
    .get(protect, getBoards)
    .post(protect, createBoard);

router.route('/:id')
    .get(protect, getBoardById)
    .patch(protect, updateBoard)
    .delete(protect, deleteBoard);

router.route('/:id/invite')
    .post(protect, inviteMember);

router.route('/:id/members/:userId')
    .delete(protect, removeMember);

export default router;
