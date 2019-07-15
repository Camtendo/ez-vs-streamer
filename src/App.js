import React, { Component } from 'react';
import { NotificationContainer, NotificationManager } from 'react-notifications';
import OBSWebSocket from 'obs-websocket-js';
import axios from 'axios'
import './App.css';

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            playerOne: '',
            playerTwo: '',
            isStreaming: false,
            disableButtons: false,
        }
    }

    async componentDidMount() {
        const obs = new OBSWebSocket()
        await obs.connect({ address: 'localhost:4444' })

        obs.onConnectionOpened(() => {
            console.log("open")
        })
        /*
        obs.on('error', err => {
            console.error('socket error:', err);
        });

        obs.on('RecordingStarted', (data) => {
            console.log('Recording started')
        });

        obs.on('RecordingStopped', (data) => {
            console.log('Recording stopped')
        });
        */
    }

    onPlayerOneChange = (playerOne) => {
        this.setState({
            playerOne: playerOne.target.value
        })
    }
    onPlayerTwoChange = (playerTwo) => {
        this.setState({
            playerTwo: playerTwo.target.value
        })
    }

    updateAndPost = async () => {
        const { playerOne, playerTwo } = this.state;

        if (!playerOne || !playerTwo) {
            alert('Invalid input!');
            return;
        }
    
        this.disableButtonsTemporarily();
        try {
            await axios.get(`/update-twitch/${playerOne}/${playerTwo}`)
        } catch {
            NotificationManager.error('Error updating twitch')
            return;
        }

        try {
            await axios.get(`/notify-slack/${playerOne}/${playerTwo}`)
        } catch {
            NotificationManager.error('Error sending slack notification')
            return;
        }

        NotificationManager.success('Slack Notification Sent')
    }

    disableButtonsTemporarily = () => {
        this.setState({
            disableButtons: true,
        })

        setTimeout(() => {
            this.setState({
                disableButtons: false,
            })
        }, 2000)
    }

    render() {
        const { disableButtons, playerOne, playerTwo } = this.state;

        return (
            <div id="main-container">
                <div className="marquee-row">
                    { playerOne && playerTwo ? 
                        <marquee>{playerOne} vs {playerTwo}</marquee> : 
                        <marquee>Please input the player names</marquee>
                    }
                </div>
                <div className="input-row">
                    <div className="player-one">
                        <label>Player One</label>
                        <input 
                            className="input-lg col-lg-12"
                            placeholder="Fox"
                            value={playerOne}
                            onChange={this.onPlayerOneChange}/>
                    </div>
                    <div className="player-two">
                        <label>Player Two</label>
                        <input 
                            className="input-lg col-lg-12"
                            placeholder="Falco"
                            value={playerTwo}
                            onChange={this.onPlayerTwoChange}/>
                    </div>
                </div>
                <div className="button-row">
                    <button 
                        className="btn btn-primary btn-lg"
                        disabled={disableButtons}
                        onClick={this.updateAndPost}>Update and Post</button>
                    <button 
                        className="btn btn-secondary btn-lg"
                        disabled={disableButtons}
                        onClick={this.startStreaming}>Start Streaming</button>
                </div>

                <NotificationContainer/>
            </div>
        );
    }
}

export default App;



/*
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


*/

/*
let isStreaming = false;

getOBSStatus();
setInterval(getOBSStatus, 500);

function getOBSStatus() {
    $.get(`/obs/streaming-status`).done((result) => {
        if (result.streaming != isStreaming) {
            console.log(`Updated streaming status to ${result.streaming}`);
            updateStreamingButton(result.streaming);
        }
        isStreaming = result.streaming;
    }).fail(() => {
        console.log('Unable to request OBS status');
    });
}

function toggleOBSStreaming() {
    disableButtonsTemporarily();
    $.get(`/obs/set-streaming/${!isStreaming}`).done((result) => {
        updateStreamingButton(isStreaming);
    }).fail(() => {
        console.log('Unable to toggle OBS streaming');
    });
}

function updateStreamingButton(currentlyStreaming) {
    var streamButton = $('#stream-btn');
    if (currentlyStreaming) {
        streamButton.removeClass('btn-secondary');
        streamButton.addClass('btn-danger');
        streamButton.text('Stop Streaming');
    } else {
        streamButton.removeClass('btn-danger');
        streamButton.addClass('btn-secondary');
        streamButton.text('Start Streaming');
    }
}
*/
