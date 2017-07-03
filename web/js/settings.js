// Address of the API
// Format: Protocol + fully qualified domain name
// If running server on local machine, use http://localhost:3000/
const SERVER_ADDR = "http://localhost:3000/";

// Number of milliseconds before page gets game state from server
// Because rock paper scissors can be very asynchronous, a higher
// number can be used.
// It's recommended that an interval of 2 seconds or more is used
// in order to avoid spamming the API when it's not necessary.
const UPDATE_INTERVAL = 2000;