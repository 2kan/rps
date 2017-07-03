const express = require( "express" );
const app = express();

const PORT = 3000;
const TITLE = "RPS Server";
const VERSION = "0.1";

const SALTLENGTH = 64;

const logger = require( "./Logger.js" );

const crypto = require( "crypto" );

//const util = require( "./RequestUtils" );
//const errors = require( "./ApiError" );
//const Network = new ( require( "./Network" ) )();
const dbService = new ( require( "./DatabaseService.js" ) )();

// Create and use body parsers
var bodyParser = require( "body-parser" );
app.use( bodyParser.urlencoded( { extended: false } ) );
app.use( bodyParser.json() );


// Middleware to enable CORS
app.use( function ( a_req, a_res, a_next )
{
	if ( a_req.headers.origin )
		a_res.header( "Access-Control-Allow-Origin", a_req.headers.origin );

	a_next();
} );



// POST /api/login
//
// Required input
// + user (string)
// + pass (string)
//
// Returns session ID of new session and user ID of user
// + sessionId (string)
// + userId (number)
app.post( "/api/login", function ( a_req, a_res )
{
	var missingFields = GetMissingFields( a_req.body, [ "user", "pass" ] );
	if ( missingFields.length > 0 )
	{
		logger.verbose( "Attempted login from " + a_req.ip + " with missing fields: " + missingFields.join( ", " ) );

		a_res.status( 400 ).send( { error: "Missing fields: " + missingFields.join( ", " ) } );
		return;
	}

	dbService.queryPrepared( "SELECT * FROM t_users WHERE username = :username", { username: a_req.body.user },
		function ( a_result )
		{
			if ( a_result.err == undefined && a_result.rows.length > 0 )
			{
				var hash = crypto.createHash( "sha256" );
				hash.update( a_result.rows[ 0 ].passwordSalt + a_req.body.pass );

				// Check if submitted password matches password from database
				if ( hash.digest( "hex" ) == a_result.rows[ 0 ].passwordHash )
				{
					// Successfully authenticated

					// Create session for user
					var userId = a_result.rows[ 0 ].userId;
					CreateSession( userId, ( a_result ) =>
					{
						if ( a_result.err == undefined )
							a_res.send( { sessionId: a_result.sessionId, userId: userId } );
						else
						{
							a_res.status( 500 ).send( { error: "Could not create session." } );
							logger.warn( "Could not create session" );
							logger.warn( a_result.err );
						}
					} );

				}
				else
				{
					a_res.status( 400 ).send( { error: "Credentials invalid." } );
				}
			}
			else
			{
				a_res.status( 500 ).send( { error: "Login failed." } );
				logger.info( "Could not find user " + a_req.body.user );
				if ( a_result.err )
					logger.warning( a_result.err );
			}

		} );


} );


// POST /api/register
//
// Required input
// + user (string)
// + pass (string)
// + email (string)
//
// Returns "ok" if successful or error on failure
// + ok (bool)
app.post( "/api/register", function ( a_req, a_res )
{
	var missingFields = GetMissingFields( a_req.body, [ "user", "pass", "email" ] );
	if ( missingFields.length > 0 )
	{
		logger.verbose( "Attempted user registration from " + a_req.ip + " with missing fields: " + missingFields.join( ", " ) );

		a_res.status( 400 ).send( { error: "Missing fields: " + missingFields.join( ", " ) } );
		return;
	}

	var hash = crypto.createHash( "sha256" );
	var salt = GetRandomString( SALTLENGTH );

	hash.update( salt + a_req.body.pass );
	var saltedPass = hash.digest( "hex" );

	dbService.queryPrepared( "INSERT INTO t_users " +
		"(username, emailAddress, passwordHash, passwordSalt) VALUES " +
		"(:user, :email, :hash, :salt)", {
			user: a_req.body.user,
			email: a_req.body.email,
			hash: saltedPass,
			salt: salt
		}, function ( a_result )
		{
			if ( a_result.err == undefined )
			{
				// User added successfully
				a_res.send( { ok: true } );
			}
			else
			{
				a_res.status( 500 ).send( { error: a_result.err } );
				// TODO: change so that the db error isn't sent to the client
			}
		} );

} );


