import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
    let token;
    const cookieToken = req.cookies?.jwt;
    const headerToken = req.headers.authorization?.startsWith('Bearer') 
        ? req.headers.authorization.split(' ')[1] 
        : null;

    token = cookieToken || headerToken;

    console.log('Auth Middleware - URL:', req.originalUrl);
    console.log('Auth Middleware - Source:', cookieToken ? 'Cookie' : (headerToken ? 'Header' : 'None'));

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.userId).select('-password');
            if (!req.user) {
                console.log('Auth Middleware - User not found in DB for ID:', decoded.userId);
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            console.log('Auth Middleware - User verified:', req.user.email);
            next();
        } catch (error) {
            console.error('Auth Middleware - JWT Error:', error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        console.log('Auth Middleware - No token found. Headers:', JSON.stringify(req.headers));
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};
