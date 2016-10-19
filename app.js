var express = require("express");
var app = express();
var http = require("http").Server(app);
var port = 3000;

// serve site
app.get("/", function(req, res) {
    res.sendFile(__dirname + "/client/index.html");
});

// set path for serving scripts and style
app.use("/scripts", express.static(__dirname + "/client/scripts"));
app.use("/style", express.static(__dirname + "/client/style"));


require("./server/index.js").listen(http);

module.exports = http.listen(port, function() {
    console.log("Listening on port " + port + ".");
});
