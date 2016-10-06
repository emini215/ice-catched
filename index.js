var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);

app.get("/", function(req, res) {
    res.sendFile(__dirname + "/index.html");
});

app.use("/styles", express.static(__dirname + "/styles"));
app.use("/scripts", express.static(__dirname + "/scripts"));

// history of drawn lines
var drawing_history = [];

io.on("connection", function(socket) {
    console.log("New connection. "+ socket.id);

    // send the history of all lines so that a client does not end up without
    // the lines drawn previous to the client's connection
    for (var line in drawing_history) {
        socket.emit("draw", JSON.stringify(drawing_history[line]));
    }

    // nothing really needed for disconnections, yet at least
    socket.on("disconnect", function() {
        console.log("Disconnected.");
    });

    // send message all
    socket.on("msg", function(msg) {
        console.log("Client says: " + msg);
        
        // send to everyone 
        io.emit("msg", "SOMeONE SAID: " + msg);
    });

    // send the necessary data for drawing lines
    socket.on("draw", function(data) {
        // save it history
        drawing_history.push(JSON.parse(data));

	// TODO: Verify contents
	// otherwise might be able to send stuff to clients

	// send to all but the drawer who already drew it.
        socket.broadcast.emit("draw", data);
    });

    socket.on("undo", function() {
        // remove the last element
        drawing_history.splice(-1, 1);

        // TODO: clear clients and send lines again
        // or save in clients and send undo
    });

});

http.listen(3000, function() {
    console.log("Listening on port 3000.");
});

