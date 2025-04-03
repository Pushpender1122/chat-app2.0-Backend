// const http = require('http');
// const express = require('express');
// const cors = require('cors');
// const socketIO = require('socket.io');

// const app = express();
// app.use(cors());
// const port = process.env.PORT || 4500
// const server = http.createServer(app);
// const users = {};
// app.get('/', (req, res) => {
//     res.send("Hlo");
// })
// const io = socketIO(server);
// io.on("connection", (socket) => {
//     // console.log("new connection");
//     socket.on('joined', ({ username }) => {
//         users[socket.id] = username;
//         // console.log(`${username}  joined the chat `);
//         socket.broadcast.emit('userJoined', { user: "Admin", message: `${users[socket.id]} joined the chat` });
//         socket.emit('welcome', { user: "Admin", message: ` Welcome to the chat ${users[socket.id]}` })
//     });
//     socket.on('disconnect', () => {
//         socket.broadcast.emit('leave', { user: "Admin", message: `${users[socket.id]} leave the chat ` })
//         // console.log("log out")
//         delete users[socket.id];
//     })
//     socket.on('message', ({ message, id }) => {
//         io.emit('sendMessage', { user: users[id], message, id })
//     })
//     // socket.on('welcome', (data) => {
//     //     // console.log(data);
//     // })
// })
// server.listen(port, () => {
//     // console.log(`Server is running ${port}`);
// })

