const User = require('../schema/userschema');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv').config();
const messageModel = require('../schema/message');
const { uploadToCloudinary } = require('../utility/cloudinary');
const JWT_SECRET = process.env.JWT_SECRET;
module.exports.registerUser = async (req, res) => {
    console.log(req.body);
    try {
        const { username, password, email } = req.body;

        // Validate input fields
        if (!username || !password || !email) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if the email is already in use
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email is already in use' });
        }

        // Hash the password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a new user
        const newUser = new User({
            username,
            password: hashedPassword,
            email
        });

        // Save the user to the database
        await newUser.save();

        // Send a success response
        res.status(201).json({ message: 'User registered successfully', user: { username, email } });

    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }

}
module.exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

        res.status(200).json({ message: 'Login successful', token });

    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

async function generateRandomName() {
    return new Promise((resolve, reject) => {
        const username = 'Guest' + Math.floor(Math.random() * 10000);
        const email = username + '@gmail.com';
        const password = '123456';
        resolve({ username, email, password });
    });

}
module.exports.tempAccount = async (req, res) => {
    try {
        const { username, email, password } = await generateRandomName();
        const salt = await bcrypt.genSalt(10);
        console.log(username, email, password, salt);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({
            username,
            password: hashedPassword,
            email: email
        });
        await newUser.save();
        // Set a timeout to delete the user after 1 minute
        setTimeout(async () => {
            await User.findByIdAndDelete(newUser._id);
            console.log(`Temporary user ${newUser.username} deleted after 1 day`);
        }, 60000 * 60 * 24);

        const token = jwt.sign({ userId: newUser._id, email: newUser.email }, JWT_SECRET, { expiresIn: '1d' });
        // Send a success response
        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports.getAllUser = async (req, res) => {
    try {
        const users = await User.find({}, { password: 0, friends: 0, createAt: 0 });
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
module.exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId, { password: 0 });
        res.status(200).json({ user });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
module.exports.updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        user.username = req.body.username || user.username;
        user.email = req.body.email || user.email;
        user.description = req.body.description || user.description;

        if (req.file) {
            const response = await uploadToCloudinary(req.file.path, req.file.filename);
            if (!response || !response.url) {
                throw new Error('Failed to upload to Cloudinary');
            }
            user.profileimg = response.url;
        }

        await user.save();
        res.status(200).json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports.logout = async (req, res) => {
    try {
        // console.log(req.user);
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Error logging out user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
//message controller
module.exports.getMessage = async (req, res) => {
    try {
        const fromUserId = req.query.ReceiverId;
        const SenderId = req.user.userId;
        const limit = 20
        let skip = parseInt(req.query.skip) || 20;
        console.log(skip);
        const total = await messageModel.countDocuments({
            $or: [
                { SenderId, fromUserId },
                { SenderId: fromUserId, fromUserId: SenderId }
            ]
        });
        if (skip > total) {
            skip = 0;
        }
        else {
            skip = total - skip;
        }

        // console.log(total, skip);
        // console.log(req.query);
        if (!fromUserId) {
            return res.status(400).json({ message: 'SenderId and ReceiverId are required' });
        }
        let messages = await messageModel.find({
            $or: [
                { SenderId, fromUserId },
                { SenderId: fromUserId, fromUserId: SenderId }
            ]
        });
        messages = messages.slice(0, 20);
        res.status(200).json({ messages, total });
        // res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

//friend controller
module.exports.addFriend = async (req, res) => {
    try {
        const { friendId } = req.body;
        if (!friendId) {
            return res.status(400).json({ message: 'Friend ID is required' });
        }
        const user = await User.findById(req.user.userId);
        const friend = await User.findById(friendId);
        if (!friend) {
            return res.status(404).json({ message: 'Friend not found' });
        }
        if (user.friends.includes(friendId)) {
            return res.status(400).json({ message: 'Friend already added' });
        }
        if (friend.requests.includes(user._id)) {
            return res.status(400).json({ message: 'Friend request already sent' });
        }
        friend.requests.push(user._id);
        await friend.save();
        res.status(200).json({ message: 'Friend added successfully' });
    } catch (error) {
        console.error('Error adding friend:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
module.exports.removeFriend = async (req, res) => {
    try {
        const { friendId } = req.body;
        if (!friendId) {
            return res.status(400).json({ message: 'Friend ID is required' });
        }
        const user = await User.findById(req.user.userId);
        const friend = await User.findById(friendId);
        // console.log(user, friend);
        if (!friend) {
            return res.status(404).json({ message: 'Friend not found' });
        }
        if (!user.friends.includes(friendId)) {
            return res.status(400).json({ message: 'Friend not found in your friend list' });
        }


        user.friends = user.friends.filter(f => f.toString() !== friendId);

        friend.friends = friend.friends.filter(f => f.toString() !== user._id.toString());

        console.log(user, friend);

        await user.save();
        await friend.save();

        res.status(200).json({ message: 'Friend removed successfully' });
    } catch (error) {
        console.error('Error removing friend:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports.friendDetails = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .populate({
                path: 'requests',
                select: 'profileimg username email description',
            })
            .exec();
        res.status(200).json(user.requests);
    } catch (error) {
        console.error('Error fetching friend details:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
module.exports.accecptFriendRequest = async (req, res) => {
    try {
        const { friendId } = req.body;
        if (!friendId) {
            return res.status(400).json({ message: 'Friend ID is required' });
        }
        const user = await User.findById(req.user.userId);
        const friend = await User.findById(friendId);
        if (!friend) {
            return res.status(404).json({ message: 'Friend not found' });
        }
        if (!user.requests.includes(friendId)) {
            return res.status(400).json({ message: 'No friend request found' });
        }
        user.friends.push(friendId);
        friend.friends.push(user._id);
        user.requests = user.requests.filter((request) => request.toString() !== friendId);
        await user.save();
        await friend.save();
        res.status(200).json({ message: 'Friend request accepted' });
    }
    catch (error) {
        console.error('Error accepting friend request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
module.exports.rejectFriendRequest = async (req, res) => {
    try {
        const { friendId } = req.body;
        if (!friendId) {
            return res.status(400).json({ message: 'Friend ID is required' });
        }
        const user = await User.findById(req.user.userId);
        if (!user.requests.includes(friendId)) {
            return res.status(400).json({ message: 'No friend request found' });
        }
        user.requests = user.requests.filter((request) => request.toString() !== friendId);
        await user.save();
        res.status(200).json({ message: 'Friend request rejected' });
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
