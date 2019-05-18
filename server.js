const express = require('express');
var path = require('path');
const TwitchClient = require('twitch').default;
var SlackBot = require('slackbots');
var OBSWebSocket = require('obs-websocket-js');
var config = require('./config.json');

const app = express();
const slackBot = new SlackBot({
  token: config.slackToken,
  name: config.slackBotName
});
const obs = new OBSWebSocket();

let twitchClient;
(async () => {
  twitchClient = await TwitchClient.withCredentials(config.twitchClientId, config.twitchOAuthToken);
})();


var port = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));

console.log(`Starting ez-vs-streamer on port ${port}...`);

app.get('/', (req, res) => res.sendFile(path.join(__dirname + '/index.html')));

app.get('/update-twitch/:player1/:player2', async (req, res) => {
  const newTitle = `${req.params.player1} vs. ${req.params.player2}`;
  const channel = await twitchClient.kraken.channels.getMyChannel();
  twitchClient.kraken.channels.updateChannel(channel, { status: newTitle });

  console.log('Twitch channel successfully updated');
  res.sendStatus(200);
});

app.get('/notify-slack/:player1/:player2', (req, res) => {
  var message = `A new match is about to begin! ${req.params.player1} vs. ${req.params.player2}`;
  var urlMessage = `Watch it on ${config.twitchChannelUrl}`;

  var params = { icon_emoji: ':finalsmash:' };
  if (config.isDebug) {
    slackBot.postMessageToUser(config.slackTestUsername, message, params, () => {
      slackBot.postMessageToUser(config.slackTestUsername, urlMessage, params);
    });
  } else {
    slackBot.postMessageToChannel(config.slackRoomName, message, params, () => {
      slackBot.postMessageToChannel(config.slackRoomName, urlMessage, params);
    });
  }
  
  console.log('Posted to Slack');
  res.sendStatus(200);
});

obs.connect()
  .then(() => {
    console.log('Connected to OBS successfully');
    return obs.send('GetVersion');
  });

obs.on('error', err => {
  console.error('socket error:', err);
});

app.get('/obs/streaming-status', async (req, res) => {
  var status = await obs.send('GetStreamingStatus');
  res.json(status);
});

app.get('/obs/set-streaming/:shouldStream', async (req, res) => {
  const shouldStream = req.params.shouldStream;
  let streaming = false;

  if (shouldStream === 'true') {
    console.log('Attempting to start streaming...');
    streaming = await obs.send('StartStreaming')
  } else {
    console.log('Attempting to stop streaming...');
    streaming = await obs.send('StopStreaming');
  }

  res.json(streaming);
});

app.listen(port);