// POST /api/username
//
// Required input
// + username (string)
//
// Returns ok=true if username is not in use, ok=false if username is in use
// + ok (bool)
app.post( "/api/username", function ( a_req, a_res )
{
	var missingFields = GetMissingFields( a_req.body, [ "username" ] );
	if ( missingFields.length > 0 )
	{
		logger.verbose( "Attempted username validation from " + a_req.ip + " with missing fields: " + missingFields.join( ", " ) );

		a_res.status( 400 ).send( { error: "Missing fields: " + missingFields.join( ", " ) } );
		return;
	}

	logger.verbose( "Check on username '" + a_req.body.username + "' from IP " + a_req.ip );

	dbService.queryPrepared( "SELECT * FROM t_users WHERE username = :username",
		{ username: a_req.body.username },
		function ( a_result )
		{
			if ( a_result.err == undefined )
			{
				// User added successfully
				a_res.send( { ok: a_result.rows.length == 0 } );
			}
			else
			{
				a_res.status( 500 ).send( { error: a_result.err } );
			}
		}
	);

} );


// POST /api/users
//
// Required input
// + sessionId (string)
//
// Returns list of users (limited to 50) who have logged in recently
// + ok (bool)
// + users [
//		+ userId (number)
//		+ username (string)
// ]
app.post( "/api/users", function ( a_req, a_res )
{
	// TODO: Have the parameter checking be managed in a function
	var missingFields = GetMissingFields( a_req.body, [ "sessionId" ] );
	if ( missingFields.length > 0 )
	{
		logger.verbose( "Attempted retrieval of games list from " + a_req.ip + " with missing fields: " + missingFields.join( ", " ) );

		a_res.status( 400 ).send( { error: "Missing fields: " + missingFields.join( ", " ) } );
		return;
	}

	// Get the user ID from the submitted session ID
	dbService.queryPrepared( "SELECT * FROM t_sessions WHERE hash = :sessionid", {
		sessionid: a_req.body.sessionId
	}, function ( a_result )
		{
			// Check if there were any errors or if more/less than one entry was returned
			if ( a_result.err != undefined )
			{
				a_res.status( 500 ).send( { error: a_result.err } );
				return;
			}
			else if ( a_result.rows.length != 1 )
			{
				a_res.status( 400 ).send( { error: "Not authorised." } );
				return;
			}

			var userId = a_result.rows[ 0 ].userId;

			dbService.queryPrepared( "SELECT username, userId FROM t_users WHERE userId != :userId",
				{ userId: userId }, function ( a_result )
				{
					a_res.send( { ok: true, users: a_result.rows } );
				}
			);
		}
	);
} );


