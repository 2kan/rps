const express = require("express");
const app = express();

app.use(express.static("./"));

app.listen(3001, function () {
  console.log("Listening on port 3001")
});