const messageModel = require('../schema/message');
const User = require('../schema/userschema');
module.exports.SaveMessageToDb = async (SenderId, fromUserId, message, filetype) => {
    try {
        // console.log('Saving message to DB:', SenderId, fromUserId, message);
        const newMessage = new messageModel({
            SenderId,
            fromUserId,
            message,
            filetype
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
module.exports.saveMessageStatus = async (ReceiverId, SenderId) => {
    try {
        await saveStatusGenericFunction(ReceiverId, SenderId);
        await saveStatusGenericFunction(SenderId, ReceiverId, 'onlyTime');
    }
    catch (error) {
        console.error('Error saving message status:', error);
    }
}
async function saveStatusGenericFunction(id1, id2, saveType) {
    const user1 = await User.findById(id1);
    const user1MessageStatus = user1.messageStatus;
    const index1 = user1MessageStatus.findIndex(element => element.userId == id2);
    if (index1 > -1) {
        if (saveType == 'onlyTime') {
            user1MessageStatus[index1].updatedAt = Date.now();
            user1MessageStatus[index1].messageCount += 1;
            await user1.save();
            return;
        }
        user1MessageStatus[index1].status = true;
        user1MessageStatus[index1].updatedAt = Date.now();
        user1MessageStatus[index1].messageCount += 1;
    } else {
        user1MessageStatus.push({ status: true, userId: id2 });
    }
    await user1.save();
}
module.exports.changeMessageStatus = async (ReceiverId, SenderId) => {
    try {
        console.log('Changing message status:', ReceiverId, SenderId);
        const user = await User.findById(ReceiverId);

        const messageStatus = user.messageStatus;
        const index = messageStatus.findIndex(element => element.userId == SenderId);
        if (index > -1) {
            messageStatus[index].status = false;
            messageStatus[index].messageCount = 0
            // messageStatus[index].updatedAt = Date.now();
        }
        await user.save();
    }
    catch (error) {
        console.error('Error saving message status:', error);
    }
}