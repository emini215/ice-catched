var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);

// port used to serve files
var PORT = 3000;

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
var drawing_order = [];
var active_drawer = null;

// main function for handling connection to client
io.on("connection", function(socket) {
    console.log("New connection: " + socket.id);

    // send the drawing history to the new user so that the user
    // does not miss all drawing before the time of joining
    sendHistory(socket);

    // reactions on messages
    socket.on("help", function(data)	{   helpPage(data)	    });
    socket.on("nick", function(nick)	{   setNick(socket, nick)   });
    socket.on("list", function()	{   list(socket)	    });
    socket.on("active", function()	{   active(socket)	    });
    socket.on("msg", function(msg)	{   messageAll(socket, msg) });
    socket.on("draw", function(data)	{   draw(socket, data)	    });
    socket.on("undo", function()	{   undo(socket)	    });
    socket.on("clear", function()	{   clear(socket)	    });

    // if the user was identified let other use know of disconnection
    // otherwise ignore as the user has gone by unnoticed
    socket.on("disconnect", function() {
	if (socket.nick == null)
	    return;

	// remove socket from list of drawers
	drawing_order = drawing_order.filter(function(e) { 
	    return e !== socket.id 
	});
	console.log(drawing_order);
	// TODO: change active if active

        // let other clients know that user has disconnected
	console.log(socket.nick + " has disconnected.");
	io.emit("msg", socket.nick + " has disconnected.");
    });

});

// send drawing history to socket
function sendHistory(socket) {
    // send the history of all lines so that a client does not end up without
    // the lines drawn previous to the client's connection
    for (var line in drawing_history) {
        socket.emit("draw", JSON.stringify(drawing_history[line]));
    }
};

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
	io.emit("msg", nick + " has joined.");

	// add client to list of drawers
	drawing_order.push(socket.id);

	// start drawing game if 2 players or more
	if (drawing_order.length > 1) {
	    active_drawer = drawing_order[0];

	    // send to drawer first
	    io.to(active_drawer).emit("active");
	    // then to everyone else
	    var active_socket = io.sockets.connected[active_drawer];
	    active_socket.broadcast.emit("active", active_socket.nick);
	}

    } else {
	// otherwise notify of name-change
	io.emit("msg", socket.nick + " is now known as " + nick + ".");
    }

    // update nick
    socket.nick = nick;
};

// message all users
function messageAll(socket, message) {
    if (socket.nick == null)
	return;

    // send to everyone 
    io.emit("msg", socket.nick + ": " + message);
    console.log(socket.nick + ": " + message);
};

function draw(socket, data) {
    // verify user
    if (socket.id != active_drawer)
	return;

    // save it history
    drawing_history.push(JSON.parse(data));

    // TODO: Verify contents
    // otherwise might be able to send stuff to clients

    // send to all but the drawer who already drew it.
    socket.broadcast.emit("draw", data);
};

function list(socket) {

    // create list of all users' nick
    var users = [];
    drawing_order.forEach(function(e) {
	// retrieve nick from socket.id
	users.push(io.sockets.connected[e].nick);
    });

    // send list to user
    socket.emit("list", users);
}

function clear(socket) {
    if (socket.id != active_drawer) 
	return;

    // send clear-message
    io.emit("clear");
};

function active(socket) {
    // send along nick only if the drawer is not the receiver
    if (socket.id == active_drawer) 
	socket.emit("active");
    else 
        socket.emit("active", io.sockets.connected[active_drawer].nick);
};

function undo(socket) {
    // only allow verified users to undo
    if (socket.id != active_drawer)
        return;

    // remove the last element
    var strokeEnd = findStrokeEnd(drawing_history);
    if (strokeEnd != null)
	drawing_history.splice(strokeEnd);

    // clear clients and send history to all
    clear(socket);
    sendHistory(io);
};

function helpPage(data) {

};

function findStrokeEnd(arr) {
    for (var i = arr.length; --i >= 0;) {
	if (arr[i].type == "mouseup")
	    return i;
    }
    for (var i = arr.length; --i >= 0;) {
	if (arr[i].type == "mousedown")
	    return i;
    }
    return null;
};

http.listen(PORT, function() {
    console.log("Listening on port " + PORT + ".");
});

