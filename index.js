import * as fs from 'node:fs';
import readline from 'readline'
import {
    data,
    slackData
} from './dataStore.js'
import {createUser, createChannel, createDm, setupMessage, writeDms} from "./helpers.js";
import * as Helpers from "./helpers.js";
import {copyEmoji} from "./dataTypes/Emoji.js";

const args = process.argv.slice(2);
args.map(arg => {
    const param = arg.split('=')
    process.env[`arg_${param[0]}`] = param[1]
})

// setup export folder for Slack formatted data
const time = new Date().getTime()
process.env['exportId'] = time
const dir = `export/export-${process.env['exportId']}`
process.env['exportDir'] = dir
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

// setup folder to copy emojis to
if (!fs.existsSync('export-emojis')){
    fs.mkdirSync('export-emojis');
}

// setup readline interface for Mattermost export file
const file = readline.createInterface({
    input: fs.createReadStream('import.jsonl'),
    output: process.stdout,
    terminal: false,
})

const moveMembersToChannels = () => {
   slackData.channels.map((channel, index) => {
       slackData.channels[index].members = slackData.channelUsers[channel.name]
       slackData.channels[index].creator = typeof(slackData.channelUsers[channel.name]) !== 'undefined' ?  slackData.channelUsers[channel.name][0] : ''
   })
}

const setGeneralChannel = () => {
    const generalChannelName = process.env.GENERAL_CHANNEL_NAME
    // move town square data to general channel
    slackData.conversations[generalChannelName] = slackData.conversations['town-square']
    // delete town-square object
    delete slackData.conversations['town-square']
    // create folder for new general channel
    Helpers.createFolder(process.env.GENERAL_CHANNEL_NAME ?? 'general')

    slackData.channels = slackData.channels.map(channel => {
        if (channel.name !== 'town-square') {
            return channel
        } else {
            return {
                ...channel,
                is_general: true,
                name: process.env.GENERAL_CHANNEL_NAME ?? 'general'
            }
        }
    })
}

const splitChannelsGroups = () => {
    slackData.groups = slackData.channels.filter(channel => channel.is_private)
    slackData.channels = slackData.channels.filter(channel => !channel.is_private)
}

file.on('line', (line) => {
    const obj = JSON.parse(line)
    switch(obj.type) {
        case 'channel':
            createChannel(obj)
            break;
        case 'user':
            createUser(obj)
            break;
        case 'direct_channel':
            setupMessage(obj)
            break;
        case 'direct_post':
        case 'post':
            createDm(obj)
            break;
        case 'emoji':
            if (process.env.PROCESS_EMOJIS === 'true') {
                copyEmoji(obj)
            }
            break;
    }
})

file.on('close', async () => {
    moveMembersToChannels()
    setGeneralChannel()
    splitChannelsGroups()

    // Not included in Slack import, but helpful for reference later.
    const channelAdminStream = fs.createWriteStream(`export/channel-admins-${time}.json`)
    await channelAdminStream.write(JSON.stringify(slackData.channelAdmins))
    channelAdminStream.end()

    // Not included in Slack import, but helpful for reference later.
    const dataMapStream = fs.createWriteStream(`export/data-map-${time}.json`)
    await dataMapStream.write(JSON.stringify(data))
    dataMapStream.end();

    const userStream = fs.createWriteStream(`${dir}/users.json`)
    await userStream.write(JSON.stringify(Object.keys(slackData.users).map(i => slackData.users[i])))
    userStream.end();

    const groupStream = fs.createWriteStream(`${dir}/groups.json`)
    await groupStream.write(JSON.stringify(slackData.groups))
    groupStream.end()

    const dmsStream = fs.createWriteStream(`${dir}/dms.json`)
    await dmsStream.write(JSON.stringify(slackData.dms))
    dmsStream.end()

    const mpimStream = fs.createWriteStream(`${dir}/mpims.json`)
    await mpimStream.write(JSON.stringify(slackData.mpims))
    mpimStream.end()

    const channelStream = fs.createWriteStream(`${dir}/channels.json`)
    await channelStream.write(JSON.stringify(slackData.channels))
    channelStream.end();

    // Blank file - required for Slack import
    const canvasesStream = fs.createWriteStream(`${dir}/canvases.json`)
    await canvasesStream.write(JSON.stringify([]))
    canvasesStream.end()

    // Blank file - required for Slack import
    const fileStream = fs.createWriteStream(`${dir}/file_conversations.json`)
    fileStream.write(JSON.stringify([]))
    fileStream.end()

    writeDms(slackData.conversations);
})