// POST /api/createGame
//
// Required input
// + sessionId (string)
// + opponentId (number)
//
// Returns id of newly created game
// + ok (bool)
// + gameId (number)
app.post( "/api/createGame", function ( a_req, a_res )
{
	// TODO: Have the parameter checking be managed in a function
	var missingFields = GetMissingFields( a_req.body, [ "sessionId", "opponentId" ] );
	if ( missingFields.length > 0 )
	{
		logger.verbose( "Attempted creation of game from " + a_req.ip + " with missing fields: " + missingFields.join( ", " ) );

		a_res.status( 400 ).send( { error: "Missing fields: " + missingFields.join( ", " ) } );
		return;
	}

	// Get the user ID from the submitted session ID
	dbService.queryPrepared( "SELECT * FROM t_sessions WHERE hash = :sessionid", {
		sessionid: a_req.body.sessionId
	}, function ( a_result )
		{
			// Check if there were any errors or if more/less than one entry was returned
			if ( a_result.err != undefined )
			{
				a_res.status( 500 ).send( { error: a_result.err } );
				return;
			}
			else if ( a_result.rows.length != 1 )
			{
				a_res.status( 400 ).send( { error: "Not authorised." } );
				return;
			}

			var userId = a_result.rows[ 0 ].userId;
			var opponentId = a_req.body.opponentId;

			logger.verbose( "Creating game for player ID %s against opponent ID %s", userId, opponentId );

			dbService.UserIdExists( opponentId, function ( a_result )
			{
				if ( a_result.err != undefined )
				{
					a_res.status( 500 ).send( { error: a_result.err } );
					return;
				}

				dbService.queryPrepared( "INSERT INTO t_games " +
					"(playerOneId, playerTwoId) VALUES (:userId, :opponentId)",
					{ userId: userId, opponentId: opponentId },
					function ( a_result )
					{
						a_res.send( { ok: true, gameId: a_result.id } );
					}
				);
			} );
		}
	);
} );



// POST /api/games
//
// Required input
// + sessionId
//
// Returns list of games that the user is involved in
// + games [
// 		+ gameId (number)
// 		+ timeStarted (string)
// 		+ lastUpdated (string)
// 		+ playerOneId (number)
// 		+ playerTwoId (number)
// 		+ opponentName (string)
// 		+ opponentId (number)
// 		+ winnerId (number)
// 		+ currentRound {
// 			+ roundId (number)
// 			+ playerOneTurnId (number)
// 			+ playerTwoTurnId (number)	
//		}
// ]
app.post( "/api/games", function ( a_req, a_res )
{
	// TODO: Have the parameter checking be managed in a function
	var missingFields = GetMissingFields( a_req.body, [ "sessionId" ] );
	if ( missingFields.length > 0 )
	{
		logger.verbose( "Attempted retrieval of games list from " + a_req.ip + " with missing fields: " + missingFields.join( ", " ) );

		a_res.status( 400 ).send( { error: "Missing fields: " + missingFields.join( ", " ) } );
		return;
	}

	// Get the user ID from the submitted session ID
	dbService.queryPrepared( "SELECT * FROM t_sessions WHERE hash = :sessionid", {
		sessionid: a_req.body.sessionId
	}, function ( a_result )
		{
			// Check if there were any errors or if more/less than one entry was returned
			if ( a_result.err != undefined )
			{
				a_res.status( 500 ).send( { error: a_result.err } );
				return;
			}
			else if ( a_result.rows.length != 1 )
			{
				a_res.status( 400 ).send( { error: "Not authorised." } );
				return;
			}

			var userId = a_result.rows[ 0 ].userId;

			// I could filter the below from the console (and include in the log file if needed)
			// but it's barely useful for debugging anyway
			//logger.verbose( "User " + userId + " fetching games list" );

			dbService.queryPrepared( "SELECT * FROM t_games WHERE (t_games.playerOneId = :id OR t_games.playerTwoId = :id)", {
				id: userId
			}, function ( a_result )
				{
					// Create the response object
					var res = {
						games: [],
					};

					var gamesLoaded = 0;
					var roundsLoaded = 0;
					for ( var i = 0; i < a_result.rows.length; ++i )
					{
						var game = a_result.rows[ i ];
						var opponentId = ( game.playerOneId == userId ) ? game.playerTwoId : game.playerOneId;

						dbService.queryPrepared( "SELECT userid, username FROM t_users WHERE userid = :opponentid", {
							opponentid: opponentId
						}, ( a_opponentResult ) =>
							{

								dbService.queryPrepared( "SELECT playerOneTurnId, playerTwoTurnId FROM t_rounds WHERE roundId = :roundId", {
									roundId: a_result.rows[ roundsLoaded ].currentRoundId
								}, ( a_roundResult ) =>
									{
										var thisGame = a_result.rows[ gamesLoaded ];

										var currentRound;
										if ( thisGame.currentRoundId == null )
											currentRound = {
												roundId: thisGame.currentRoundId,
												playerOneTurnId: undefined,
												playerTwoTurnId: undefined
											};
										else
											currentRound = {
												roundId: thisGame.currentRoundId,
												playerOneTurnId: a_roundResult.rows[ 0 ].playerOneTurnId,
												playerTwoTurnId: a_roundResult.rows[ 0 ].playerTwoTurnId
											};


										res.games[ res.games.length ] = {
											gameId: thisGame.gameId,
											timeStarted: thisGame.dateAdded,
											lastUpdated: thisGame.dateUpdated,
											playerOneId: thisGame.playerOneId,
											playerTwoId: thisGame.playerTwoId,
											opponentName: a_opponentResult.rows[ 0 ].username,
											opponentId: a_opponentResult.rows[ 0 ].userid,
											winnerId: thisGame.winnerId,
											currentRound: currentRound
										};

										++gamesLoaded;

										// Because this is all done asynchronously, the below ensures
										// that the response isn't sent until all games have been set
										if ( gamesLoaded == a_result.rows.length )
										{
											a_res.send( { ok: true, games: res.games } );
										}
									}
								);

								++roundsLoaded;
							}
						);
					}
				} // One hell of a scope pyramid
			); // Thanks node.js
		}
	);

} );


