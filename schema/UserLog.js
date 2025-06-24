const mongoose = require('mongoose');

const userLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    email: String,
    ip: String,
    browser: String,
    time: { type: String, default: Date.now.toString() },
    url: String
});

module.exports = mongoose.model('UserLog', userLogSchema);
