const express = require('express');
const router = express()
const authController = require('../controller/authController');
const dotenv = require('dotenv').config();
const middleware = require('../middleware/middleware');
const socketAuthController = require('../controller/socketAuthController');
require('../db/dbconfig');

//User Routes
router.post(`${process.env.BASE_URL}/registeruser`, authController.registerUser);
router.post(`${process.env.BASE_URL}/login`, authController.loginUser);
router.get(`${process.env.BASE_URL}/getAllUser`, authController.getAllUser);
router.get(`${process.env.BASE_URL}/getUser`, middleware.authenticateToken, authController.getUser);

//message Routes
router.get(`${process.env.BASE_URL}/getMessage`, middleware.authenticateToken, authController.getMessage);
// router.post(`${process.env.BASE_URL}/saveMessage`, middleware.authenticateToken, socketAuthController.SaveMessageToDb);
//friend Routes
router.post(`${process.env.BASE_URL}/addFriend`, middleware.authenticateToken, authController.addFriend);
router.post(`${process.env.BASE_URL}/removefriend`, middleware.authenticateToken, authController.removeFriend);
router.post(`${process.env.BASE_URL}/accecptfriendrequest`, middleware.authenticateToken, authController.accecptFriendRequest);
router.post(`${process.env.BASE_URL}/rejectfriendrequest`, middleware.authenticateToken, authController.rejectFriendRequest);
router.get(`${process.env.BASE_URL}/friendDetails`, middleware.authenticateToken, authController.friendDetails);

module.exports = router;