const express = require('express');
const { authentication, checkAuthentication } = require('./auth');
const jwt = require('jsonwebtoken');
const {
    CreateTables, CreateProfile, Login, GetProfile, CreateInterest,
    DeleteProfile, GetAllProfiles, GetSpecificProfiles, GetInterests,
    GetInterestedButNotApproved, ShowInterest, GetInterested, UpdateProfile,
    GetInterestsOnlyApproved, GetChatId, GetMessages, SendMessage, addDummyData
} = require('./sqlite');
const {
    FilterInterestedUsers
} = require('../services/service');

const router = express.Router();

router.get('/', (req, res) => {
    res.json({
        message: "Route Working Fine"
    });
});

router.get('/create/tables', async (req, res) => {
    try {
        await CreateTables();
        res.status(200).json({
            message: "Successfuly Created Tables"
        });
    } catch(error) {
        res.status(500).json({
            message: error.message
        });
    }
});

router.get('/add/dummy/data', async (req, res) => {
    try {
        await addDummyData();
        res.status(200);
    } catch (error) {
        console.log(error.message)
        res.status(409);
    }
})

router.get('/get/all/user', authentication, async (req, res) => {
    try {
        const userId = req.user.id;
        const users = await FilterInterestedUsers(userId);
        res.status(200).json(users)
    } catch (error) {
        res.status(409).json({
            message: error.message
        });
    }
});

router.post('/get/all/messages', authentication, async (req, res) => {
    try {
        const chatId = req.body.chatId;
        const messages = await GetMessages(chatId);
        res.status(200).json(messages)
    } catch (error) {
        res.status(409).json({
            message: error.message
        });
    }
});

router.post('/send/message', authentication, async (req, res) => {
    try {
        const message = await SendMessage(req.body.chatId, req.body.message, req.body.sender);
        res.status(200).json(message)
    } catch (error) {
        console.log(error.message);
        res.status(409).json({
            message: error.message
        });
    }
});

router.get('/get/interested/not/approved', authentication, async (req, res) => {
    try {
        const userId = req.user.id;
        const interestedUsers = await GetInterestedButNotApproved(userId);
        res.status(200).json(interestedUsers);
    } catch (error) {
        res.status(409).json({
            message: error.message
        });
    }
});

router.get('/get/interested/approved', authentication, async (req, res) => {
    try {
        const userId = req.user.id;
        const interestedUsers = await GetInterestsOnlyApproved(userId);
        res.status(200).json(interestedUsers);
    } catch (error) {
        res.status(409).json({
            message: error.message
        });
    }
});
router.post('/get/chat/id', authentication, async (req, res) => {
    try {
        const userId = req.user.id;
        const targetId = req.body.targetId;
        const chatId = await GetChatId(userId, targetId);
        res.status(200).json(chatId);
    } catch (error) {
        res.status(409).json({
            message: error.message
        });
    }
});

router.get('/get/interested', authentication, async (req, res) => {
    try {
        const userId = req.user.id;
        const interestedUsers = await GetInterested(userId);
        res.status(200).json(interestedUsers);
    } catch (error) {
        res.status(409).json({
            message: error.message
        });
    }
});

router.get('/get/room', authentication, (req, res) => {
    try {
        const roomId = GetUserRoom(req.body.targetId);
        res.status(200).json({ roomId });
    } catch (error) {
        res.status(409).json({
            message: error.message
        });
    }
});

router.patch('/show/interest', authentication, async (req, res) => {
    try {
        const userId = req.user.id;
        const targetId = req.body.id;
        await ShowInterest(userId, targetId);
        res.status(200).json({ 
            message: 'successfull'
        });
    } catch (error) {
        res.status(409).json({
            message: error.message
        });
    }
});

router.post('/register/user', checkAuthentication, async (req, res) => {
    try {
        const user = await CreateProfile(req.body);
        delete user.email;
        delete user.password;
        delete user.gender;
        delete user.bio;
        delete user.city;
        delete user.country;
        delete user.github;
        delete user.portfolio;
        delete user.linkedin;
        delete user.created_at;
        const token = jwt.sign({
            ...user
        }, process.env.SECRET_KEY, {
            expiresIn: "7d"
        })
        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.status(200).json({
            message: "Successfuly Inserted data",
        });
    } catch(error) {
        res.status(409).json({
            message: error.message
        });
    }
});

router.post('/register/room', authentication, (req, res) => {
    try {
        SetUserRoom(req.user.id, req.body.roomId);
    } catch (error) {
        res.status(409).json({
            message: error.message
        });
    }
});

router.patch('/update/user', authentication, async (req, res) => {
    try {
        await UpdateProfile(req.user.id ,req.body);
        res.status(200).json({
            message: "Successfuly Inserted data",
        });
    } catch(error) {
        res.status(409).json({
            message: error.message
        });
    }
});

router.post('/login', checkAuthentication, async (req, res) => {
    try {
        const user = await Login(req.body);
        delete user.email;
        delete user.password;
        delete user.gender;
        delete user.bio;
        delete user.city;
        delete user.country;
        delete user.github;
        delete user.portfolio;
        delete user.linkedin;
        delete user.created_at;
        const token = jwt.sign({
            ...user
        }, process.env.SECRET_KEY, {
            expiresIn: "7d"
        })
        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.status(200).json(user);
    } catch(error) {
        res.status(500).json({
            message: error.message
        });
    }
});

router.get('/profile', authentication, async (req, res) => {
    try {
        const user = await GetProfile(req.user.id);
        res.status(200).json(user);
    } catch(error) {
        res.status(500);
    }
});

router.get('/token', authentication, async (req, res) => {
    try {
        res.status(200).json(req.user);
    } catch(error) {
        res.status(500);
    }
});

router.delete('/delete/user', authentication, async (req, res) => {
    try {
        const userId = req.user.id;
        await DeleteProfile(userId);
        res.status(200).json({
            message: "Successfuly deleted user",
        });
    } catch(error) {
        res.status(409).json({
            message: error.message
        });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: false,
        sameSite: "lax"
    });
    res.status(200).json({
        message: "Logged out"
    });
});

router.post('/register/interest', authentication, async (req, res) => {
    try {
        const userId = req.user.id;
        const targetId = req.body.targetId;
        if (userId === targetId) {
            throw new Error('You can not Regsitered Interest on Yourself');
        };
        await CreateInterest(userId, targetId);
        res.status(200).json({
            message: 'Interest registered Successfuly'
        });
    } catch (error) {
        res.status(409).json({
            message: error.message
        });
    }
});

module.exports = router;