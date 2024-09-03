const messageModel = require('../schema/message');
const User = require('../schema/userschema');
module.exports.SaveMessageToDb = async (SenderId, fromUserId, message) => {
    try {
        console.log('Saving message to DB:', SenderId, fromUserId, message);
        const newMessage = new messageModel({
            SenderId,
            fromUserId,
            message
        });
        await newMessage.save();
    } catch (error) {
        console.error('Error saving message:', error);
    }
}
module.exports.getFriendRequest = async (ReceiverId) => {
    try {

        const user = await User.findById(ReceiverId).select('requests');

        let count = 0;
        if (user && user.requests) {
            count = user.requests.length;
        }

        return count;
    }
    catch (error) {
        console.error('Error fetching friend request:', error);
    }
}
module.exports.checkFriend = async (ReceiverId, SenderId) => {
    try {
        const user = await User.findById(ReceiverId).select('friends');
        const isFriend = user.friends.some(element => element == SenderId);
        return isFriend;
    }
    catch (error) {
        console.error('Error fetching friend request:', error);
    }
}