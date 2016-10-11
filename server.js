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
var rooms = [];

// main function for handling connection to client
io.on("connection", function(socket) {
    console.log("New connection: " + socket.id);

    // send the drawing history to the new user so that the user
    // does not miss all drawing before the time of joining
    sendHistory(socket);

    // reactions on messages
    socket.on("help", function(data)	{   helpPage(data)	    });
    socket.on("list", function()	{   list(socket)	    });
    socket.on("active", function()	{   active(socket)	    });
    socket.on("msg", function(msg)	{   messageAll(socket, msg) });
    socket.on("draw", function(data)	{   draw(socket, data)	    });
    socket.on("undo", function()	{   undo(socket)	    });
    socket.on("clear", function()	{   clear(socket)	    });
    socket.on("nick", function(nick) {   
	socket.emit("nick", setNick(socket, nick)) });
    socket.on("create", function(room, password, visible) {
	socket.emit("create", createRoom(socket, room, password, visible)) });
    socket.on("join", function(room, password) {
	socket.emit("join", joinRoom(socket, room, password)) });
 
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
    if (nick == null || nick == "") {
	return {
	    nick: null,
	    message: "Nick is invalid."
	};	    
    }

    // notify other users of change
    if (socket.nick == null) {
	// if the user has no previous nick it just joined
	// (or at least is considered so as no previous actions
	// has been possible)
	io.emit("msg", nick + " has joined.");

    } else {
	// user's nicks are unique in rooms
	if (socket.room != null) {
	    if (socket.room.users.find(function(other) { 
		return other==nick })) {
		
		return {
		    nick: null,
		    message: "Nick is already taken in room."
		};
	    } else {
	    	// otherwise notify of name-change
		io.emit("msg", socket.nick + " is now known as " + nick + ".");
	    }
	}
    }

    // update nick
    socket.nick = nick;
    return {
	nick: nick
    };
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
    if (active_drawer == null)
	socket.emit("msg", "Game has not started yet.");
    else if (socket.id == active_drawer) 
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

function createRoom(socket, name, password, visible) {
    // verify that the user is indeed connected and not in a room
    if (socket.nick == null || socket.room != null)
	return {    
	    room: null, 
	    message: "Client must be registered and not already in a room."
	};

    // try to create room
    var room = {};
    if (name != null) {
	// room is already taken
	if (rooms.find(function(room) { return room.name==name })) {
	    return {	
		room: null,
		message: "Already exists room with given name."
	    };
	}
    
	// name is alright
	room.name = name;

	// check if password is given
	if (password != null) {
	    // verify password type
	    if (typeof password !== "string") {
		return {
		    room: null,
		    message: "Password given must be of type string."
		};
	    }

	    // password is fine
	    room.password = password;
	} else {
	    room.password = null;
	}

	// make sure visible is exactly false befores setting it to false.
	// if it is not it is okay to set visible to true as it is supposed
	// to be the default value
	if (visible === false)
	    room.visible = false;
	else
	    room.visible = true;

    } else {
	return {
	    room: null,
	    message: "You must provide a name for the room."
	};
    }

    // add room to rooms, and add user to room
    room.users = [];
    rooms.push(room);
    return joinRoom(socket, room.name, password);
};

function joinRoom(socket, name, password) {
    // verify user is not already in a room and has registered
    if (socket.nick == null || socket.room != null) {
	return {
	    room: null, 
	    message: "Client must be registered and not already in a room."
	};
    }

    // make sure the client sent a room
    if (name == null) {
	return {
	    room: null,
	    message: "Request missing room."
	};
    }

    // verify that the room exists
    var room = rooms.find(function(room) { return room.name = name });
    if (room == null) {

	return {
	    room: null,
	    message: "Room does not exist."
	};
    }

    // make sure there is no other user with your name in room
    if (room.users.find(function(nick) { return nick==socket.nick })) {
	return {
	    room: null,
	    message: "Nick is already used in the room."
	};
    }

    // check password
    if (room.password == password) {
	// successfully joined room
	socket.room = room;
	socket.join(room.name);
	room.users.push(socket.nick);
	
	return {
	    room: name
	};
    } else {
	
	return {
	    room: null,
	    message: "Password does not match."
	};
    }
};

/**
 * Check if the room exists.
 * @param {string} room - The name of room to check whether exists.
 * @return {boolean}
 */
function roomExists(room) {
    
    // the room that is null does not exist
    if (room == null) 
	return false;

    // otherwise rooms exist if there are a room with given name
    return rooms.find(function(other) { return other.name===room; });
};

/**
 * Check if the password matches password of room.
 * @param {?string} password - The password to check.
 * @param {Object} room	- The room to check password with.
 * @param {?string] room.password - The password of the room.
 * @return {boolean}
 */
function passwordMatch(password, room) {
    return room.password == password;
};

http.listen(PORT, function() {
    console.log("Listening on port " + PORT + ".");
});

