var _session = undefined;
var _userid = undefined;

$( document ).ready( function ()
{
	var sessionCookie = document.cookie.replace( /(?:(?:^|.*;\s*)sessionid\s*\=\s*([^;]*).*$)|^.*$/, "$1" );
	var userIdCookie = document.cookie.replace( /(?:(?:^|.*;\s*)userid\s*\=\s*([^;]*).*$)|^.*$/, "$1" );
	if ( sessionCookie.length == 0 )
	{
		window.location.href = "login.html";
		return;
	}

	_session = sessionCookie;
	_userid = userIdCookie;

	SetupActiveGames();

} );

function Logout()
{
	document.cookie = "sessionid=";
	window.location.href = "login.html";
}

function SetupActiveGames()
{
	var template = "" +
		"<div class='item' data-gameid=':gameid'>" +
		"	<i class='large send middle aligned icon'></i>" +
		"	<div class='content'>" +
		"		<a class='header'>:opponent</a>" +
		"		<div class='description'>:lastUpdated</div>" +
		"	</div>" +
		"</div>";

	$.ajax( {
		url: "http://localhost:3000/api/games",
		method: "post",
		data: { sessionId: _session }
	} ).done(( a_response ) =>
	{
		if ( a_response.error == undefined )
		{
			// Clear games list
			$( "#gamesList" ).html( "" );
			var gamesPending = 0;

			var games = a_response.games; // to improve readability
			for ( var i = 0; i < games.length; ++i )
			{
				var game = $( template
					.replace( ":gameid", games[ i ].gameId )
					.replace( ":opponent", games[ i ].opponentName )
					.replace( ":lastUpdated", timeSince( games[ i ].lastUpdated ) + " ago" ) );

				game.on( "click", function ()
				{
					ShowGame($(this).data("gameid"));
				} );

				// Determine if this game is waiting on the user to have their turn
				if ( ( games[ i ].playerOneId == _userid && games[ i ].currentRound.playerOneTurnId == null ) ||
					( games[ i ].playerTwoId == _userid && games[ i ].currentRound.playerTwoTurnId == null ) )
				{
					++gamesPending;
					game.find( "i" ).addClass( "outline" );
				}

				$( "#gamesList" ).append( game );
			}

			if (gamesPending > 0)
			{
				$("#dashboardCounter").text(gamesPending);
				$("#dashboardCounter").css("display", "");
			}
			else
			{
				$("#dashboardCounter").css("display", "none");
			}
		}
		else
		{

		}
	} ).fail(( a_err ) =>
	{
		console.warn( "Could not connect to API" );
		console.warn( a_err );
	} );
}


function ShowGame()
{

}



function timeSince( date )
{
	var seconds = Math.floor(( new Date() - new Date( date ) ) / 1000 );

	var interval = Math.floor( seconds / 31536000 );

	if ( interval > 1 )
	{
		return interval + " years";
	}
	interval = Math.floor( seconds / 2592000 );
	if ( interval > 1 )
	{
		return interval + " months";
	}
	interval = Math.floor( seconds / 86400 );
	if ( interval > 1 )
	{
		return interval + " days";
	}
	interval = Math.floor( seconds / 3600 );
	if ( interval > 1 )
	{
		return interval + " hours";
	}
	interval = Math.floor( seconds / 60 );
	if ( interval > 1 )
	{
		return interval + " minutes";
	}
	return Math.floor( seconds ) + " seconds";
}