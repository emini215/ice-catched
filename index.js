var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);

// as this is a single-page application this is the only
// html-file that will be served
app.get("/", function(req, res) {
    res.sendFile(__dirname + "/index.html");
});

// set path for serving scripts and style
app.use("/scripts", express.static(__dirname + "/scripts"));
app.use("/style", express.static(__dirname + "/style"));

// history of drawn lines
var drawing_history = [];

// main function for handling connection to client
io.on("connection", function(socket) {
    console.log("New connection. "+ socket.id);
    // reactions on messages
    socket.on("nick", function(nick)	{   setNick(socket, nick)   });

    // send the history of all lines so that a client does not end up without
    // the lines drawn previous to the client's connection
    for (var line in drawing_history) {
        socket.emit("draw", JSON.stringify(drawing_history[line]));
    }

// set the user's nick
function setNick(socket, nick) {
    // TODO: send error
    if (nick == null || nick == "")
	return;

    // notify other users of change
    if (socket.nick == null) {
	// if the user has no previous nick it just joined
	// (or at least is considered so as no previous actions
	// has been possible)
	io.emit("msg", nick + " has joined,");
    } else {
	// otherwise notify of name-change
	io.emit("msg", socket.nick + " is now known as " + nick + ".");
    }

    // update nick
    socket.nick = nick;
};

    // nothing really needed for disconnections, yet at least
    socket.on("disconnect", function() {
        console.log("Disconnected.");
    });

    // send message all
    socket.on("msg", function(msg) {
       if (socket.nick == undefined)
	    return;
    
	console.log("Client says: " + msg);
	
        // send to everyone 
        io.emit("msg", socket.nick + ": " + msg);
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

