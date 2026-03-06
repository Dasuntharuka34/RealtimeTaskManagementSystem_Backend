import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
    },
});

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));
app.use(express.json());

import cookieParser from 'cookie-parser';
app.use(cookieParser());

import authRoutes from './routes/authRoutes.js';
import boardRoutes from './routes/boardRoutes.js';
import listRoutes from './routes/listRoutes.js';
import cardRoutes from './routes/cardRoutes.js';

app.use('/api/users', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/cards', cardRoutes);

app.get('/', (req, res) => {
    res.send('API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error stack:', err.stack);
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

import { setupSockets } from './sockets/socketHandlers.js';
setupSockets(io);

const PORT = process.env.PORT || 5000;

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kanban');
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB connection error:', err);
    }
};

// For local development
if (process.env.NODE_ENV !== 'production') {
    connectDB().then(() => {
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    });
} else {
    // In production (Vercel), we just connect to DB
    connectDB();
}

export default app;
