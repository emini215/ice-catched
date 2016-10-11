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
	socket.emit("nick", setNick(socket, nick)) 
    });
    
    socket.on("create", function(room, password, visible) {
	socket.emit("create", create(socket, room, password, visible)) 
    });
    
    socket.on("join", function(room, password) {
	socket.emit("join", join(socket, room, password)); 
    });
 
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

/**
 * Check credentials for joining room.
 * @param {Object} socket - The socket of the user joining the room.
 * @param {string} name - The name of the room to join.
 * @param {?string} password - The password (if any) of the room to join.
 * @return {Object} - A response to request
 */
function join(socket, name, password) {	

    // TODO: leave room upon 0
    if (name === 0) {}
    
    var room = roomExists(name);
    if (!room) {
	// room does not exist
	return {
	    room: null,
	    message: "Password does not match."
	};
    }

    if (!passwordMatch(password, room)) {
	// password does not match
	return {
	    room: null,
	    message: "Password does not match."
	};
    }

    // make sure we remember which room the user is joining
    // must be saved here as the user does not actaully join until the
    // nick has been sent
    socket.room = room.name;

    // everything okay
    return {
	room: room.name
    };
};

/**
 * Create a room.
 * @param {Object} socket - The socket of the user creating the room.
 * @param {string} name - The name of the room.
 * @param {string} password - The password of the room.
 * @param {boolean} [visible] - Whether or not the room shows in room-list.
 */
function create(socket, name, password, visible) {

    // default visible to false
    if (visible == null) {
	visible = false;
    }
    
    if (roomExists(name)) {
	// room already exists
	return {
	    room: null,
	    message: "Room already exists:"
	};
    }

    if (password != null && typeof password !== "string") {
	// password must a string (or null if not given)
	return {
	    room: null,
	    message: "Password must be of type string or null."
	};
    }

    if (visible != null && typeof visible !== "boolean") {
	// visible must be a boolean
	return {
	    room: null,
	    message: "Visibility must be set by a boolean or null."
	};
    }

    // everything fine, create the room and return
    room = {};
    room.name = name;
    room.password = password;
    room.visible = visible;
    rooms.push(room);

    // remember which room user created
    socket.room  room.name;

    return {
	room: name
    };
};

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

/**
 * Check if the nick is used in a room.
 * @param {string} nick - The nick to check.
 * @param {Object} room - The room to check if nick is taken in.
 * @param {string[]} room.users - List of users in room.
 * @return {boolean}
 */
function nickInRoom(nick, room) {
    return null != room.users.find(function(other) { return other==nick; });
};

/**
 * Check if the room exists.
 * @param {string} room - The name of room to check whether exists.
 * @return {undefined|Object} - Either false or the room found.
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

