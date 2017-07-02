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
					CreateSession( a_result.rows[ 0 ].userId, ( a_result ) =>
					{
						if ( a_result.err == undefined )
							a_res.send( { sessionId: a_result.sessionId } );
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
}