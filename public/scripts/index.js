$('#update-btn').click(serverRequests);
$('#stream-btn').click(toggleOBSStreaming);
let isStreaming = false;

getOBSStatus();
setInterval(getOBSStatus, 500);

function serverRequests() {
    var playerOne = $('#playerOneInput').val();
    var playerTwo = $('#playerTwoInput').val();

    if (!playerOne || !playerTwo) {
        alert('Invalid input!');
        return;
    }

    disableButtonsTemporarily();
    $.get(`/update-twitch/${playerOne}/${playerTwo}`).done(() => {
        $.get(`/notify-slack/${playerOne}/${playerTwo}`).done(() => {
            updateMarquee(playerOne, playerTwo);
        }).fail(() => {
            alert('Posting to Slack failed!');
        });
    }).fail(() =>{ 
        alert('Updating Twitch failed!');
    });
}

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

function updateMarquee(playerOne, playerTwo) {
    var newString = `${playerOne} vs. ${playerTwo}`;
    $('marquee').text(newString);
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

function disableButtonsTemporarily() {
    $('button').prop('disabled', true);
    setTimeout(function() {
        $('button').prop('disabled', false);
    }, 2000);
}
