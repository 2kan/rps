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

	// Create main loop to get game updates regularly
	setInterval( SetupActiveGames, UPDATE_INTERVAL );

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
		url: SERVER_ADDR + "api/games",
		method: "post",
		data: { sessionId: _session }
	} ).done(( a_response ) =>
	{
		if ( a_response.error == undefined )
		{
			// Clear games list
			$( "#gamesList" ).html( "" );
			var gamesPending = 0;

			// Add header for active games
			$( "#gamesList" ).append( $( "<div class='item' id='activeGames'><div class='header'>Active games</div></div>" ) );
			// Add header for completed games
			$( "#gamesList" ).append( $( "<div class='item' id='completedGames'><div class='header'>Completed games</div></div>" ) );


			// Sort games by last modified date
			var games = a_response.games.sort( SortGames );

			var wins = 0;
			var losses = 0;

			// Create the list element for each game
			for ( var i = 0; i < games.length; ++i )
			{
				// Form HTML from template
				var game = $( template
					.replace( ":gameid", games[ i ].gameId )
					.replace( ":opponent", games[ i ].opponentName )
					.replace( ":lastUpdated", timeSince( games[ i ].lastUpdated ) + " ago" ) );

				// Add action to show the game on click
				game.on( "click", function ()
				{
					ShowGame( $( this ).data( "gameid" ) );
				} );

				// Determine if this game is waiting on the user to have their turn
				if ( ( games[ i ].playerOneId == _userid && games[ i ].currentRound.playerOneTurnId == null ) ||
					( games[ i ].playerTwoId == _userid && games[ i ].currentRound.playerTwoTurnId == null ) ||
					( games[ i ].currentRound.playerOneTurnId != null && games[ i ].currentRound.playerTwoTurnId != null && ( games[ i ].winnerId == 0 || games[ i ].winnerId == null ) ) )
				{
					// Game is waiting on player's turn

					++gamesPending;
					game.find( "i" ).addClass( "outline" );

					$( "#activeGames" ).after( game );
				}
				else if ( games[ i ].winnerId == 0 )
				{
					// Game is waiting on opponent

					$( "#activeGames" ).after( game );
				}
				else if ( games[ i ].winnerId != 0 )
				{
					// Game has been completed

					game.find( "i" ).removeClass( "send" );

					if ( games[ i ].winnerId == _userid )
					{
						// Show trophy icon if the user won the game
						game.find( "i" ).addClass( "trophy" );
						++wins;
					}
					else
					{
						// Show a frowny face if the user lost
						game.find( "i" ).addClass( "frown" );
						++losses;
					}

					$( "#completedGames" ).after( game );
				}
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

			var statsTemplate = "<div class='ui grid'>" +
				"<div class='eight wide column'>Wins<br />Losses<br />Total games</div>" +
				"<div class='eight wide column'>:wins<br />:losses<br />:total";
			//<p>Wins: :wins</p><p>Losses: :losses</p><p>Total games: :total</p>";

			$( "#stats" ).html( statsTemplate
				.replace( ":wins", wins )
				.replace( ":losses", losses )
				.replace( ":total", games.length ) );
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
		url: SERVER_ADDR + "api/game",
		method: "post",
		data: { sessionId: _session, gameId: a_gameId }
	} ).done(( a_response ) =>
	{
		$( "#roundList" ).html( "" );

		if ( a_response.error == undefined )
		{
			var game = a_response.game;

			// Sort list of rounds by their last modify date
			game.rounds = game.rounds.sort( SortRounds );

			// Fill the previous moves list
			SetupRoundHistory( game );
			SetupGameArea();

			if ( game.winnerId == 0 )
			{
				_currentGame = game.gameId;
			}
			else
			{
				$( "#gameArea button" ).addClass( "disabled" );
				_currentGame = undefined;

				$( "#extraText" ).css( "display", "" );
				if ( game.winnerId == _userid )
					$( "#extraText" ).text( "You won!" );
				else
					$( "#extraText" ).text( "You lost!" );

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
	//						  jquery vomit
	var waitingForPlayer = $( $( "#roundList .item" )[ 0 ] ).find( ".opponent" ).length == 1;

	// If this is a new game, then there'll be nothing in the roundList to check the
	// round status on
	if ( $( "#roundList .item" ).length == 0 )
	{
		// Yep, this is a new game and it's waiting for the player to submit their move
		waitingForPlayer = true;

		// Add UI juice
		$( "#roundList" ).append( "<div class='item'><div class='content'>New game! Take your turn!</div></div>" );
	}

	$( "#extraText" ).css( "display", "none" );

	$( "#gameControls" ).css( "display", "" );
	$( "#gameBlank" ).css( "display", "none" );
	$( "#roundListContainer" ).css( "display", "" );

	if ( waitingForPlayer )
	{
		$( "#gameArea .button" ).removeClass( "disabled" );
		$( "#waitingText" ).css( "display", "none" );
	}
	else
	{
		$( "#gameArea .button" ).addClass( "disabled" );
		$( "#waitingText" ).css( "display", "" );
	}
}

function SetupRoundHistory( a_gameObj )
{
	var playerTurnTemplate = "<div class='content player'><i class='hand :action icon'></i> " +
		"You played :action</div>";
	var opponentTurnTemplate = "<div class='content opponent'><i class='hand :action icon'></i> " +
		"Opponent played :action</div>";

	for ( var i = 0; i < a_gameObj.rounds.length; ++i )
	{
		if ( a_gameObj.rounds[ i ] == null || a_gameObj.rounds[ i ].turns.length == 0 )
			continue;

		var roundObj = $( "<div class='item'></div>" );

		// Make elements for each turn
		for ( var k = 0; k < a_gameObj.rounds[ i ].turns.length; ++k )
		{
			var turn = a_gameObj.rounds[ i ].turns[ k ];
			var turnObj;

			if ( turn.userId == _userid )
				turnObj = $( playerTurnTemplate.replace( /:action/g, ACTIONS[ turn.action ] ) );
			else
				turnObj = $( opponentTurnTemplate.replace( /:action/g, ACTIONS[ turn.action ] ) );

			if ( a_gameObj.rounds[ i ].winnerId == turn.userId )
				turnObj.addClass( "win" );

			roundObj.append( turnObj );
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

		$( "#roundList" ).append( roundObj );
	}
}


function SubmitTurn( a_action )
{
	if ( _currentGame == undefined )
		return;

	$( "#gameArea button" ).addClass( "loading" );

	$.ajax( {
		url: SERVER_ADDR + "api/submitTurn",
		method: "post",
		data: { sessionId: _session, gameId: _currentGame, action: a_action }
	} ).done(( a_response ) =>
	{
		$( "#gameArea button" ).removeClass( "loading" );
		$( "#gameArea button" ).addClass( "disabled" );

		SetupActiveGames();
		ShowGame( _currentGame );

	} ).fail(( a_err ) =>
	{
		$( "#gameArea button" ).removeClass( "loading" );

		console.warn( "Could not connect to API" );
		console.warn( a_err );
	} );
}


function ShowUsers()
{
	var template = "" +
		"<div class='item' data-userid=':userid'>" +
		"	<i class='large user middle aligned icon'></i>" +
		"	<div class='content'>" +
		"		<a class='header'>:opponent</a>" +
		"	</div>" +
		"</div>";

	$( "#showUsersButton" ).addClass( "loading" );

	$.ajax( {
		url: SERVER_ADDR + "api/users",
		method: "post",
		data: { sessionId: _session }
	} ).done(( a_response ) =>
	{
		if ( a_response.error == undefined )
		{
			// Clear game list and add a "back" button
			$( "#gamesList" ).html( "<button class='ui fluid mini button' onclick='SetupActiveGames()'>Back to games</button>" );

			for ( var i = 0; i < a_response.users.length; ++i )
			{
				var userObj = $( template
					.replace( ":userid", a_response.users[ i ].userId )
					.replace( ":opponent", a_response.users[ i ].username ) );

				userObj.on( "click", function ()
				{
					CreateGame( $( this ).data( "userid" ) );
				} );

				$( "#gamesList" ).append( userObj );
			}
		}
		else
		{

		}

		$( "#showUsersButton" ).removeClass( "loading" );
	} ).fail(( a_err ) =>
	{
		$( "#showUsersButton" ).removeClass( "loading" );

		console.warn( "Could not connect to API" );
		console.warn( a_err );
	} );
}


function CreateGame( a_opponentId )
{
	$.ajax( {
		url: SERVER_ADDR + "api/createGame",
		method: "post",
		data: { sessionId: _session, opponentId: a_opponentId }
	} ).done(( a_response ) =>
	{
		if ( a_response.error == undefined )
		{
			SetupActiveGames();
			ShowGame( a_response.gameId );
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


function SortGames( a, b )
{
	var aDate = new Date( a.lastUpdated );
	var bDate = new Date( b.lastUpdated );

	if ( aDate < bDate )
		return 1;
	if ( aDate > bDate )
		return -1;

	return 0;
}