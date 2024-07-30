import * as Helpers from "../helpers.js";
import {slackData, updateData, updateSlackData} from "../dataStore.js";

const User = {
    id: "", // update, ex: U03HG79798E
    team_id: process.env.TEAM,
    name: "", //update, ex: jennifer_hynes
    deleted: false,
    color: "4bbe2e",
    real_name: "", // update this, ex: Jennifer Hynes
    tz: "America\/Los_Angeles",
    tz_label: "Pacific Daylight Time",
    tz_offset: -25200,
    profile: {
        title: "", // update this, ex: Associate - Demo User
        phone: "",
        skype: "",
        real_name: "",  // update this, ex: Jennifer Hynes
        real_name_normalized: "",  // update this, ex: Jennifer Hynes
        display_name: "", // update this, ex: Jennifer
        display_name_normalized: "",  // update this, ex: Jennifer
        fields: {},
        status_text: "",
        status_emoji: "",
        status_emoji_display_info: [],
        status_expiration: 0,
        image_original: "",
        is_custom_image: true,
        avatar_hash: "g3e0b114bef6",
        email: "",  // update this
        huddle_state: "default_unset",
        huddle_state_expiration_ts: 0,
        first_name: "",  // update this, ex: Jennifer
        last_name: "",  // update this, ex: Hynes
        image_24: "https:\/\/secure.gravatar.com\/avatar\/3e0b114bef690312776e9ce0cf3015f7.jpg?s=24&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0008-24.png",
        image_32: "https:\/\/secure.gravatar.com\/avatar\/3e0b114bef690312776e9ce0cf3015f7.jpg?s=32&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0008-32.png",
        image_48: "https:\/\/secure.gravatar.com\/avatar\/3e0b114bef690312776e9ce0cf3015f7.jpg?s=48&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0008-48.png",
        image_72: "https:\/\/secure.gravatar.com\/avatar\/3e0b114bef690312776e9ce0cf3015f7.jpg?s=72&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0008-72.png",
        image_192: "https:\/\/secure.gravatar.com\/avatar\/3e0b114bef690312776e9ce0cf3015f7.jpg?s=192&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0008-192.png",
        image_512: "https:\/\/secure.gravatar.com\/avatar\/3e0b114bef690312776e9ce0cf3015f7.jpg?s=512&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0008-512.png",
        status_text_canonical: "",
        team: process.env.TEAM,
    },
    is_admin: false, // update this
    is_owner: false,
    is_primary_owner: false,
    is_restricted: false,
    is_ultra_restricted: false,
    is_bot: false,
    is_app_user: false,
    updated: 1695839677,
    is_email_confirmed: true,
    who_can_share_contact_card: "EVERYONE",
}

const createUser = async (obj) => {
    const newUser = structuredClone(User)
    const user = obj.user
    const realName = `${user.first_name} ${user.last_name}`
    let userId = await Helpers.sha256(user.username);
    userId = process.env.PREFIX_ID_USER + userId
    newUser.id = userId;
    newUser.is_admin = user?.roles?.includes('system_admin')
    newUser.name = user.username
    newUser.real_name = realName
    newUser.deleted = user.delete_at > 0
    newUser.profile.title = user.position
    newUser.profile.real_name = realName
    newUser.profile.real_name_normalized = realName
    newUser.profile.display_name = user.username
    newUser.profile.display_name_normalized = user.username
    newUser.profile.email = user.email
    newUser.profile.first_name = user.first_name
    newUser.profile.last_name = user.last_name
    const channels = user?.teams?.length ? user?.teams[0].channels : []
    channels.map(channel => {
        addUserToChannel(channel.name, userId, channel.roles, user.username)
    })

    updateData('users', user.username, userId)
    updateSlackData('users', userId, newUser)
}

const addUserToChannel = (channelName, userId, roles, username) => {
    if (slackData.channelUsers.hasOwnProperty(channelName)) {
        slackData.channelUsers[channelName].push(userId)
    } else {
        slackData.channelUsers[channelName] = [userId]
    }

    if (roles?.includes("channel_admin")) {
        if (slackData.channelAdmins.hasOwnProperty(channelName)) {
            slackData.channelAdmins[channelName].push(username)
        } else {
            slackData.channelAdmins[channelName] = [username]
        }
    }
}

export {
    createUser,
}
