import { RefreshingAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { promises as fs } from 'fs';
import express  from 'express';
import path from 'path';
import SlackBot from 'slackbots';
import OBSWebSocket from 'obs-websocket-js';
import http from 'http';
import socketio from 'socket.io';

const __dirname = path.resolve();

let slackBot;
(async () => {
  const config = JSON.parse(await fs.readFile('./config.json', 'utf-8'));
  slackBot = new SlackBot({
    token: config.slackToken,
    name: config.slackBotName
  });
})();

const app = express();
var httpServer = http.createServer(app);
var io = socketio(httpServer);
httpServer.listen(3001);

let twitchAuthProvider;
let twitchClient;

(async () => {
  const tokenData = JSON.parse(await fs.readFile('./tokens.json', 'UTF-8'));
  const config = JSON.parse(await fs.readFile('./config.json', 'utf-8'));

  try
  {
    twitchAuthProvider = new RefreshingAuthProvider(
      {
        clientId: config.twitchClientId,
        clientSecret: config.twitchSecret,
        onRefresh: async newTokenData => await fs.writeFile('./tokens.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
      },
      tokenData
    );

    twitchClient = new ApiClient({ authProvider: twitchAuthProvider });
  }
  catch(ex)
  {
    console.log(ex);
  }
  
})(twitchClient);

const obs = new OBSWebSocket();

var port = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'build')));

console.log(`Starting ez-vs-streamer on port ${port}...`);

app.get('/', (req, res) => res.sendFile(path.join(__dirname + '\\build\\index.html')));

app.get('/update-twitch/:player1/:player2/:playerGroup', async (req, res) => {
  const groupPrefix = !!req.params.playerGroup && req.params.playerGroup !== "null" ? 
    `Group ${req.params.playerGroup}: ` : 
    '';
  const newTitle = `${groupPrefix}${req.params.player1} vs. ${req.params.player2}`;
  const twitchUser = await twitchClient.users.getMe();
  twitchClient.channels.updateChannelInfo(twitchUser.id, { title: newTitle });

  console.log('Twitch channel successfully updated');
  res.sendStatus(200);
});

app.get('/notify-slack/:player1/:player2/:playerGroup', async (req, res) => {
  const config = JSON.parse(await fs.readFile('./config.json', 'utf-8'));
  const groupPrefix = !!req.params.playerGroup && req.params.playerGroup !== "null" ? 
    `Group ${req.params.playerGroup}: ` : 
    '';
  var message = `A new match is about to begin! ${groupPrefix}${req.params.player1} vs. ${req.params.player2} \n Watch it on ${config.twitchChannelUrl}`;

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
