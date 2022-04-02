import React, { Component } from 'react';
import { NotificationContainer, NotificationManager } from 'react-notifications';
import axios from 'axios'
import './App.css';
import socketIOClient from "socket.io-client";

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            playerOne: '',
            playerTwo: '',
            playerGroup: '',
            isStreaming: false,
            disableButtons: false,
            socket: socketIOClient("http://localhost:3001"),
        }
    }

    componentDidMount() {
        var {socket} = this.state;
        this.getInitialOBSStatus();

        socket.on('connect', () => {
            NotificationManager.success('Connected to server successfully!');
        });

        socket.on('connect_error', () => {
            NotificationManager.error('Not connected to server! Try refreshing!');
        });

        socket.on('ConnectionClosed', (data) => {
            console.log(data);
            NotificationManager.error('Server lost connection to OBS!');
        });

        socket.on('ConnectionOpened', (data) => {
            console.log(data);
            NotificationManager.success('Server connected to OBS successfully!');
        });

        socket.on('StreamStarted', (data) => {
            console.log(data);
            this.setState({isStreaming: true});
        });

        socket.on('StreamStopped', (data) => {
            console.log(data);
            this.setState({isStreaming: false});
        });
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

    onPlayerGroupChange = (playerGroup) => {
        this.setState({
            playerGroup: playerGroup.target.value
        })
    }

    updateAndPost = async () => {
        const { playerOne, playerTwo, playerGroup } = this.state;

        if (!playerOne || !playerTwo) {
            alert('Invalid input!');
            return;
        }

        const grouping = playerGroup ? playerGroup : "null";
    
        this.disableButtonsTemporarily();

        try {
            console.log('posting to Slack');
            await axios.get(`/notify-slack/${playerOne}/${playerTwo}/${grouping}`)
        } catch {
            NotificationManager.error('Error sending slack notification');
            return;
        }

        try {
            console.log('posting to Twitch');
            await axios.get(`/update-twitch/${playerOne}/${playerTwo}/${grouping}`)
        } catch {
            NotificationManager.error('Error updating twitch')
            return;
        }

        NotificationManager.success('Notification sent to Twitch and Slack');
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

    getInitialOBSStatus = () => {
        axios.get(`/obs/streaming-status`).then(result => {
            const serverIsStreaming = result ? result.data.streaming || result.data.recording : false;
            NotificationManager.success(`Read initial streaming status as ${serverIsStreaming}`);
            this.setState({isStreaming: serverIsStreaming});
        }).catch(() => {
            NotificationManager.error('Unable to request initial OBS status');
        });
    }

    setOBSStreamingStatus = () => {
        const {isStreaming} = this.state;
        var newStatus = !isStreaming;

        axios.get(`/obs/set-streaming/${newStatus}`).then((result) => {
            this.disableButtonsTemporarily()
        }).catch(() => {
            NotificationManager.error('Unable to set OBS streaming status');
        });
    }

    render() {
        const { disableButtons, playerOne, playerTwo, playerGroup, isStreaming } = this.state;

        const streamingButton = isStreaming ? 
        (<button 
            className="btn btn-danger btn-lg"
            disabled={disableButtons}
            onClick={this.setOBSStreamingStatus}>Stop Streaming</button>) : 
        (<button 
            className="btn btn-secondary btn-lg"
            disabled={disableButtons}
            onClick={this.setOBSStreamingStatus}>Start Streaming</button>);

        return (
            <div id="main-container">
                <div className="marquee-row">
                    { playerOne && playerTwo ? 
                        <marquee>{playerOne} vs {playerTwo}</marquee> : 
                        <marquee>Please input the player names</marquee>
                    }
                </div>
                <div className="player-input-row">
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

                <div className="secondary-input-row">
                    <div className="player-group">
                        <label>Group</label>
                        <input 
                            className="input-lg col-lg-12"
                            placeholder="A, B, C, etc"
                            value={playerGroup}
                            onChange={this.onPlayerGroupChange}/>
                    </div>
                </div>

                <div className="button-row">
                    <button 
                        className="btn btn-primary btn-lg"
                        disabled={disableButtons}
                        onClick={this.updateAndPost}>Update and Post</button>
                    {streamingButton}
                </div>

                <NotificationContainer/>
            </div>
        );
    }
}

export default App;
