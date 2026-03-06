import Card from '../models/Card.js';

// @desc    Get cards by list ID
// @route   GET /api/cards/:listId
// @access  Private
export const getCards = async (req, res) => {
    try {
        const cards = await Card.find({ listId: req.params.listId }).sort('position');
        res.status(200).json(cards);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get cards by board ID
// @route   GET /api/cards/board/:boardId
// @access  Private
export const getCardsByBoard = async (req, res) => {
    try {
        const cards = await Card.find({ boardId: req.params.boardId }).sort('position');
        res.status(200).json(cards);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a card
// @route   POST /api/cards
// @access  Private
export const createCard = async (req, res) => {
    const { title, description, listId, boardId } = req.body;

    try {
        const cards = await Card.find({ listId });
        const position = cards.length;

        const card = await Card.create({
            title,
            description,
            listId,
            boardId,
            position,
            assignedTo: [req.user._id]
        });

        res.status(201).json(card);
    } catch (error) {
        res.status(400).json({ message: 'Invalid card data' });
    }
};

// @desc    Update single card
// @route   PUT /api/cards/:id
// @access  Private
export const updateCard = async (req, res) => {
    try {
        const card = await Card.findById(req.params.id).populate('boardId');
        if (!card) {
            return res.status(404).json({ message: 'Card not found' });
        }

        const board = card.boardId;
        const isOwner = board.owner.toString() === req.user._id.toString();
        const isAssigned = card.assignedTo.some(id => id.toString() === req.user._id.toString());

        if (!isOwner && !isAssigned) {
            return res.status(403).json({ message: 'Not authorized to edit this card' });
        }

        // Only owner can change member assignments
        if (req.body.assignedTo !== undefined && !isOwner) {
            return res.status(403).json({ message: 'Only the board owner can change member assignments' });
        }

        const updatedCard = await Card.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(updatedCard);
    } catch (error) {
        console.error('Update card error:', error);
        res.status(400).json({ message: 'Invalid update data' });
    }
};

// @desc    Update cards positions across lists
// @route   PUT /api/cards/reorder
// @access  Private
export const updateCardsOrder = async (req, res) => {
    const { cards } = req.body; // array of { _id, position, listId }

    try {
        if (cards.length === 0) return res.status(200).json({ message: 'No cards to reorder' });

        // Check authorization on the first card's board (assuming all cards belong to the same board)
        const firstCard = await Card.findById(cards[0]._id).populate('boardId');
        if (!firstCard) return res.status(404).json({ message: 'Card not found' });
        
        const board = firstCard.boardId;
        if (board.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only board owner can reorder cards' });
        }

        for (let card of cards) {
            await Card.findByIdAndUpdate(card._id, {
                position: card.position,
                listId: card.listId
            });
        }
        res.status(200).json({ message: 'Cards reordered successfully' });
    } catch (error) {
        console.error('Reorder cards error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a card
// @route   DELETE /api/cards/:id
// @access  Private
export const deleteCard = async (req, res) => {
    try {
        const card = await Card.findById(req.params.id).populate('boardId');
        if (!card) {
            return res.status(404).json({ message: 'Card not found' });
        }

        const board = card.boardId;
        const isOwner = board.owner.toString() === req.user._id.toString();
        const isAssigned = card.assignedTo.some(id => id.toString() === req.user._id.toString());

        if (!isOwner && !isAssigned) {
            return res.status(403).json({ message: 'Not authorized to delete this card' });
        }

        await Card.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Card removed' });
    } catch (error) {
        console.error('Delete card error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