// POST /api/game
//
// Required input
// + sessionId
// + gameId
//
// Returns game details and all rounds and turns for that game
// + games [
//		+ gameId
//		+ playerOneId
//		+ playerTwoId
//		+ lastUpdated
//		+ timeStarted
//		+ winnerId
//		+ currentRoundId
//		+ rounds [
//			{
//				+ roundId
//				+ winnerId
//				+ dateUpdated
//				+ rows [
//					{
//						+ turnId
//						+ roundId
//						+ userId
//						+ action
//						+ dateAdded
//					}
//				]
//			}
//		]
// ]
app.post( "/api/game", function ( a_req, a_res )
{
	// TODO: Have the parameter checking be managed in a function
	var missingFields = GetMissingFields( a_req.body, [ "sessionId", "gameId" ] );
	if ( missingFields.length > 0 )
	{
		logger.verbose( "Attempted retrieval of a game from " + a_req.ip + " with missing fields: " + missingFields.join( ", " ) );

		a_res.status( 400 ).send( { error: "Missing fields: " + missingFields.join( ", " ) } );
		return;
	}

	// Get the user ID from the submitted session ID
	dbService.queryPrepared( "SELECT * FROM t_sessions WHERE hash = :sessionid", {
		sessionid: a_req.body.sessionId
	}, function ( a_result )
		{
			// Check if there were any errors or if more/less than one entry was returned
			if ( a_result.err != undefined )
			{
				a_res.status( 500 ).send( { error: a_result.err } );
				return;
			}
			else if ( a_result.rows.length != 1 )
			{
				a_res.status( 400 ).send( { error: "Not authorised." } );
				return;
			}

			var userId = a_result.rows[ 0 ].userId;

			logger.info( "User " + userId + " requested game info for game " + a_req.body.gameId );

			dbService.queryPrepared( "SELECT * FROM t_games WHERE gameId = :gameid", {
				gameid: a_req.body.gameId
			}, function ( a_result )
				{
					if ( a_result.rows.length != 1 )
					{
						a_res.status( 400 ).send( { error: "Game not found." } );
						return;
					}

					// Check that the user has access to the specified game
					if ( a_result.rows[ 0 ].playerOneId != userId && a_result.rows[ 0 ].playerTwoId != userId )
					{
						a_res.status( 403 ).send( { error: "Permission deined." } );
						return;
					}

					var game = a_result.rows[ 0 ];
					var res = {
						gameId: game.gameId,
						playerOneId: game.playerOneId,
						playerTwoId: game.playerTwoId,
						lastUpdated: game.dateUpdated,
						timeStarted: game.dateAdded,
						roundCount: game.roundCould,
						winnerId: game.winnerId,
						currentRoundId: game.currentRoundId,
						rounds: []
					};

					// Check that this game is in progress
					if ( game.currentRoundId != null )
					{
						dbService.queryPrepared( "SELECT * FROM t_rounds WHERE gameId = :gameid", { gameid: game.gameId },
							( a_roundResult ) =>
							{

								var roundsComplete = 0;
								for ( var i = 0; i < a_roundResult.rows.length; ++i )
								{
									var round = a_roundResult.rows[ i ];

									res.rounds[ i ] = {
										roundId: round.roundId,
										winnerId: round.winnerId,
										dateUpdated: round.dateUpdated
									}

									GetTurns( round.roundId, i, ( a_index, a_turns ) =>
									{
										res.rounds[ a_index ].turns = a_turns;
										++roundsComplete;

										if ( roundsComplete == a_roundResult.rows.length )
										{
											a_res.send( { ok: true, game: res } );
										}
									} );
								}
							}
						);
					}
					else
					{
						// This is a new game, send empty data
						a_res.send( { ok: true, game: res } );
					}
				} // One hell of a scope pyramid
			); // Thanks node.js
		}
	);

} );


