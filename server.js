const express = require('express');
var path = require('path');
const TwitchClient = require('twitch').default;
var SlackBot = require('slackbots');
var config = require('./config.json');
var OBSWebSocket = require('obs-websocket-js');

const app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
http.listen(3001);
const slackBot = new SlackBot({
  token: config.slackToken,
  name: config.slackBotName
});

let twitchClient;
(async () => {
  twitchClient = await TwitchClient.withCredentials(config.twitchClientId, config.twitchOAuthToken);
})();

const obs = new OBSWebSocket();

var port = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'build')));

console.log(`Starting ez-vs-streamer on port ${port}...`);

app.get('/', (req, res) => res.sendFile(path.join(__dirname + '\\build\\index.html')));

app.get('/update-twitch/:player1/:player2', async (req, res) => {
  const newTitle = `${req.params.player1} vs. ${req.params.player2}`;
  const channel = await twitchClient.kraken.channels.getMyChannel();
  twitchClient.kraken.channels.updateChannel(channel, { status: newTitle });

  console.log('Twitch channel successfully updated');
  res.sendStatus(200);
});

app.get('/notify-slack/:player1/:player2', (req, res) => {
  var message = `A new match is about to begin! ${req.params.player1} vs. ${req.params.player2} \n Watch it on ${config.twitchChannelUrl}`;

  var params = { icon_emoji: ':finalsmash:' };
  if (config.isDebug) {
    slackBot.postMessageToUser(config.slackTestUsername, message, params);
  } else {
    slackBot.postMessageToChannel(config.slackRoomName, message, params);
  }
  
  console.log('Posted to Slack');
  res.sendStatus(200);
});

obs.connect()
  .then(() => {
    console.log('Connected to OBS successfully');
  });

io.on('connection', (socket) => {
    console.log(`New client connected id=${socket.id}`);

    obs.on('error', err => {
      console.error('socket error:', err);
    });
    
    obs.on('StreamStopped', data => {
      console.log('Stream stopped!');
      socket.emit('StreamStopped', data);
    });
    
    obs.on('StreamStarted', data => {
      console.log('Stream started!');
      socket.emit('StreamStarted', data);
    });
    
    obs.on('RecordingStarted', data => {
      console.log('Recording Started!');
      socket.emit('RecordingStarted', data);
    });
    
    obs.on('RecordingStopped', data => {
      console.log('Recording Stopped!');
      socket.emit('RecordingStopped', data);
    });

    obs.on('ConnectionOpened', data => {
      console.log('Connected to OBS');
      socket.emit('ConnectionOpened', data);
    });

    obs.on('ConnectionClosed', data => {
      console.log('Lost connection to OBS');
      socket.emit('ConnectionClosed', data);
    });

    socket.on('disconnect', () => {
      console.log('client disconnected');
    });
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
