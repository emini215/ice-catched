var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);

app.get("/", function(req, res) {
    res.sendFile(__dirname + "/index.html");
});

app.use("/styles", express.static(__dirname + "/styles"));
app.use("/scripts", express.static(__dirname + "/scripts"));

io.on("connection", function(socket) {
    console.log("New connection.");
    console.log(socket);
    
    // nothing really needed for disconnections, yet at least
    socket.on("disconnect", function() {
        console.log("Disconnected.");
    });

    socket.on("draw", function(x, y) {
        console.log("fill " + x + "," + y);
    });

});

http.listen(3000, function() {
    console.log("Listening on port 3000.");
});

