import express from 'express';
import multer from 'multer';
import {
    authUser,
    registerUser,
    logoutUser,
    getUserProfile,
    updateUserProfile,
    verifyEmail,
    uploadAvatar
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/logout', logoutUser);
router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);
router.post('/profile/avatar', protect, upload.single('avatar'), uploadAvatar);
router.get('/verify/:token', verifyEmail);

export default router;
