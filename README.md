# Mattermost to Slack Migration
This is a Node.js script to reformat Mattermost export data into Slack JSON format.  This script supports Direct Messages, Group Messages, Public Channels, and Private Channels.  See Limitations section for what is not supported.

### Prerequisites
- Node Version Manager (NVM) or Node v20 installed.
- Familiarity with Command Line

## Overview
The general process is as follows:
1. Generate Mattermost export using Mattermost bulk export tool
2. Copy emojis from Mattermost server.
2. Process Mattermost data and generate export folder
3. Upload Emojis to Slack Admin (using a bulk import browser add-on is handy!)
1. Zip the export folder and import to Slack

## Initial Setup
### Generating Mattermost Export 
1. On the Mattermost server, generate your export using the Mattermost command line tool:
    ```shell
    mmctl export create --no-attachments
    ```
1. Once this is complete, copy the zip from the server and extract the contents.  
1. Move the `import.jsonl` into the root of this project.

### Emojis
1. Copy the contents of your `emoji` directory found in the Mattermost uploads directory on the server into this project at `/emoji`

### Environment Variables
1. Copy `.env.sample` to `.env` and update values as necessary

## Running the Script
1. Ensure your node version: `nvm install` or `nvm use`
2. Run the following: `npm run build`
3. An export directory with the timestamp will be created in the `export` directory
4. Zip this directory (i.e. `export-{timestamp}`) and proceed with data import using the Slack UI (see [documentation](https://slack.com/help/articles/217872578-Import-data-from-one-Slack-workspace-to-another#upload-your-export-file))

*Note: In addition to the `export-{timestamp}` directory,  `channel-admins-{timestamp}.json` and `data-map--{timestamp}.json` are created for reference only. These files are not needed during the Slack Import.

#### Options
If you are intending to filter data before/after a certain date, you can pass a unix timestamp:
```shell
npm run build -- after=1715294431037
```

## Slack Import Issues
- Direct upload of Zip to Slack failed even though file size was under 2GB
- Slack upload tool instructs that Google Drive can be linked, but documentation says it cannot.  Ultimately uploading Zip to Dropbox and linking is what worked for us.

## Limitations
- This script does not import file attachments / file uploads from Mattermost
- Reactions to top-level messages – this seemed to be a bug with the Mattermost export leaving this data out as opposed to this script actually handling it.