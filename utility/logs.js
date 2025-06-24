const UserLog = require("../schema/UserLog");

module.exports.saveLogs = async (req, email, userId) => {
    try {
        const userAgent = req.headers['user-agent'];
        const ip =
            req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
        const log = {
            userId: userId ?? null,
            email: email ?? null,
            ip,
            browser: userAgent,
            time: new Date().toLocaleString(),
            url: req.originalUrl,
        };
        const newLog = new UserLog(log);
        await newLog.save();
        return true;
    } catch (error) {
        console.error('Error saving log:', error.message);
        return false;
    }
}