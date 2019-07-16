# ez-vs-streamer
An easy way to get stream information updated for a competitive game and notify in Slack

### How to run
1. `npm install`
2. Add a config.json in the repo root with the following keys: `"slackToken", "slackRoomId", "slackTestUsername", "slackRoomName", "slackBotName", "isDebug", "twitchChannelUrl", "twitchClientId", "twitchSecret","twitchOAuthToken"`
3. Make sure that OBS Studio is running with the [OBS WebSocket plugin](https://github.com/Palakis/obs-websocket)
4. Build the React front-end with `npm run build`
5. `node server.js`
6. Open a browser tab at `localhost:3000`

### How to use
1. Have OBS Studio running with the desired source and inputs selected.
2. Open the app at `/` in a web browser. With all default settings, this will probably be `localhost:3000`
3. Input the names of the two players in the text inputs then click `Update and Post`. This will update the linked Twitch channel and post in the Slack channel. The scrolling text will also update to indicate you were successful.
4. Click `Start Streaming` to have OBS begin streaming.
5. Click `Stop Streaming` to have OBS end streaming.

![](https://cdn.discordapp.com/attachments/384193390771699712/579399099057569803/unknown.png)
