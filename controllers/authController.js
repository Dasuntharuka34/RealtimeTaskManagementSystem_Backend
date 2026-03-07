import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';
import { put, del } from '@vercel/blob';

const generateToken = (res, userId) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });

    res.cookie('jwt', token, {
        httpOnly: true,
        secure: true, // Always true for cross-site cookies in most modern browsers
        sameSite: 'none', // Required for cross-site cookies (Frontend and Backend on different domains)
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    return token;
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
export const authUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        if (!user.isVerified) {
            res.status(401).json({ message: 'Please verify your email to login' });
            return;
        }

        const token = generateToken(res, user._id);
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            token,
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
export const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400).json({ message: 'User already exists' });
        return;
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
        name,
        email,
        password,
        verificationToken,
    });

    if (user) {
        // Construct verification URL
        const verificationUrl = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Email Verification',
                html: `
                <h1>Email Verification</h1>
                <p>Hello ${user.name}, please click the button below to verify your account:</p>
                <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
                <p>If the button doesn't work, you can copy the link below:</p>
                <p>${verificationUrl}</p>
                `,
            });

            res.status(201).json({
                message: 'Verification email sent. Please check your inbox.',
            });
        } catch (error) {
            console.error('Email sending failed', error);
            // Delete the user if email failed to ensure they can retry registration
            await User.findByIdAndDelete(user._id);
            res.status(500).json({ message: 'Email could not be sent, please try again' });
        }
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Verify email
// @route   GET /api/users/verify/:token
// @access  Public
export const verifyEmail = async (req, res) => {
    const { token } = req.params;
    console.log('Verification request received for token:', token);
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
        console.log('No user found for token:', token);
        res.status(400).json({ message: 'Invalid or expired verification token' });
        return;
    }

    console.log('User found:', user.email);
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();
    console.log('User successfully verified:', user.email);

    res.status(200).json({ message: 'Email verified successfully! You can now login.' });
};

// @desc    Logout user / clear cookie
// @route   POST /api/users/logout
// @access  Public
export const logoutUser = (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0),
    });
    res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};
// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;

        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.status(200).json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            avatar: updatedUser.avatar,
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Upload user avatar
// @route   POST /api/users/profile/avatar
// @access  Private
export const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file provided' });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Output to Vercel string
        const filename = `avatars/${user._id}-${Date.now()}-${req.file.originalname}`;
        const blob = await put(filename, req.file.buffer, {
            access: 'public',
        });

        // Optionally, if they already had an avatar, we could delete it from Vercel to save space.
        if (user.avatar && user.avatar.includes('public.blob.vercel-storage.com')) {
            try {
                await del(user.avatar);
            } catch (err) {
                console.error('Failed to delete old avatar:', err);
            }
        }

        user.avatar = blob.url;
        const updatedUser = await user.save();

        res.status(200).json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            avatar: updatedUser.avatar,
        });

    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ message: 'Server Error while uploading avatar' });
    }
};