const express = require("express");
const cors = require("cors");
const http = require("http");
const socket = require("socket.io");
const socketAuthController = require("./controller/socketAuthController");
const app = express();
const server = http.createServer(app);
// const redis = require("./services/redis");
const io = socket(server, {
    cors: {
        origin: ["http://localhost:3000", "http://192.168.92.10:3000", "https://realtalks.netlify.app"], // Replace with your React app's URL
        methods: ["GET", "POST"],
        credentials: true
    },
    maxHttpBufferSize: 1e8
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const router = require("./routes/route");
const { uploadToCloudinary } = require("./utility/cloudinary");
app.use(router);

// Test Route
app.route("/").get((req, res) => {
    res.send("Hello");
});

// Socket.IO Connection
const userSocketMap = new Map(); // Using Map instead of Object can help avoid issues with object keys
const SelectedUser = new Map(); // This map will store the selected user for each sender
const callMap = new Map();
io.on("connection", (socket) => {
    // console.log("New client connected, socket ID:", socket.id);

    // Save user's socket ID when they log in
    socket.on("register", ({ userId }) => {
        userSocketMap.set(userId, socket.id);
        // console.log("list", SelectedUser); 
        console.log("User registered with ID:", userId);
        io.emit("isActive", { userId });
        io.emit('allUserStatus', { userId });
        // // console.log(userSocketMap[userId]);
    });

    // Save selected user when user selects a friend to chat with
    socket.on("selectedUser", ({ SenderId, ReceiverId }) => {
        SelectedUser.set(SenderId, ReceiverId);
        // console.log(SelectedUser);
    });

    //Handle Active status
    socket.on("isActive", ({ ReceiverId }) => {
        const toSocketId = userSocketMap.get(ReceiverId);
        // console.log("ReceiverId:", ReceiverId);
        // console.log("To socket ID:", toSocketId);
        if (toSocketId) {
            io.to(socket.id).emit("isActive", { status: true });
        }
        else {
            io.to(socket.id).emit("isActive", { status: false });
        }
    });
    //handle All user online status 
    socket.on("allUserStatus", async () => {
        let currentUsers = [];
        for (const [key, value] of userSocketMap.entries()) {
            currentUsers.push(key)
        }
        io.to(socket.id).emit("allUserStatus", { currentUsers });
        // console.log("All user online status:", currentUsers);
    }
    );
    // Handle typing status
    socket.on("isTyping", ({ ReceiverId, SenderId }) => {
        const toSocketId = userSocketMap.get(ReceiverId);
        if (toSocketId) {
            const isTyping = SelectedUser.get(ReceiverId);
            if (isTyping == SenderId) {
                io.to(toSocketId).emit("isTyping", { status: 'Typing...' });
            }
        }
    });
    // Handle file upload
    socket.on('upload-file', async (fileData, callback) => {
        try {
            const result = await uploadToCloudinary(fileData.file, fileData.name, 'file');
            callback({ url: result.secure_url });
        } catch (error) {
            console.error('Cloudinary upload error:', error);
            callback({ error: 'Upload failed' });
        }
    });
    // Handle private message when user is online and friend is selected
    socket.on("private_message", async ({ toUserId, message, SenderID, fileType }) => {
        // if (message.file) {
        //     const fileexe = message.fileName.split('.').pop();
        //     fs.writeFileSync('./temp/' + message.fileName + '.' + fileexe, message.file);
        // }
        if (await socketAuthController.checkFriend(toUserId, SenderID)) {
            socketAuthController.SaveMessageToDb(toUserId, SenderID, message, fileType);
            // redis.storeValue(toUserId, SenderID, message);
            let ConnectedUser = SelectedUser.get(toUserId);
            if (ConnectedUser == SenderID) {
                const toSocketId = userSocketMap.get(toUserId);
                // // console.log("To socket ID:", toSocketId);
                if (toSocketId) {
                    io.to(toSocketId).emit("private_message", { fromUserId: socket.id, message, fileType });
                }
            }
            else {
                const toSocketId = userSocketMap.get(toUserId);
                if (toSocketId) {
                    io.to(toSocketId).emit("messageNotification", { SenderID, status: true });
                }
                //send the notification to the user
            }
            await socketAuthController.saveMessageStatus(toUserId, SenderID);
        }
    });
    // Handle message status when user is click on the chat 
    socket.on("messageStatus", async ({ SenderID, ReceiverId }) => {
        await socketAuthController.changeMessageStatus(SenderID, ReceiverId);
    });
    //This is for friend request acknowledgement when user is online
    socket.on("friendRequest", async ({ ReceiverId }) => {
        const toSocketId = userSocketMap.get(ReceiverId);
        // console.log("ReceiverId:", ReceiverId);
        if (toSocketId) {
            const count = await socketAuthController.getFriendRequest(ReceiverId);
            // console.log("Friend request count:", count);
            io.to(toSocketId).emit("friendNotification", { count });
        }
    });
    //This is for friend remove acknowledgement
    socket.on("friendRemove", async ({ senderId, ReceiverId }) => {
        const toSocketId = userSocketMap.get(ReceiverId);
        if (toSocketId) {
            io.to(toSocketId).emit("FriendRemove", { senderId });
        }
    });
    //This is for friend request accept acknowledgement
    socket.on("friendAccecptAck", async ({ ReceiverId }) => {
        const toSocketId = userSocketMap.get(ReceiverId);
        // console.log("friendAccecptAck", ReceiverId);
        if (toSocketId) {
            io.to(toSocketId).emit("FriendAcceptAck");
        }
    });
    // Handle Voice call
    socket.on("voice_call", ({ toUserId, peerId, senderId, senderName, senderProfileImg, callType }) => {
        const userId = callMap.get(senderId);
        if (!userId) {
            callMap.set(senderId, socket.id);
        }
        const toSocketId = userSocketMap.get(toUserId);
        // console.log(toUserId, peerId);
        if (toSocketId) {
            io.to(toSocketId).emit("voice_call", { fromUserId: toUserId, peerId, senderId, senderName, senderProfileImg, callType });
        }
    });
    socket.on("user-connected", ({ toUserId, peerId, senderId }) => {
        const responceUserId = callMap.get(senderId);
        if (!responceUserId) {
            callMap.set(senderId, socket.id);
        }
        const toSocketId = callMap.get(toUserId);
        // console.log("user", toUserId, peerId, toSocketId);
        if (toSocketId) {
            io.to(toSocketId).emit("user-connected", { fromUserId: toUserId, peerId, senderId });
        }
    });
    socket.on("end-call", ({ toUserId }) => {
        const toSocketId = callMap.get(toUserId);
        // console.log("End call", toUserId, toSocketId);
        if (toSocketId) {
            io.to(toSocketId).emit("end-call");
        }
    });
    socket.on("disconnect", () => {
        // Remove user from the map when they disconnect
        let disconnectedUserId;
        for (const [key, value] of userSocketMap.entries()) {
            if (value === socket.id) {
                disconnectedUserId = key;
                userSocketMap.delete(key);
                // console.log("User disconnected with ID:", key);
                break;
            }
        }
        io.emit("isActive", { disconnectedUserId })
        io.emit('allUserStatus', { disconnectedUserId });
        // Remove user from the selected user map when they disconnect
        // const ConnectedUser = SelectedUser.get({ data: disconnectedUserId });

        SelectedUser.delete(disconnectedUserId);
        for (const [key, value] of callMap.entries()) {
            if (value === socket.id) {
                callMap.delete(key);
                console.log("User disconnected with ID:", key);
                break;
            }
        }
        // console.log("Client disconnected, socket ID:", socket.id);
    });
});
// app.get("/test", (req, res) => {
//     const mapToArray = (map) => {
//         return Array.from(map.entries());
//     };
//     let a = mapToArray(userSocketMap);
//     res.json({ a });
// })
// Start the server on a single port
const port = process.env.PORT || 4500;
server.listen(port, () => {
    // console.log(`Server is running on port ${port}`);
});
