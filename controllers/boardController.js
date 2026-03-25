import Board from '../models/Board.js';
import List from '../models/List.js';
import Card from '../models/Card.js';
import User from '../models/User.js';

// @desc    Get all boards for user
// @route   GET /api/boards
// @access  Private
export const getBoards = async (req, res) => {
    try {
        const boards = await Board.find({
            $or: [{ owner: req.user._id }, { members: req.user._id }, { privacy: 'Public' }]
        }).populate('owner', 'name email avatar');
        res.status(200).json(boards);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a new board
// @route   POST /api/boards
// @access  Private
export const createBoard = async (req, res) => {
    const { title, description, privacy } = req.body;

    try {
        const board = await Board.create({
            title,
            description,
            privacy,
            owner: req.user._id,
            members: [req.user._id]
        });
        res.status(201).json(board);
        const io = req.app.get('io');
        if (io) io.emit('dashboard-updated');
    } catch (error) {
        res.status(400).json({ message: 'Invalid board data' });
    }
};

// @desc    Get single board by ID
// @route   GET /api/boards/:id
// @access  Private
export const getBoardById = async (req, res) => {
    try {
        const board = await Board.findById(req.params.id)
            .populate('owner', 'name email avatar')
            .populate('members', 'name email avatar');

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        // Check if the board is public or if the user is owner/member
        const isOwner = board.owner._id.toString() === req.user._id.toString();
        const isMember = board.members.some(member => member._id.toString() === req.user._id.toString());

        if (board.privacy !== 'Public' && !isOwner && !isMember) {
            return res.status(403).json({ message: 'Not authorized to access this board' });
        }

        res.status(200).json(board);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update board settings (title, description, privacy)
// @route   PATCH /api/boards/:id
// @access  Private (owner only)
export const updateBoard = async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);

        if (!board) return res.status(404).json({ message: 'Board not found' });
        if (board.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized. Only the owner can update board settings.' });
        }

        const { title, description, privacy } = req.body;
        if (title !== undefined) board.title = title;
        if (description !== undefined) board.description = description;
        if (privacy !== undefined) board.privacy = privacy;

        const updated = await board.save();
        const populated = await updated.populate([
            { path: 'owner', select: 'name email avatar' },
            { path: 'members', select: 'name email avatar' }
        ]);

        res.status(200).json(populated);
        const io = req.app.get('io');
        if (io) {
            io.to(req.params.id.toString()).emit('board-updated');
            io.emit('dashboard-updated');
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a board (and all its lists and cards)
// @route   DELETE /api/boards/:id
// @access  Private (owner only)
export const deleteBoard = async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);

        if (!board) return res.status(404).json({ message: 'Board not found' });
        if (board.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized. Only the owner can delete this board.' });
        }

        // Cascade delete lists and cards
        const lists = await List.find({ boardId: req.params.id });
        const listIds = lists.map(l => l._id);
        await Card.deleteMany({ listId: { $in: listIds } });
        await List.deleteMany({ boardId: req.params.id });
        await Board.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: 'Board deleted successfully' });
        const io = req.app.get('io');
        if (io) {
            io.to(req.params.id.toString()).emit('board-updated');
            io.emit('dashboard-updated');
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Invite a member by email
// @route   POST /api/boards/:id/invite
// @access  Private (members can invite)
export const inviteMember = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const board = await Board.findById(req.params.id);
        if (!board) return res.status(404).json({ message: 'Board not found' });

        // Check if requester is a member
        const isMember = board.members.some(m => m.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Not authorized' });

        const userToInvite = await User.findOne({ email: email.toLowerCase().trim() });
        if (!userToInvite) return res.status(404).json({ message: 'No user found with that email address' });

        // Check if already a member
        const alreadyMember = board.members.some(m => m.toString() === userToInvite._id.toString());
        if (alreadyMember) return res.status(400).json({ message: 'User is already a member of this board' });

        board.members.push(userToInvite._id);
        await board.save();

        const populated = await board.populate([
            { path: 'owner', select: 'name email avatar' },
            { path: 'members', select: 'name email avatar' }
        ]);

        res.status(200).json(populated);
        const io = req.app.get('io');
        if (io) {
            io.to(req.params.id.toString()).emit('board-updated');
            io.emit('dashboard-updated');
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Remove a member from a board
// @route   DELETE /api/boards/:id/members/:userId
// @access  Private (owner only)
export const removeMember = async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);

        if (!board) return res.status(404).json({ message: 'Board not found' });
        if (board.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized. Only the owner can remove members.' });
        }

        const userIdToRemove = req.params.userId;
        if (board.owner.toString() === userIdToRemove) {
            return res.status(400).json({ message: 'Owner cannot be removed from the board' });
        }

        board.members = board.members.filter(m => m.toString() !== userIdToRemove);
        await board.save();

        const populated = await board.populate([
            { path: 'owner', select: 'name email avatar' },
            { path: 'members', select: 'name email avatar' }
        ]);

        res.status(200).json(populated);
        const io = req.app.get('io');
        if (io) {
            io.to(req.params.id.toString()).emit('board-updated');
            io.emit('dashboard-updated');
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
