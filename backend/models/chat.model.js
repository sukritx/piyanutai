const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    content: { type: String, required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    audioUrl: { type: String }, // URL to stored audio file if needed
    timestamp: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    messages: [messageSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

chatSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Chat', chatSchema);
