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
        const lists = await List.find({ boardId });
        const position = lists.length;

        const list = await List.create({
            title,
            boardId,
            position
        });

        res.status(201).json(list);
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
        for (let list of lists) {
            await List.findByIdAndUpdate(list._id, { position: list.position });
        }
        res.status(200).json({ message: 'Lists reordered successfully' });
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

        list.title = title || list.title;

        const updatedList = await list.save();
        res.status(200).json(updatedList);
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

        // Also delete all associated cards
        await import('../models/Card.js').then((module) => {
            return module.default.deleteMany({ listId: req.params.id });
        });

        await list.deleteOne();
        res.status(200).json({ message: 'List removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
