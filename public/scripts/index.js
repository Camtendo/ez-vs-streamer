$('button').click(serverRequests);

function serverRequests() {
    var playerOne = $('#playerOneInput').val();
    var playerTwo = $('#playerTwoInput').val();

    if (!playerOne || !playerTwo) {
        alert('Invalid input!');
        return;
    }

    disableButtonTemporarily();
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

function updateMarquee(playerOne, playerTwo) {
    var newString = `${playerOne} vs. ${playerTwo}`;
    $('marquee').text(newString);
}

function disableButtonTemporarily() {
    $('button').prop('disabled', true);
    setTimeout(function() {
        $('button').prop('disabled', false);
    }, 10000);
}
