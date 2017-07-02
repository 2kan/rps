$( document ).ready( function ()
{
	var sessionCookie = document.cookie.replace(/(?:(?:^|.*;\s*)sessionid\s*\=\s*([^;]*).*$)|^.*$/, "$1");
	if ( sessionCookie.length == 0 )
	{
		window.location.href = "login.html";
	}

} );


function Logout()
{
	document.cookie = "sessionid=";
	window.location.href = "login.html";
}