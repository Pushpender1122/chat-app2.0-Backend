const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    SenderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fromUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    filetype: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update `updatedAt` field on save
messageSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
