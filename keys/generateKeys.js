const forge = require('node-forge');
const keyModel = require('../schema/aesKeys');
async function generateKeys(user1_id, user2_id) {
    const aesKey = forge.random.getBytesSync(16);
    const iv = forge.random.getBytesSync(16);
    const is_key = await keyModel.findOne({
        $or: [
            { user1: user1_id, user2: user2_id },
            { user1: user2_id, user2: user1_id }
        ]
    });
    if (is_key) {
        console.log("key already exists");
        return;
    }
    const key = new keyModel({
        aesKey,
        iv,
        user1: user1_id,
        user2: user2_id
    });
    await key.save();
    console.log("Key generated");
    console.log("Key generated");
}
module.exports = { generateKeys };