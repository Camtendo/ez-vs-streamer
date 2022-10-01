import { RefreshingAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { promises as fs } from 'fs';
import express  from 'express';
import path from 'path';
import OBSWebSocket from 'obs-websocket-js';
import http from 'http';
import socketio from 'socket.io';
import { WebClient } from '@slack/web-api';

const __dirname = path.resolve();
const outputName = 'simple_stream';

let slackBot;
(async () => {
  console.log('Configuring Slack connection');
  const config = JSON.parse(await fs.readFile('./config.json', 'utf-8'));
  slackBot = new WebClient(
    config.slackToken,
  );
})();

const app = express();
var httpServer = http.createServer(app);
var io = socketio(httpServer);
httpServer.listen(3001);

let twitchAuthProvider;
let twitchClient;

(async () => {
  console.log('Configuring Twitch connection');
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
   console.log('Attempting to post to Twitch');
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
  console.log('Attempting to post to Slack');
  const config = JSON.parse(await fs.readFile('./config.json', 'utf-8'));
  const groupPrefix = !!req.params.playerGroup && req.params.playerGroup !== "null" ? 
    `Group ${req.params.playerGroup}: ` : 
    '';
  var message = `A new match is about to begin! ${groupPrefix}${req.params.player1} vs. ${req.params.player2} \n Watch it on ${config.twitchChannelUrl}`;

  if (config.isDebug) {
    await slackBot.chat.postMessage({channel:config.slackTestUserId, text: message });
  } else {
    // slackBot.postMessageToChannel(config.slackRoomName, message, params);
    await slackBot.chat.postMessage({channel:config.slackRoomName, text: message });
  }
  
  console.log('Posted to Slack');
  res.sendStatus(200);
});

(async () => {
  console.log('Configuring OBS web socket');
  const config = JSON.parse(await fs.readFile('./config.json', 'utf-8'));

  try
  {
    obs.connect('ws://127.0.0.1:4455', config.obsWebsocketPassword)
    .then(() => {
      console.log('Connected to OBS successfully');
    });
  }
  catch(ex)
  {
    console.log(ex);
  }
  
})();


io.on('connection', (socket) => {
    console.log(`New client connected id=${socket.id}`);

    obs.on('error', err => {
      console.error('socket error:', err);
    });
    
    obs.on('StreamStateChanged', data => {
      console.log(`Stream state updated. OutputActive=${data.outputActive}`);
      socket.emit('StreamStateChanged', data);
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
  console.log('Fetching streaming status...');
  console.log(await obs.call('GetOutputList'));
  try {
    var status = await obs.call('GetOutputStatus', {outputName: outputName});
    console.log(status);
    res.json(status);
  } catch (error) {
    console.log('Unable to fetch output status, defaulting to false.');
    res.json({outputActive: false});
  }
});

app.get('/obs/set-streaming/:shouldStream', async (req, res) => {
  const shouldStream = req.params.shouldStream;
  let streaming = false;

  if (shouldStream === 'true') {
    console.log('Attempting to start streaming...');
    // await obs.call('StartOutput', {outputName: outputName});
     await obs.call('StartStream');
    streaming = true;
  } else {
    console.log('Attempting to stop streaming...');
    // await obs.call('StopOutput', {outputName: outputName});
    await obs.call('StopStream');
    streaming = false;
  }

  res.json(streaming);
});

app.listen(port);
