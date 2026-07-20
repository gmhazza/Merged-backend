const express = require('express');
const { authentication, checkAuthentication } = require('./auth');
const {
    SetUserRoom, GetUserRoom
} = require('../services/service');

const router = express.Router();

router.post('/room', authentication, (req, res) => {
    try {
        const userRoom = GetUserRoom(req.body.targetId);
        if(userRoom) { res.status(200).json({ roomId: userRoom }); return;}
        else { SetUserRoom(req.user.id, req.body.roomId); res.status(204)}
    } catch (error) {
        console.log(error.message);
        res.status(409).json({
            message: error.message
        });
    }
});

module.exports = router;