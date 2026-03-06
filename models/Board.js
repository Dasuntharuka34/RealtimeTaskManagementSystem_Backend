import mongoose from 'mongoose';

const boardSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    privacy: { type: String, enum: ['Public', 'Private'], default: 'Private' }
}, { timestamps: true });

export default mongoose.model('Board', boardSchema);
