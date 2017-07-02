var _session = undefined;
var _userid = undefined;
var _currentGame = undefined;

const ACTIONS = [
	"rock",
	"paper",
	"scissors"
];

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
					ShowGame( $( this ).data( "gameid" ) );
				} );

				// Determine if this game is waiting on the user to have their turn
				if ( ( games[ i ].playerOneId == _userid && games[ i ].currentRound.playerOneTurnId == null ) ||
					( games[ i ].playerTwoId == _userid && games[ i ].currentRound.playerTwoTurnId == null ) )
				{
					++gamesPending;
					game.find( "i" ).addClass( "outline" );
				}
				else if ( games[ i ].winnerId != 0 )
				{
					game.find( "i" ).removeClass( "send" );

					if ( games[ i ].winnerId == _userid )
						// Show trophy icon if the user won the round
						game.find( "i" ).addClass( "trophy" );
					else
						// Show a frowny face if the user lost
						game.find( "i" ).addClass( "frown" );


				}

				$( "#gamesList" ).append( game );
			}

			if ( gamesPending > 0 )
			{
				$( "#dashboardCounter" ).text( gamesPending );
				$( "#dashboardCounter" ).css( "display", "" );
			}
			else
			{
				$( "#dashboardCounter" ).css( "display", "none" );
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


function ShowGame( a_gameId )
{
	$.ajax( {
		url: "http://localhost:3000/api/game",
		method: "post",
		data: { sessionId: _session, gameId: a_gameId }
	} ).done(( a_response ) =>
	{
		$( "#roundList" ).html( "" );

		if ( a_response.error == undefined )
		{
			var game = a_response.game;

			var playerTurnTemplate = "<div class='content player'><i class='hand :action icon'></i> " +
				"You played :action</div>";
			var opponentTurnTemplate = "<div class='content opponent'><i class='hand :action icon'></i> " +
				"Opponent played :action</div>";


			// Sort list of rounds by their last modify date
			game.rounds = game.rounds.sort( SortRounds );

			// Fill the previous moves list
			for ( var i = 0; i < game.rounds.length; ++i )
			{
				if ( game.rounds[ i ] == null )
					continue;

				var roundObj = $( "<div class='item'></div>" );

				// Make elements for each turn
				for ( var k = 0; k < game.rounds[ i ].turns.length; ++k )
				{
					var turn = game.rounds[ i ].turns[ k ];

					if ( turn.userId == _userid )
						roundObj.append( $( playerTurnTemplate.replace( /:action/g, ACTIONS[ turn.action ] ) ) );
					else
						roundObj.append( $( opponentTurnTemplate.replace( /:action/g, ACTIONS[ turn.action ] ) ) );
				}

				// Check if ONLY the opponent has played their turn so we can hide their action
				var turns = roundObj.find( ".content" );
				if ( turns.length == 1 )
				{
					// Check that the only turn is the opponent's
					if ( turns.hasClass( "opponent" ) )
					{
						// Replace the icon
						$( turns ).find( "i" ).removeClass( "hand" );
						$( turns ).find( "i" ).addClass( "help" );

						// Replace the text
						$( turns ).html( $( turns ).html().replace( " rock", "..." ).replace( " paper", "..." ).replace( " scissors", "..." ) );
					}
				}
				// help
				$( "#roundList" ).append( roundObj );
			}

			if ( game.winnerId == 0 )
			{
				SetupGameArea();
				_currentGame = game.gameId;
			}
			else
			{
				$( "#gameArea button" ).addClass( "disabled" );
				_currentGame = undefined;
			}
		}
		else
		{

		}
	} ).fail(( a_err ) =>
	{
		$( this ).removeClass( "loading" );

		console.warn( "Could not connect to API" );
		console.warn( a_err );
	} );
}


function SetupGameArea()
{
	$( "#gameArea .button" ).removeClass( "disabled" );
}


function SubmitTurn( a_action )
{
	if ( _currentGame != undefined )
		return;

	$( "#gameArea button" ).addClass( "loading" );

	$.ajax( {
		url: "http://localhost:3000/api/submitTurn",
		method: "post",
		data: { sessionId: _session, gameid: _currentGame, action: a_action }
	} ).done(( a_response ) =>
	{
		$( "#gameArea button" ).removeClass( "loading" );
		$( "#gameArea button" ).addClass( "disabled" );

		SetupActiveGames();
	} ).fail(( a_err ) =>
	{
		$( "#gameArea button" ).removeClass( "loading" );

		console.warn( "Could not connect to API" );
		console.warn( a_err );
	} );
}


function SortRounds( a, b )
{
	// Prevent breakages in case there's a null
	// (null dates are set to epoch time)
	if ( a == null )
		a = { dateUpdated: null };
	if ( b == null )
		b = { dateUpdated: null };

	var aDate = new Date( a.dateUpdated );
	var bDate = new Date( b.dateUpdated );

	if ( aDate < bDate )
		return 1;
	if ( aDate > bDate )
		return -1;

	return 0;
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