// POST /api/submitTurn
//
// Required input
// + sessionId
// + gameId
// + action
//
// Returns game details and all rounds and turns for that game
// TODO: return data summary
app.post( "/api/submitTurn", function ( a_req, a_res )
{
	// TODO: Have the parameter checking be managed in a function
	var missingFields = GetMissingFields( a_req.body, [ "sessionId", "gameId", "action" ] );
	if ( missingFields.length > 0 )
	{
		logger.verbose( "Attempted login from " + a_req.ip + " with missing fields: " + missingFields.join( ", " ) );

		a_res.status( 400 ).send( { error: "Missing fields: " + missingFields.join( ", " ) } );
		return;
	}

	// Get the user ID from the submitted session ID
	dbService.queryPrepared( "SELECT * FROM t_sessions WHERE hash = :sessionid", {
		sessionid: a_req.body.sessionId
	}, function ( a_result )
		{
			// Check if there were any errors or if more/less than one entry was returned
			if ( a_result.err != undefined )
			{
				a_res.status( 500 ).send( { error: a_result.err } );
				return;
			}
			else if ( a_result.rows.length != 1 )
			{
				a_res.status( 400 ).send( { error: "Not authorised." } );
				return;
			}

			var userId = a_result.rows[ 0 ].userId;

			logger.info( "User " + userId + " submitting action " + a_req.body.action + " for game " + a_req.body.gameId );

			dbService.queryPrepared( "SELECT * FROM t_games WHERE gameId = :gameid", {
				gameid: a_req.body.gameId
			}, ( a_result ) =>
				{
					var game = a_result.rows[ 0 ];

					// Check that the user has access to the specified game
					if ( game.playerOneId != userId && game.playerTwoId != userId )
					{
						a_res.status( 403 ).send( { error: "Permission deined." } );
						return;
					}

					// Check if game is already complete
					if ( game.winnerId != 0 )
					{
						a_res.status( 400 ).send( { error: "Game already finished." } );
					}

					// Get current incomplete turn
					// Submit turn
					// Check if winner

					dbService.queryPrepared( "SELECT * FROM t_rounds WHERE gameId = :gameid", { gameid: game.gameId },
						( a_roundResult ) =>
						{
							var addedTurn = false;

							var playerNumber = ( game.playerOneId == userId ) ? "playerOne" : "playerTwo";
							var opponentNumber = ( game.playerOneId != userId ) ? "playerOne" : "playerTwo";
							var opponentId = ( game.playerOneId == userId ) ? game.playerTwoId : game.playerOneId;

							// Check if there's a round that is still in progress
							// If there is, add the turn
							for ( var i = 0; i < a_roundResult.rows.length; ++i )
							{
								var round = a_roundResult.rows[ i ];

								// Skip if this round has been completed
								if ( round.winnerId != 0 && round.winnerId != null )
									continue;

								// TODO
								// - Check if the round is completed
								// - If it is, add a new round if there is no game winner
								// - If it's not, add a new turn and calculate the winner (if necessary)

								addedTurn = true;
								logger.info( "Round " + round.roundId + " is currently in progress, submitting turn" );

								// Add a new turn
								SubmitTurn( round.roundId, userId, a_req.body.action, ( a_addTurnResult ) =>
								{
									// Get the opponent's turn to check who won
									dbService.queryPrepared( "SELECT * FROM t_turns WHERE userId = :opponentId AND roundId = :roundId",
										{ opponentId: opponentId, roundId: round.roundId },
										( a_turnResult ) =>
										{
											console.log( a_turnResult );
											var opponentAction = a_turnResult.rows[ 0 ].action;

											var winnerId = -1; // Set winner to -1 (a "draw") here so we don't
											// have to check for a draw when finding the winner

											logger.verbose( "Resolving winner. PlayerOne %j, PlayerTwo %j", { id: userId, action: a_req.body.action }, { id: opponentId, action: opponentAction } );
											switch ( a_req.body.action )
											{
												case "0": // Rock
													if ( opponentAction == 2 ) // Scissors
														winnerId = userId;
													if ( opponentAction == 1 ) // Paper
														winnerId = opponentId;
													break;

												case "1": // Paper
													if ( opponentAction == 0 ) // Rock
														winnerId = userId;
													if ( opponentAction == 2 ) // Scissors
														winnerId = opponentId;
													break;

												case "2": // Scissors
													if ( opponentAction == 1 ) // Paper
														winnerId = userId;
													if ( opponentAction == 0 ) // Rock
														winnerId = opponentId;
													break;
												default:
													console.log( "blep" );
											}

											// Check if there's a game winner
											var playerWins = GetWinsFromRounds( userId, a_roundResult.rows );
											var opponentWins = GetWinsFromRounds( opponentId, a_roundResult.rows );

											if ( winnerId == userId )
												++playerWins;
											if ( winnerId == opponentId )
												++opponentWins;

											logger.info( "Checking for game winner. Player: " + playerWins + ", opponent: " + opponentWins );

											if ( playerWins >= 3 || opponentWins >= 3 )
											{
												logger.info( "A victor has been decided" );
												// There's a winner, update db
												dbService.queryPrepared( "UPDATE t_games SET winnerId = :winnerId WHERE gameId = :gameId",
													{ winnerId: winnerId, gameId: game.gameId },
													function ( a_result ) { }
												);

												var loserId = ( winnerId == userId ) ? opponentId : userId;

												///////////////////////////////////////////////////////////////
												// Calculate Elo score and update win/loss counter
												///////////////////////////////////////////////////////////////
												dbService.GetUsers( [ userId, opponentId ], ( a_usersResponse ) =>
												{
													var playerProfile = ( a_usersResponse.users[ 0 ].userId == userId ) ? a_usersResponse.users[ 0 ] : a_usersResponse.users[ 1 ];
													var opponentProfile = ( a_usersResponse.users[ 0 ].userId == opponentId ) ? a_usersResponse.users[ 0 ] : a_usersResponse.users[ 1 ];

													playerProfile = ConvertProfileIntegers( playerProfile );
													opponentProfile = ConvertProfileIntegers( opponentProfile );

													// Add to local win/loss counters
													if ( winnerId == userId )
													{
														playerProfile.wins++;
														opponentProfile.losses++;
													}
													else
													{
														playerProfile.losses++;
														opponentProfile.wins++;
													}

													// Calculate new Elo scores
													var playerNewTotalOpponentElo = playerProfile.totalOpponentElo + opponentProfile.elo;
													var opponentNewTotalOpponentElo = opponentProfile.totalOpponentElo + playerProfile.elo;

													var playerNewElo = ( playerNewTotalOpponentElo + ( 400 * ( playerProfile.wins - playerProfile.losses ) ) ) / ( playerProfile.wins + playerProfile.losses );
													var opponentNewElo = ( opponentNewTotalOpponentElo + ( 400 * ( opponentProfile.wins - opponentProfile.losses ) ) ) / ( opponentProfile.wins + opponentProfile.losses );

													//logger.verbose( "PlayerElo " + playerNewElo );
													//logger.verbose( "OpponenetElo " + opponentNewElo );

													// The below is necessary to avoid unecessary database access
													// I know it's ugly
													if ( winnerId == userId )
													{
														// Update winner (user)
														dbService.queryPrepared( "UPDATE t_users SET wins = wins + 1, elo = :elo, totalOpponentElo = :totalOpponentElo WHERE userId = :winnerId",
															{ winnerId: userId, elo: playerNewElo, totalOpponentElo: playerNewTotalOpponentElo },
															function ( a_result ) { if ( a_result.err != undefined ) { logger.warn( a_result.err ); } } );

														// Update loser (opponent)
														//var loserId = ( winnerId == userId ) ? opponentId : userId;
														dbService.queryPrepared( "UPDATE t_users SET losses = losses + 1, elo = :elo, totalOpponentElo = :totalOpponentElo WHERE userId = :loserId",
															{ loserId: opponentId, elo: opponentNewElo, totalOpponentElo: opponentNewTotalOpponentElo },
															function ( a_result ) { if ( a_result.err != undefined ) { logger.warn( a_result.err ); } } );
													}
													else
													{
														// Update winner (opponent)
														dbService.queryPrepared( "UPDATE t_users SET wins = wins + 1, elo = :elo, totalOpponentElo = :totalOpponentElo WHERE userId = :winnerId",
															{ winnerId: opponentId, elo: opponentNewElo, totalOpponentElo: opponentNewTotalOpponentElo },
															function ( a_result ) { if ( a_result.err != undefined ) { logger.warn( a_result.err ); } } );

														// Update loser (user)
														//var loserId = ( winnerId == userId ) ? opponentId : userId;
														dbService.queryPrepared( "UPDATE t_users SET losses = losses + 1, elo = :elo, totalOpponentElo = :totalOpponentElo WHERE userId = :loserId",
															{ loserId: userId, elo: playerNewElo, totalOpponentElo: playerNewTotalOpponentElo },
															function ( a_result ) { if ( a_result.err != undefined ) { logger.warn( a_result.err ); } } );
													}
												} );
											}

											logger.info( "Updating round results" );
											dbService.queryPrepared( "UPDATE t_rounds SET " + playerNumber + "TurnId = :turnId, winnerId = :winnerId WHERE roundId = :roundId",
												{ turnId: a_addTurnResult.id, winnerId: winnerId, roundId: round.roundId },
												function ( a_result )
												{
													a_res.send( { ok: true } );
													return;
												}
											);
										}
									);
								} );

								// Only one turn should be updated, so end the loop here
								break;
							}

							// Check if the turn was added already (this happens when 
							// there was a turn in progress)
							if ( !addedTurn )
							{
								logger.info( "No unfinished rounds found, adding new one" );

								// Turn hasn't been added, create a new round and add the player's turn
								StartNewRound( game.gameId, ( a_roundResult ) =>
								{

									SubmitTurn( a_roundResult.id, userId, a_req.body.action, ( a_addTurnResult ) =>
									{
										dbService.queryPrepared( "UPDATE t_rounds SET " + playerNumber + "TurnId = :turnId WHERE roundId = :roundId",
											{ turnId: a_addTurnResult.id, roundId: a_roundResult.id },
											function ( a_result )
											{
												a_res.send( { ok: true } );
												return;
											}
										);
									} );
								} );
							}
						}
					);
				} // One hell of a scope pyramid
			); // Thanks node.js
		}
	);

} );


