$( document ).ready( function ()
{
	$( "#loginButton" ).on( "click", function ()
	{
		console.log( "Sending authentication request." );

		$( this ).addClass( "loading" );

		var user = $( "#user" ).val();
		var pass = $( "#pass" ).val();

		$.ajax( {
			url: "http://localhost:3000/api/login",
			method: "post",
			data: { user: user, pass: pass }
		} ).done(( a_response ) =>
		{
			$( this ).removeClass( "loading" );

			if ( a_response.error == undefined )
			{
				document.cookie = "sessionid=" + a_response.sessionId;
				window.location.href = "index.html";
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
	} );
} );