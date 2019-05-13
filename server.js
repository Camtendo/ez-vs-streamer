const express = require('express');
var path = require('path');
const TwitchClient = require('twitch').default;
var SlackBot = require('slackbots');
var config = require('./config.json');

const app = express();
const slackBot = new SlackBot({
    token: config.slackToken,
    name: config.slackBotName
});

let twitchClient;
(async () => {
    twitchClient = await TwitchClient.withCredentials(config.twitchClientId, config.twitchOAuthToken);
})();


var port = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));

console.log(`Starting ez-vs-streamer on port ${port}...`);
console.log(config);

app.get('/', (req, res) => res.sendFile(path.join(__dirname + '/index.html')));

app.get('/update-twitch/:player1/:player2', async (req, res) => {
    const newTitle = `${req.params.player1} vs. ${req.params.player2}`;
    const channel = await twitchClient.kraken.channels.getMyChannel();
    twitchClient.kraken.channels.updateChannel(channel, {status: newTitle});

    res.sendStatus(200);
});

app.get('/notify-slack/:player1/:player2', (req, res) => {
    var message = `A new match is about to begin! ${req.params.player1} vs. ${req.params.player2}`;
    var urlMessage = `Watch it on ${config.twitchChannelUrl}`;

    var params = {icon_emoji:':finalsmash:'};
    if (config.isDebug) {
        slackBot.postMessageToUser(config.slackTestUsername, message, params, () => {
            slackBot.postMessageToUser(config.slackTestUsername, urlMessage, params);
        });
    } else {
        slackBot.postMessageToChannel(config.slackRoomName, message, params, () => {
            slackBot.postMessageToChannel(config.slackRoomName, urlMessage, params);
        });
    }
    res.sendStatus(200);
});

app.listen(port);