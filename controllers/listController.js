import List from '../models/List.js';
import Board from '../models/Board.js';

// @desc    Get lists by board ID
// @route   GET /api/lists/:boardId
// @access  Private
export const getLists = async (req, res) => {
    try {
        const lists = await List.find({ boardId: req.params.boardId }).sort('position');
        res.status(200).json(lists);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a list
// @route   POST /api/lists
// @access  Private
export const createList = async (req, res) => {
    const { title, boardId } = req.body;

    try {
        const board = await Board.findById(boardId);
        if (!board) return res.status(404).json({ message: 'Board not found' });

        const isOwner = board.owner.toString() === req.user._id.toString();
        const isMember = board.members.some(id => id.toString() === req.user._id.toString());

        if (!isOwner && !isMember) {
            return res.status(403).json({ message: 'Not authorized to add lists to this board' });
        }

        const lists = await List.find({ boardId });
        const position = lists.length;

        const list = await List.create({
            title,
            boardId,
            position
        });

        res.status(201).json(list);
        const io = req.app.get('io');
        if (io) io.to(boardId.toString()).emit('board-updated');
    } catch (error) {
        res.status(400).json({ message: 'Invalid list data' });
    }
};

// @desc    Update lists positions
// @route   PUT /api/lists/reorder
// @access  Private
export const updateListsOrder = async (req, res) => {
    const { lists } = req.body; // array of { _id, position }

    try {
        if (lists.length === 0) return res.status(200).json({ message: 'No lists to reorder' });

        const firstList = await List.findById(lists[0]._id);
        if (!firstList) return res.status(404).json({ message: 'List not found' });

        const board = await Board.findById(firstList.boardId);
        if (!board) return res.status(404).json({ message: 'Board not found' });

        const isOwner = board.owner.toString() === req.user._id.toString();
        const isMember = board.members.some(id => id.toString() === req.user._id.toString());

        if (!isOwner && !isMember) {
            return res.status(403).json({ message: 'Not authorized to reorder lists on this board' });
        }

        for (let list of lists) {
            await List.findByIdAndUpdate(list._id, { position: list.position });
        }
        res.status(200).json({ message: 'Lists reordered successfully' });
        // Trigger for the board
        const io = req.app.get('io');
        if (io) io.to(firstList.boardId.toString()).emit('board-updated');
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
// @desc    Update a list (e.g. rename)
// @route   PUT /api/lists/:id
// @access  Private
export const updateList = async (req, res) => {
    const { title } = req.body;

    try {
        const list = await List.findById(req.params.id);

        if (!list) {
            return res.status(404).json({ message: 'List not found' });
        }

        const board = await Board.findById(list.boardId);
        if (!board) return res.status(404).json({ message: 'Board not found' });

        const isOwner = board.owner.toString() === req.user._id.toString();
        const isMember = board.members.some(id => id.toString() === req.user._id.toString());

        if (!isOwner && !isMember) {
            return res.status(403).json({ message: 'Not authorized to update this list' });
        }

        list.title = title || list.title;

        const updatedList = await list.save();
        res.status(200).json(updatedList);
        const io = req.app.get('io');
        if (io) io.to(updatedList.boardId.toString()).emit('board-updated');
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a list
// @route   DELETE /api/lists/:id
// @access  Private
export const deleteList = async (req, res) => {
    try {
        const list = await List.findById(req.params.id);

        if (!list) {
            return res.status(404).json({ message: 'List not found' });
        }

        const board = await Board.findById(list.boardId);
        if (!board) return res.status(404).json({ message: 'Board not found' });

        const isOwner = board.owner.toString() === req.user._id.toString();
        const isMember = board.members.some(id => id.toString() === req.user._id.toString());

        if (!isOwner && !isMember) {
            return res.status(403).json({ message: 'Not authorized to delete this list' });
        }

        // Also delete all associated cards
        await import('../models/Card.js').then((module) => {
            return module.default.deleteMany({ listId: req.params.id });
        });

        await list.deleteOne();
        res.status(200).json({ message: 'List removed' });
        const io = req.app.get('io');
        if (io) io.to(list.boardId.toString()).emit('board-updated');
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
