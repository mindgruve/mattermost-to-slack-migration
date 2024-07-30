import * as fs from 'node:fs';
import {createUser} from './dataTypes/User.js'
import {createChannel} from "./dataTypes/Channel.js";
import {setupMessage, createDm, writeDms} from "./dataTypes/DirectMessage.js";
import {data, getSlackMembers} from "./dataStore.js";
const sha256 = async(message, characterCount = 8) => {
    if (typeof(crypto.subtle) === 'undefined') {
        return message
    }
    // encode as UTF-8
    const msgBuffer = new TextEncoder().encode(message);

    // hash the message
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);

    // convert ArrayBuffer to Array
    let hashArray = Array.from(new Uint8Array(hashBuffer));

    // convert bytes to hex string
    hashArray = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashArray.slice(0, characterCount).toUpperCase()
}

const getSlackDate = (dateMs) => {
    const newDate = new Date(dateMs)
    return [
        newDate.getFullYear(),
        datePrependZero(newDate.getMonth() + 1),
        datePrependZero(newDate.getDate()),
    ].join('-')
}

const getSlackTs = (ms) => {
    const str = (ms * 1000).toString()
    return str.match(/.{1,10}/g).join('.')
}

const datePrependZero = (number) => {
    return (number < 10 ? '0' : '') + number
}

const createFolder = (name) => {
    const dir = `${process.env['exportDir']}/${name}`
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
}

const updateMentions = (str) => {
    let match;
    let inputString = str;

    // Define a regular expression pattern to identify a potential user mention i.e. @gui
    const regex = new RegExp(`@([a-z0-9._]*(?<![,.!:?]))`, 'gi');

    // use the users map to later replace mattermost usernames with Slack User IDs: i.e. {"griffin": "U06FC51FAAD"}
    let userMap = data.users;

    // create a map for old -> new replacements, i.e. {"@griffin": "<@U06FC51FAAD>"}
    const newUserMentionMap = {};

    // This loop dynamically collects the old patterns and prepares new patterns to be replaced
    while ((match = regex.exec(inputString)) !== null) {
        const mattermostUser = match[1]; // reference the group which separates the @ symbol from username
        if (typeof userMap[mattermostUser] !== 'undefined') { // filter out matches that aren't associated with users, i.e.: @here or @channel
            newUserMentionMap[`@${mattermostUser}`] = `<@${userMap[mattermostUser]}>`;
        }
    }

    // run replace on our string, and use map as dictionary for regex matches
    inputString = inputString.replace(regex, (oldString) => {
        if (typeof (newUserMentionMap[oldString]) !== 'undefined') {
            return newUserMentionMap[oldString]
        } else {
            return oldString
        }
    });

    return inputString
}

/**
 * Transform Markdown text into Slack's desired format.
 * @param message
 */
const filterMarkdown = (message) => {
    let match;
    let inputString = message;
    // create a map for old -> new replacements, i.e. [this](https://google.com) -> <https://google.com|this>
    const newLinkMap = {};
    // capture links that don't match the markdown format, when messages just have a url i.e.: https://google.com
    const rawLink = new RegExp(`(?<!\\]\\()(http|https):\\/\\/([\\w_-]+(?:(?:\\.[\\w_-]+)+))([\\w.,@?^=%&:\\/~+#-]*[\\w@?^=%&\\/~+#-])`, 'g')
    // capture markdown links i.e.: [this](https://google.com)
    const markdownLink = new RegExp(`\\B(?<!!)\\[(?<link_text>[^\\]]*)\\]\\((?<link>.*?)(?=\\"|\\))\\)`, 'g')

    const markdownImage = new RegExp(`(?<alt>!\\[[^\\]]*\\])\\((?<filename>.*?)(?=\\"|\\))\\)`, 'g')

    // loop through matches and push into our map
    while ((match = markdownLink.exec(inputString)) !== null) {
        const linkText = match[1],
              linkHref = match[2];
            newLinkMap[`${match[0]}`] = `<${linkHref}|${linkText}>`;
    }

    while ((match = markdownImage.exec(inputString)) !== null) {
        const imageSrc = match[2];
            newLinkMap[`${match[0]}`] = `<${imageSrc}>`;
    }

    while ((match = rawLink.exec(inputString)) !== null) {
        newLinkMap[`${match[0]}`] = `<${match[0]}>`;
    }

    // run replace on our string, and use map as dictionary for regex matches
    inputString = inputString.replace(rawLink, (oldString) => {
        return newLinkMap[oldString]
    });

    inputString = inputString.replace(markdownLink, (oldString) => {
        return newLinkMap[oldString]
    });

    inputString = inputString.replace(markdownImage, (oldString) => {
        return newLinkMap[oldString]
    });

    return inputString
}

const parseBlocks = (message) => {
    const blocks = []
    if (message.length > 0) {
        blocks.push(
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": message
                }
            }
        )

        const imagePattern = new RegExp(`(http(s?):)([/|.|\\w|\\s|-])*\\.(?:jpg|gif|png|webp)`, 'g')
        let images = message.match(imagePattern)
        if (images) {
            images.map(image => {
                blocks.push({
                    "type": "image",
                    "image_url": image,
                    "alt_text": ""
                })
            })
        }
    }

    // if (attachments.length > 0) {
    //     attachments.map(item => {
    //         const isImage = (/(jpg|gif|png|jpeg|webp)$/i).test(item.path)
    //         const isVideo = (/(mov|mp4)$/i).test(item.path)
    //         if (isImage) {
    //             blocks.push({
    //                 "type": "image",
    //                 "image_url": item.path,
    //                 "alt_text": ""
    //             })
    //         }
    //     })
    // }

    return blocks;
}

const parseReactions = (reactions) => {
    const emojiList = []
    const slackReactions = {}
    reactions?.map(reaction => {
        const {user, emoji_name} = reaction
        if (!emojiList.includes(emoji_name)) {
            emojiList.push(emoji_name)
            slackReactions[emoji_name] = {
                name: emoji_name,
                users: [],
                count: 0
            }
        }
        slackReactions[emoji_name].users.push(getSlackMembers(user))
    })

    return Object.keys(slackReactions).map(reaction => ({
        ...slackReactions[reaction],
        count: slackReactions[reaction]?.users?.length ?? 0
    }))
}

export {
    getSlackDate,
    getSlackTs,
    createUser,
    createChannel,
    setupMessage,
    createDm,
    writeDms,
    parseBlocks,
    filterMarkdown,
    parseReactions,
    createFolder,
    updateMentions,
    sha256
}
