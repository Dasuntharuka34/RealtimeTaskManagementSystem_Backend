import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    listId: { type: mongoose.Schema.Types.ObjectId, ref: 'List', required: true },
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    position: { type: Number, required: true },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    priority: { type: String, enum: ['Low', 'Mid', 'High'], default: 'Low' },
    dueDate: { type: Date },
    labels: [{ type: String }],
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: { type: String },
        createdAt: { type: Date, default: Date.now }
    }],
    subtasks: [{
        title: { type: String, required: true },
        isCompleted: { type: Boolean, default: false }
    }],
    coverColor: { type: String, default: null },
    attachments: [{
        url: { type: String, required: true },
        filename: { type: String, required: true },
        mimetype: { type: String },
        uploadedAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

export default mongoose.model('Card', cardSchema);
