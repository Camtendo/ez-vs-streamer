# ez-vs-streamer
An easy way to get stream information updated for a competitive game and notify in Slack

### How to run
1. `npm install`
2. Add a config.json in the repo root with the following keys: `"slackToken", "slackRoomId", "slackTestUsername", "slackRoomName", "slackBotName", "isDebug", "twitchChannelUrl", "twitchClientId", "twitchSecret","twitchOAuthToken"`
3. Make sure that OBS Studio is running with the [OBS WebSocket plugin](https://github.com/Palakis/obs-websocket)
4. `node server.js`

### How to use
1. Have OBS Studio running with the desired source and inputs selected.
2. Open the app at `/` in a web browser. With all default settings, this will probably be `localhost:3000`
3. Input the names of the two players in the text inputs then click `Update and Post`. This will update the linked Twitch channel and post in the Slack channel. The scrolling text will also update to indicate you were successful.
4. Click `Start Streaming` to have OBS begin streaming.
5. Click `Stop Streaming` to have OBS end streaming.