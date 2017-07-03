"use strict"

const logger = require( "./Logger.js" );
var _dbClient = require( "mariasql" );

module.exports = class DatabaseService
{
	constructor( a_dbObj )
	{
		if ( a_dbObj == undefined )
		{
			a_dbObj = {
				host: "127.0.0.1",
				user: "root",
				password: "Md#]+^L}#)Xn(m~94R",
				db: "rps"
			};
		}


		// Connect to db
		logger.info( "Establishing connection to database..." );
		this.dbCon = new _dbClient( a_dbObj );
	}

	query( a_query, a_callback )
	{
		this.dbCon.query( a_query, null, function ( a_err, a_rows )
		{
			if ( args.query.indexOf( "INSERT INTO" ) != -1 && a_err == undefined )
				a_callback( { id: a_rows.info.insertId } ); // Return ID of newly inserted row
			else
				a_callback( { err: a_err, rows: a_rows } ); // Return SQL output
		} );
	}

	queryPrepared( a_query, a_fields, a_callback )
	{
		var q = this.dbCon.prepare( a_query );

		this.dbCon.query( q( a_fields ), null, function ( a_err, a_rows )
		{
			if ( a_query.indexOf( "INSERT INTO" ) != -1 && a_err == undefined )
				a_callback( { id: a_rows.info.insertId } ); // Return ID of newly inserted row
			else
				a_callback( { err: a_err, rows: a_rows } ); // Return SQL output
		} );
	}

	// Checks if a given user ID exists in the database
	// Callback parameters: {err (error object), exists (bool)}
	UserIdExists( a_userId, a_callback )
	{
		this.queryPrepared( "SELECT * FROM t_users WHERE userId = :userId", { userId: a_userId },
			function ( a_response )
			{
				a_callback( { err: a_response.err, exists: a_response.rows.length == 1 } );
			}
		);
	}

	// Returns user details from the database for given user IDs
	// a_userIds	array of user Ids
	GetUsers( a_userIds, a_callback )
	{
		this.query( "SELECT * FROM t_users WHERE userId IN (" + a_userIds.join( ", " ) + ")",
			function ( a_response )
			{
				a_callback( { err: a_response.err, users: a_response.rows } );
			}
		);
	}
}