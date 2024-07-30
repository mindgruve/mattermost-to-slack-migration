import * as Helpers from "../helpers.js";
import * as fs from 'node:fs';
import {updateData, getSlackMembers, data, slackData, setConversation, updateSlackData} from "../dataStore.js";

const DirectMessageEntity = {
    id: "D03H88JKNKH",
    created: 1654008978,
    members: [
        "U03HG79798E",
        "USLACKBOT"
    ]
};

const MultiPersonMessageEntity = {
    id: "C070QNWE3V4",
    name: "mpdm-wmarchment--kangfromny--wmarchment_test-1",
    created: 1714163428,
    creator: "U06TX69QN10",
    is_archived: false,
    members: [
        "U06RTT3FL05",
        "U06TX69QN10",
        "U071L5JSCG0"
    ],
    topic: {
        value: "",
        creator: "",
        last_set: 0
    },
    purpose: {
        value: "Group messaging with: @wmarchment @kangfromny @wmarchment_test",
        creator: "U06TX69QN10",
        last_set: 1714163428
    }
};

const Message = {
    user: "U06TX69QN10",
    type: "message",
    ts: "1714091944.525969",
    client_msg_id: "",
    text: "",
    team: process.env.TEAM,
    user_team: process.env.TEAM,
    source_team: process.env.TEAM,
    user_profile: {},
    blocks: []
}

const getMessageName = (members) => {
    return `${members.map(m => m.replace(/[_.-]/g, '')).join('--')}`
}

const isMultiThread = (array) => {
    return array.length > 2
}

const setupMessage = async (obj) => {
    const {direct_channel} = obj
    const members = direct_channel.members.sort()
    const slackMembers = getSlackMembers(members)
    const isMulti = isMultiThread(members)
    const messageName = getMessageName(members)
    const newMessage = isMulti ? structuredClone(MultiPersonMessageEntity) : structuredClone(DirectMessageEntity);
    let messageId = await Helpers.sha256(members.join())
    messageId = (isMulti ? process.env.PREFIX_ID_MPIM : process.env.PREFIX_ID_DM) + messageId

    if (data[isMulti ? 'mpims' : 'dms']?.hasOwnProperty(messageName)) return;

    newMessage.id = messageId
    newMessage.members = slackMembers

    if (isMulti) {
        const membersWithAt = members.map(m => `@${m}`)
        const mpimPurpose = `Group messaging with: ${membersWithAt.join(' ')}`
        newMessage.name = `mpdm-${messageName}-1`
        newMessage.purpose.value = mpimPurpose
        newMessage.creator = newMessage.purpose.creator = slackMembers[0]
    }
    Helpers.createFolder(isMulti ? newMessage.name : messageId);
    updateData(isMulti ? 'mpims' : 'dms', messageName, messageId)
    updateSlackData(isMulti ? 'mpims' : 'dms', null, newMessage, true)
}

const createDm = (obj, threadId = null) => {
    const postObj = obj?.direct_post ?? obj?.post
    const {channel_members, channel, user, message, create_at, replies, reactions, attachments} = postObj

    const members = channel_members ? channel_members.sort() : []
    const isChannel = postObj?.channel
    let messageName, isMulti = false, messageId
    let text = Helpers.updateMentions(message)
    text = Helpers.filterMarkdown(text)
    if (isChannel) {
        messageId = channel
    } else {
        messageName = threadId ?? getMessageName(members)
        isMulti = isMultiThread(members)
        messageId = isMulti ? `${messageName}` : data['dms'][messageName]
    }

    // weed out posts without a direct_channel (aka archived channels)
    if ((isMulti && typeof (data['mpims'][messageId]) === 'undefined') || typeof messageId === 'undefined'){
        return;
    }
    const slackUser = getSlackMembers(user)
    const userObj = slackData.users[slackUser]

    const newMessage = structuredClone(Message);
    const ts = Helpers.getSlackTs(create_at)

    newMessage.user = slackUser
    newMessage.user_profile = createUserProfileObject(userObj)
    newMessage.ts = ts
    newMessage.text = text

    newMessage.blocks = Helpers.parseBlocks(text)
    newMessage.reactions = Helpers.parseReactions(reactions)
    if (replies?.length) {
        newMessage.thread_ts = ts
        newMessage.replies = parseReplies(isMulti ? `mpdm-${messageName}-1`: messageId, ts, replies)
    }

    if (process.env?.arg_before && create_at > process.env?.arg_before) return;
    if (process.env?.arg_after && create_at < process.env?.arg_after) return;
    setConversation(isMulti ? `mpdm-${messageName}-1`: messageId, Helpers.getSlackDate(create_at), newMessage)
}

const createUserProfileObject = (userObj) => {
    return {
        avatar_hash: userObj.avatar_hash,
        image_72: userObj.image_72,
        first_name: userObj.first_name,
        real_name: userObj.real_name,
        display_name: userObj.display_name,
        team: userObj.team,
        name: userObj.name,
        is_restricted: userObj.is_restricted,
        is_ultra_restricted: userObj.is_ultra_restricted
    }
}

const parseReplies = (messageId, ts, replies) => {
    return replies?.map((reply) => {
        if (process.env?.arg_before && reply.create_at > process.env?.arg_before) return;
        if (process.env?.arg_after && reply.create_at < process.env?.arg_after) return;
        const replyObj = createDmReply(messageId, ts, reply)
        return {
            user: replyObj.user,
            ts: replyObj.ts,
        }
    })
}

const createDmReply = (messageId, threadTs, {user, message, create_at, reactions}) => {
    const slackUser = getSlackMembers(user)
    const userObj = slackData.users[slackUser]

    const newMessage = structuredClone(Message);
    const ts = Helpers.getSlackTs(create_at)
    let text = Helpers.updateMentions(message)
    text = Helpers.filterMarkdown(text)

    newMessage.user = slackUser
    newMessage.user_profile = createUserProfileObject(userObj)
    newMessage.thread_ts = threadTs
    newMessage.ts = ts
    newMessage.text = text

    newMessage.blocks = Helpers.parseBlocks(text)
    newMessage.reactions = Helpers.parseReactions(reactions)
    setConversation(messageId, Helpers.getSlackDate(create_at), newMessage)
    return newMessage
}

const writeDms = async (conversations) => {
    const dir = `${process.env['exportDir']}`

    for (var conv in conversations){
        if (conversations.hasOwnProperty(conv)) {
            for (var day in conversations[conv])
                if (conversations[conv].hasOwnProperty(day)) {
                    conversations[conv][day].sort((a, b) => Number(a.ts) - Number(b.ts));
                    console.log(`Writing ${dir}/${conv}/${day}.json`);
                    await writeFile(`${dir}/${conv}/${day}.json`, JSON.stringify(conversations[conv][day]))
                    console.log(`Completed ${dir}/${conv}/${day}.json`);
                }
        }
    }
}

const writeFile = (path, data) => {
    return new Promise((resolve, reject) => {
        const dmStream = fs.createWriteStream(path)
        dmStream.write(data)
        dmStream.end(() => {
            resolve()
        })
    })
}

export {
    setupMessage,
    createDm,
    writeDms,
}