app.listen( PORT, function ()
{
	logger.info( "%s v%s started on port %d", TITLE, VERSION, PORT );
} );

function GetRandomString( a_length )
{
	var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`~!@#$%^&*()-_=+[]{},.<>?";
	var out = "";

	for ( var i = 0; i < a_length; ++i )
	{
		out += chars[ Math.floor( Math.random() * chars.length ) ];
	}

	return out;
}

function GetMissingFields( a_haystack, a_needles )
{
	var missingFields = [];
	for ( var i = 0; i < a_needles.length; ++i )
	{
		if ( !a_haystack[ a_needles[ i ] ] )
			missingFields[ missingFields.length ] = a_needles[ i ];
	}

	return missingFields;
}

function CreateSession( a_userId, a_callback )
{
	var hash = crypto.createHash( "sha256" );
	hash.update( a_userId + ( new Date() + "" ) );
	var session = hash.digest( "hex" );

	dbService.queryPrepared( "INSERT INTO t_sessions " +
		"(userId, hash) VALUES " +
		"(:userId, :session)", { userId: a_userId, session: session },
		function ( a_result )
		{
			if ( a_result.err != undefined )
			{
				a_callback( { err: a_result.err } );
				return;
			}

			a_callback( { sessionId: session } );
		} );

	// TODO: void all previous sessions from user
}


function GetTurns( a_roundId, a_responseIndex, a_callback )
{
	dbService.queryPrepared( "SELECT * FROM t_turns WHERE roundId = :roundid", { roundid: a_roundId },
		( a_turnResults ) =>
		{
			a_callback( a_responseIndex, a_turnResults.rows );
		}
	);
}


function SubmitTurn( a_round, a_userId, a_action, a_callback )
{
	// Add new turn
	dbService.queryPrepared( "INSERT INTO t_turns " +
		"(roundId, userId, action) VALUES (:roundId, :userId, :action)",
		{ roundId: a_round, userId: a_userId, action: a_action },
		( a_turnResult ) =>
		{
			a_callback( a_turnResult );
		}
	);
}

function StartNewRound( a_gameId, a_callback )
{
	// Create round
	dbService.queryPrepared( "INSERT INTO t_rounds (gameId) VALUES (:gameId)",
		{ gameId: a_gameId },
		( a_roundResult ) =>
		{
			logger.info( "Added new round with ID " + a_roundResult.id );
			// Update game record
			dbService.queryPrepared( "UPDATE t_games SET currentRoundId = :roundId, roundCount = roundCount + 1 WHERE gameId = :gameId",
				{ roundId: a_roundResult.id, gameId: a_gameId },
				( a_gameResult ) =>
				{
					a_callback( a_roundResult );
				}
			);
		}
	);
}


function GetWinsFromRounds( a_userId, a_roundsDBRows )
{
	logger.verbose( "Checking wins for " + a_userId );
	var wins = 0;
	for ( var i = 0; i < a_roundsDBRows.length; ++i )
	{
		//logger.verbose( "Round " + a_roundsDBRows[ i ].roundId + " winner is " + a_roundsDBRows[ i ].winnerId );
		if ( a_roundsDBRows[ i ].winnerId == a_userId )
			++wins;
	}

	return wins;
}


// Given a user profile (full output of a user from t_users), converts strings to integers
// where necessary (SQL queries return integers as strings :/ )
function ConvertProfileIntegers( a_profile )
{
	a_profile.wins = parseInt( a_profile.wins );
	a_profile.losses = parseInt( a_profile.losses );
	a_profile.elo = parseInt( a_profile.elo );
	a_profile.totalOpponentElo = parseInt( a_profile.totalOpponentElo );
	a_profile.extraLives = parseInt( a_profile.extraLives );

	return a_profile;
}