var playerOne = "";
var playerTwo = "";

$('button').click(() => {
    onButtonClick();
});

function serverRequests() {
    if (!playerOne || !playerTwo) {
        alert('Invalid input!');
        return;
    }

    $.get(`/update-twitch/${playerOne}/${playerTwo}`).done(() => {
        $.get(`/notify-slack/${playerOne}/${playerTwo}`).done(() => {
            updateMarquee();
        }).fail(() => {
            alert('Posting to Slack failed!');
        }).fail(() =>{ 
            alert('Updating Twitch failed!');
        });
    })
}

function onButtonClick() {
    updateDisplay();
    serverRequests();
}

function updateDisplay() {
    var p1 = $('#playerOneInput').val();
    var p2 = $('#playerTwoInput').val();

    playerOne = p1;
    playerTwo = p2;
}

function updateMarquee() {
    var newString = `${playerOne} vs. ${playerTwo}`;
    $('marquee').text(newString);
}