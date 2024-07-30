const data = {
    users: {},
    channels: {},
    dms: {},
    mpims: {},
};

const slackData = {
    users: {},
    channels: [],
    groups: [],
    channelUsers: {},
    channelAdmins: {},
    dms: [],
    mpims: [],
    conversations: {},
}

const updateData = (type, mattermostId, slackId) => {
    data[type] = {
        ...data[type],
        [mattermostId]: slackId
    }
}

const updateSlackData = (type, id, data, push = false) => {
    if (push) {
        slackData[type].push(data)
    } else {
        slackData[type][id] = data
    }
}

/**
 *
 * @param {string|Array} members
 * @returns {string|Array}
 */
const getSlackMembers = (members) => {
    return Array.isArray(members) ? members.map(member => data.users[member]) : data.users[members]
}

const setConversation = (id, date, data) => {
    if (!slackData.conversations.hasOwnProperty(id)) slackData.conversations[id] = {}
    if (!slackData.conversations[id].hasOwnProperty(date)) slackData.conversations[id][date] = []
    slackData.conversations[id][date].push(data)
}

export {
    data,
    slackData,
    updateData,
    updateSlackData,
    getData,
    getSlackMembers,
    setConversation,
}
