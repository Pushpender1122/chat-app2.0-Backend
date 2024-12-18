const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const aesKeySchema = new Schema({
    aesKey: {
        type: String,
        required: true
    },
    iv: {
        type: String,
        required: true
    },
    user1: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    user2: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

module.exports = mongoose.model('aesKey', aesKeySchema);