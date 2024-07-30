import * as fs from 'node:fs';
import {fileTypeFromFile} from 'file-type';

const copyEmoji = async (obj) => {
    const {emoji} = obj
    const {name, image} = emoji

    fs.access(image, fs.constants.F_OK, async (err) => {
        if (err) {
            console.log("Emoji Error:", err);
        } else {
            const fileType = await fileTypeFromFile(image)
            fs.copyFile(image, `export-emojis/${name}.${fileType.ext}`, (err) => {
                if (err) {
                    console.log("Error Found:", err);
                }
            });
        }
    });
}

export {
    copyEmoji
}
