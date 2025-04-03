const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        // unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    createAt: {
        type: Date,
        default: Date.now,
    },
    profileimg: {
        type: String,
        default: "https://cdn-icons-png.flaticon.com/512/149/149071.png"
    },
    friends: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User',
        default: []
    },
    requests: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User',
        default: []

    },
    description: {
        type: String,
        default: "Hey there I am using RealTalk"
    },
    messageStatus: {
        type: [{
            status: {
                type: Boolean,
                default: false
            },
            messageCount: {
                type: Number,
                default: 0
            },
            userId: mongoose.Schema.Types.ObjectId,
            createdAt: {
                type: Date,
                default: Date.now
            },
            updatedAt: {
                type: Date,
                default: Date.now
            }
        }],
    },
});
module.exports = mongoose.model('User', userSchema);