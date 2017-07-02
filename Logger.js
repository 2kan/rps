// Required npm packages:
// 		winston
// 		winston-daily-rotate-file
//
// Install with:
// 		npm install winston winston-daily-rotate-file --save
//
// Include in a file with:
// 		const logger = require( "./Logger.js" );

// Setup logger
const winston = require( 'winston' );

const fs = require( 'fs' );
const env = process.env.NODE_ENV || 'dev';
const logDir = "log";
const timeFormat = () => ( new Date() ).toLocaleTimeString();

// Create log directory if it doesn't exist
if ( !fs.existsSync( logDir ) )
{
	fs.mkdirSync( logDir );
}

const logger = new ( winston.Logger )( {
	transports: [
		new ( winston.transports.Console )( {
			timestamp: timeFormat,
			colorize: true,
			level: "silly"
		}),

		new ( require('winston-daily-rotate-file') )( {
			filename: `${logDir}/-application.log`,
			timestamp: timeFormat,
			datePattern: 'yyyy-MM-dd',
			prepend: true,
			level: env === 'dev' ? 'debug' : 'info'
		})
	]
});

module.exports = logger;