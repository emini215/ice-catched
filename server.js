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
    
    socket.on("nick", function(name) {   
	socket.emit("nick", nick(socket, name)); 
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
 * @param {string|int} name - The name of the room to join, or 0 to leave.
 * @param {?string} password - The password (if any) of the room to join.
 * @return {Object} - A response to request.
 */
function join(socket, name, password) {	

    // TODO: leave room upon 0
    if (name === 0) {}
   
    var room = roomExists(name);
    if (room == null) {
	// room does not exist
	return {
	    room: null,
	    message: "Room does not exist."
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
    socket.room = room;

    // everything okay
    return {
	room: room.name
    };
};

/**
 * Make user leave room. Delete the room if it has no other users.
 * @param {string} nick - The nick of the user.
 * @param {Object} room - The room to delete user from.
 * @param {string} room.name - The name of the room.
 * @param {string[]} room.users - The users in the room.
 */
function leave(nick, room) {
    removeUser(nick, room);
    if (room.users.length === 0) {
	// no more users in room, delete it
	rooms.filter(function(other) { return other.name !=== room.name });
    }
};

/**
 * Create a room.
 * @param {Object} socket - The socket of the user creating the room.
 * @param {string} name - The name of the room.
 * @param {string} password - The password of the room.
 * @param {boolean} [visible] - Whether or not the room shows in room-list.
 * @return {Object} - A response to request.
 */
function create(socket, name, password, visible) {

    // default visible to false
    if (visible == null) {
	visible = false;
    }
    
    if (roomExists(name) != null) {
	// room already exists
	return {
	    room: null,
	    message: "Room already exists."
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
    room.users = [];
    rooms.push(room);

    // remember which room user created
    socket.room = room;

    return {
	room: name
    };
};

/**
 * Set client's nick and designated room.
 * @param {Object} socket - The socket of the client to set the nick of.
 * @param {string} nick - The nick to set.
 * @return {Object} - A response to request.
 */
function nick(socket, nick) {
    
    if (!nickIsValid(nick)) {
	// nick is not correct
	return {
	    nick: socket.nick,
	    message: "The nick must be of type string and at least" + 
		" 3 characters long."
	};
    }

    if (nickIsTaken(nick, room)) {
	// the nick is already taken
	return {
	    nick: socket.nick,
	    message: "The nick is already taken."
	};
    }

    if (socket.nick == null) {
	// add user to room
	addUser(nick, room);

	// add the user to the socket.io's room
	socket.join(room.name);

	// message room
	messageRoom(room, nick + " joined this room!");
    } else {
	// rename user
	renameUser(nick, room);

	// message room
	messageRoom(socket.nick + " is now called: " + nick);
    }

    socket.nick = nick;
    return {
	nick: nick
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

/**
 * Send message to room.
 * @param {Object} room - The room to send message to.
 * @param {string} room.name - The name of the room.
 * @param {string} message - The message to be sent.
 */
function messageRoom(room, message) {
    io.to(room.name).emit("msg", message);
};

/**
 * Rename the user.
 * @param {string} prev - The previous name of the user.
 * @param {string} next - The new name of the user.
 * @param {Object} room - The room to change user's name in.
 * @param {string[]} room.users - A list of users in the room.
 */
function renameUser(prev, next, room) {
    var index = room.users.indexOf(prev);

    if (index !== -1)
	room[index] = next;
};

/**
 * Add user to room.
 * @param {string} nick - Name of user.
 * @param {Object} room - The room to join.
 * @param {string[]} room.users - List of users.
 */
function addUser(nick, room) {
    room.users.push(nick);
};

/**
 * Remove user from room.
 * @param {string} nick - Name of user to remove.
 * @param {Object} room - The room to leave.
 * @param {string[]} room.users - List of users.
 */
function removeUser(nick, room) {
    room.users = room.users.filter(
	function(other) { return other !== nick }
    );
};

/**
 * Check if the nick is valid.
 * @param {string} nick - The nick to check.
 * @return {boolean}
 */
function nickIsValid(nick) {
    if (typeof nick !== "string" || nick.length < 3)
       return false;

    return true;    
};

/**
 * Check if the nick is used in a room.
 * @param {string} nick - The nick to check.
 * @param {Object} room - The room to check if nick is taken in.
 * @param {string[]} room.users - List of users in room.
 * @return {boolean}
 */
function nickIsTaken(nick, room) {
    return null != room.users.find(function(other) { return other==nick; });
};

/**
 * Check if the room exists.
 * @param {string} room - The name of room to check whether exists.
 * @return {undefined|Object} - Either undefined or the room found.
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

