import * as Helpers from "../helpers.js";
import {updateData, updateSlackData} from "../dataStore.js";

const Channel = {
    id: "", // C03K74CTAA3
    name: "",
    created: 1655231318,
    creator: "", // U03HG78Q56J
    is_archived: false,
    is_general: false,
    is_private: false,
    members: [],
    topic: {
        value: "",
        creator: "",
        last_set: 0,
    },
    purpose: {
        value: "",
        creator: "",
        last_set: 0,
    }
}

const createChannel = async (obj) => {
    const {channel} = obj
    const newChannel = structuredClone(Channel)
    let channelId = await Helpers.sha256(channel.name);
    channelId = process.env.PREFIX_ID_CHANNEL + channelId
    newChannel.id = channelId
    newChannel.name = channel.name
    newChannel.is_private = channel.type === 'P'
    newChannel.topic.value = channel.header
    newChannel.purpose.value = channel.purpose

    Helpers.createFolder(channel.name)
    updateData('channels', channel.name, channelId)
    updateSlackData('channels', null, newChannel, true)
}

export {
    createChannel,
}
