const room = require('./chatting-room');
const {
    GetAllProfiles, GetInterests, GetInterested
} = require('../database/sqlite');


async function FilterInterestedUsers(userId) {
    try {
        const allUsers = await GetAllProfiles(userId);
        const interestTargets = await GetInterests(userId);
        const interestedTargets = await GetInterested(userId);
        const firstFinalUsers = allUsers.filter(
            item => !interestTargets.some(remove => remove.targetId === item.id)
        );
        const finalUsers = firstFinalUsers.filter(
            item => !interestedTargets.some(remove => remove.id === item.id)
        );
        return finalUsers;
    } catch (error) {
        throw error;
    }
}

function SetUserRoom(userId, roomId) {
    room.set(userId, roomId);
}

function GetUserRoom(userId) {
    return room.get(userId);
}

function removeInterestUsers(obj, interestUsers) {
    return  obj.filter(
            item => !interestUsers.some(remove => remove.targetId === item.id)
    );
}
function removeInterestedUsers(obj, interestedUsers) {
    return  obj.filter(
            item => !interestedUsers.some(remove => remove.id === item.id)
    );
}

module.exports = {
    FilterInterestedUsers, SetUserRoom, GetUserRoom
}