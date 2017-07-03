$( document ).ready( function ()
{
	$( "#loginButton" ).on( "click", Login );

	SetupRegisterForm();
} );

function Login()
{
	console.log( "Sending authentication request." );

	$( "#loginButton" ).addClass( "loading" );

	var user = $( "#user" ).val();
	var pass = $( "#pass" ).val();

	$.ajax( {
		url: SERVER_ADDR + "api/login",
		method: "post",
		data: { user: user, pass: pass }
	} ).done(( a_response ) =>
	{
		$( "#loginButton" ).removeClass( "loading" );

		if ( a_response.error == undefined )
		{
			document.cookie = "sessionid=" + a_response.sessionId;
			document.cookie = "userid=" + a_response.userId;
			window.location.href = "index.html";
		}
		else
		{

		}
	} ).fail(( a_err ) =>
	{
		$( "#loginButton" ).removeClass( "loading" );

		console.warn( "Could not connect to API" );
		console.warn( a_err );
	} );
}

function ShowRegisterModal()
{
	$( "#registerModal" ).modal( "show" );
}

function SetupRegisterForm()
{
	// Create custom validation rule to check if username is available
	$.fn.form.settings.rules.usernameAvailable = function ( a_value )
	{
		var valid = false;
		if ( a_value.length == 0 )
			return false;

		$.ajax( {
			async: false,
			url: SERVER_ADDR + "api/username",
			method: "post",
			data: { username: a_value },
			success: ( a_response ) =>
			{
				console.log( a_response );
				valid = a_response.ok;
			}
		} );

		return valid;
	};

	// Setup validation
	$( "#registerForm" ).form( {
		fields: {
			user: {
				identifier: "user",
				rules: [
					{
						type: "empty",
						prompt: "Please enter a username"
					},
					{
						type: "usernameAvailable",
						prompt: "Username not available"
					}
				]
			},
			email: {
				identifier: "email",
				rules: [
					{
						type: "empty",
						prompt: "Please enter your email address"
					},
					{
						type: "email",
						prompt: "Please enter a valid email address"
					}
				]
			},
			pass: {
				identifier: "pass",
				rules: [
					{
						type: "empty",
						prompt: "Please enter a password"
					},
					{
						type: "minLength[6]",
						prompt: "Your password must be at least {ruleValue} characters"
					}
				]
			}
		},
		onSuccess: function ( a_event )
		{
			$( "#registerForm" ).addClass( "loading" );

			var user = $( "#userReg" ).val();
			var pass = $( "#passReg" ).val();
			var email = $( "#emailReg" ).val();

			// Send registration request over AJAX
			$.ajax( {
				url: SERVER_ADDR + "api/register",
				method: "post",
				data: { user: user, pass: pass, email: email }
			} ).done(( a_response ) =>
			{
				if ( a_response.error == undefined && a_response.ok == true )
				{
					// Registration successful
					// Put user's username and password into the login form and submit it
					$( "#user" ).val( user );
					$( "#pass" ).val( pass );
					Login();
				}
				else
				{
					$( "#registerForm" ).removeClass( "loading" );
					$( "#userReg" ).val( "" );
					$( "#passReg" ).val( "" );
					$( "#emailReg" ).val( "" );

					$( "#registerForm .error" ).text( "Error during registration. Please contact site owner. " + new Date() );
				}
			} ).fail(( a_err ) =>
			{
				$( "#registerForm" ).removeClass( "loading" );

				console.warn( "Could not connect to API" );
				console.warn( a_err );
			} );

			a_event.preventDefault();
		}
	} );
}