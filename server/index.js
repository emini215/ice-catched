var socketio = require("socket.io");
var Room = require("./room/room.js");
var io;

// history of drawn lines
var rooms;

module.exports.close = function() {
    io.server.close();
}

// main function for handling connection to client
module.exports.listen = function(http) {
    io = socketio.listen(http);
    rooms = [];

    io.on("connection", function(socket) {

    // reactions on messages
    socket.on("help", function(data){});

    socket.on("list", function() {
	socket.emit("list", list(socket));
    });

    socket.on("draw", function(data) {  
	var res = draw(socket, data);
	if (res.statusCode !== 0) {
	    socket.emit("exception", res.message);
	}
    });

    socket.on("undo", function() {
	var success = socket.room.undo(socket.nick);

	if (success) {
	    // clear clients and send history to all
	    // should not be any need to check if clear is successful as it
	    // has the same check as undo. unless problems with concurrency
	    socket.room.undo(socket.nick);
	    io.to(socket.room.name).emit("clear");
	    sendHistory(io, socket.room);
	} else {
	    socket.emit("exception", "Could not undo.");
	}
    });

    socket.on("skip", function() {
	try {
	    skip(socket);
	} catch (e) {
	    socket.emit("exception", e);
	}
    });

    socket.on("clear", function() {
	// try to clear
	var success = socket.room.clear(socket.nick);
	
	if (success) {
	    // send clear-message
	    io.to(socket.room.name).emit("clear");
	} else {
	    // send error to clearer
	    socket.emit("exception", "Could not clear.");
	}
    });

    socket.on("room", function(name) {
	socket.emit("room", room(name));
    });

    socket.on("rooms", function() {
	socket.emit("rooms", getRooms());
    });
    
    socket.on("nick", function(name) {
	var firstTime = socket.nick == null;

	// respond to nick-register
	var res =  nick(socket, name);
	socket.emit("nick", res);

	if (res.statusCode == 0 && firstTime) {
	    // try to start the game and tell client who is the current 
	    // artist, if the game was not started the client becomes 
	    // the artist
	    if (start(socket).statusCode !== 0) {
		socket.emit("artist", 
		    socket.room.users[socket.room.artist]);
	    } 

	    // send the drawing history to the new user so that the user
	    // does not miss all drawing before the time of joining
	    sendHistory(socket);
	}
    });
    
    socket.on("create", function(room, password, visible) {
	try {
	    var room = create(socket, room, password, visible);
	    socket.emit("create", room.name);
	} catch (e) {
	    socket.emit("exception", e);
	}
    });
    
    socket.on("join", function(room, password) {
	socket.emit("join", join(socket, room, password)); 
    });

    socket.on("msg", function(msg) {
	var res = sendMessage(socket, msg);
	if (res.statusCode !== 0) {
	    // message could not be sent
	    socket.emit("exception", res.message);
	}
    });
 
    // if the user was identified let other use know of disconnection
    // otherwise ignore as the user has gone by unnoticed
    socket.on("disconnect", function() {
	if (socket.nick != null) {

	    console.log(socket.room.name + "@" + socket.nick + 
		" has disconnected.");

	    // leave room if in any
	    leave(socket);
	}
    });

});
};

/**
 * Find all visible rooms.
 * @return {Object[]} - A list of rooms.
 */
function getRooms() {
    var list = [];
    for (var i = 0; i < rooms.length; i++) {
	// only include visible rooms
	if (!rooms[i].visible) {
	    continue;
	}

	list.push({
	    name: rooms[i].name,
	    password: rooms[i].password != null,
	    users: rooms[i].users.length
	});
    }
    return list;
};

/**
 * Find out if room exists.
 * @param {string} name - The name of the room to search for.
 * @return {Object} - Containing the name of room and if it is passworded if
 *			successful, otherwise null.
 */
function room(name) {
    var room = roomExists(name);
    if (!room) {
	// room doesnt exist
	return {
	    room: null,
	    message: "Room does not exist."
	};
    };
    
    // otherwise return room-name with bool if passworded
    return {
	room: room.name,
	password: room.isPassworded()
    };
};

/**
 * Check credentials for joining room.
 * @param {Object} socket - The socket of the user joining the room.
 * @param {string|int} name - The name of the room to join, or 0 to leave.
 * @param {?string} password - The password (if any) of the room to join.
 * @return {Object} - A response to request.
 */
function join(socket, name, password) {	

    if (name === 0) {
	// try leaving

	if (socket.nick == null || socket.room == null) {
	    // cant leave anything you are not in
	    return {
		room: null,
		errorCode: 4,
		message: "You are not in a room, cannot leave."
	    };
	}

	// otherwise leave room	
	console.log(socket.room.name + "@" + socket.nick + 
	    " has disconnected.");
	leave(socket);
	return {
	    room: 0
	};
    }
   
    var room = roomExists(name);
    if (!room) {
	// room does not exist
	return {
	    room: null,
	    errorCode: 1,
	    message: "Room does not exist."
	};
    }

    // only check if the room is passworded
    // if a client tries to join a room that does not have a password by 
    // giving a password we allow it
    if (room.isPassworded() && !room.passwordMatch(password)) {
	// password does not match
	if (password == "") {
	    // empty string is not a password
	    return {
		room: null,
		errorCode: 2,
		message: "Password is required."
	    };
	}
	return {
	    room: null,
	    errorCode: 3,
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
 * @param {string} socket.nick - The nick of the user.
 * @param {Object} socket.room - The room to delete user from.
 */
function leave(socket) {

    socket.leave(socket.room.name);
    if (socket.room.users.length === 1) {
	// if the user is only one in the room delete it
	rooms =	rooms.filter(function(other) { 
	    return other.name !== socket.room.name 
	});
    } else {
	if (socket.room.isArtist(socket.nick)) {
	    // restart round
	    restart(socket.room);
	}
    }

    // remove the user from the room
    socket.room.removeUser(socket.nick);
   
    // let other clients know that user has disconnected
    messageRoom(socket.room, socket.nick + " has disconnected.");
    socket.room = null;
    socket.nick = null;
};

/**
 * Create a room.
 * @param {Object} socket - The socket of the user creating the room.
 * @param {string} name - The name of the room.
 * @param {string} [password] - The password of the room.
 * @param {boolean} [visible] - Whether or not the room shows in room-list.
 * @throws Throws error when room could not be created.
 * @return {Room) - The created Room if successful.
 */
function create(socket, name, password, visible) {

    if (!!roomExists(name)) {
	// room already exists
	throw "Room already exists.";
    }

    // create room and save reference in room-list and creating user
    var room = new Room(name, password, visible);
    rooms.push(room);
    socket.room = room;

    return room;
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
	    statusCode: -1,
	    message: "The nick must be of type string and at least" + 
		" 3 characters long."
	};
    }

    if (socket.room.nickIsTaken(nick)) {
	// the nick is already taken
	return {
	    nick: socket.nick,
	    statusCode: -1,
	    message: "The nick is already taken."
	};
    }

    if (socket.nick == null) {
	// add user to room
	socket.room.addUser(nick);

	// add the user to the socket.io's room
	socket.join(socket.room.name);

	// message room
	messageRoom(socket.room, nick + " joined this room.");
	console.log(socket.room.name + "@" + nick + " joined this room.");
    } else {
	// rename user
	if (socket.room.renameUser(socket.nick, nick)) {
	    // message room
	    messageRoom(socket.room, socket.nick + " is now called: " + nick); 
	} else {
	    // else nick was taken or not a member of the room.
	    // (where the first is the only one which should be possible)
	    return {
		nick: socket.nick,
		statusCode: -1,
		message: "Could not change to given name."
	    };
	} 
    }

    // update socket.nick
    socket.nick = nick;

    return {
	nick: nick,
	statusCode: 0
    };
};

/**
 * Start the game.
 * @param {Object} socket - The socket of user to start the game.
 * @param {string} socket.nick - The name of the user.
 * @return {Object} - Containing "statusCode" set to 0 if successful.
 */
function start(socket) {
    if (socket.nick == null) {
	// user is not connected
	return {
	    statusCode: -1,
	    message: "The user is not connected."
	};
    }
    
    if (socket.room.artist != null) {
	// someone is already drawing
	return {
	    statusCode: -1,
	    message: "Game is already started."
	};
    }

    // set the user as artist
    nextArtist(socket.room);
    return {
	statusCode: 0
    };
};

/**
 * Restart the round of a room.
 * @param {Room} room - The room which's round to restart.
 */
function restart(room) {
    
    // clear the canvas before selecting new artist
    room.clear(room.getArtist());
    io.to(room.name).emit("clear");

    // reset skip-count
    room.resetSkip();

    // set the next artist
    nextArtist(room);
};

/**
 * Vote to skip round.
 * @param {Object} socket - The client voting to skip.
 * @throws Error if the user could not skip.
 */
function skip(socket) {

    if (socket.room.skipArtist(socket.nick)) {
	// the artist should be skipped
	
	io.to(socket.room.name).emit("skip", {
	    count: socket.room.skipCount(),
	    total: socket.room.memberCount(),
	    skipper: socket.nick,
	    skipped: socket.room.getArtist()
	});
	    
	restart(socket.room);
    } else {
	// skip added, but not yet majority
	// tell the room of updated status
	io.to(socket.room.name).emit("skip", {
	    count: socket.room.skipCount(),
	    total: socket.room.memberCount(),
	    skipper: socket.nick
	});
    }
};

/**
 * Send the the drawing history to client.
 * @param {Object} socket - The socket to send history to.
 * @param {Object} [room] - The room which's history to send.
 */
function sendHistory(socket, room) {
    if (room == null)
	room = socket.room;

    if (room.history == null) {
	// server error
	console.log("SEND HISTORY FAILED");
    }

    for (var line in room.history) {
	if (socket.room != null)
	    socket.emit("draw", JSON.stringify(room.history[line]));
	else
	    io.to(room.name).emit("draw", JSON.stringify(room.history[line]));
    }
};

/**
 * Send message to everyone in clients room.
 * @param {Object} socket - The socket of the client sending message.
 * @param {string} socket.nick - The nick of the user sending message.
 * @param {Object} socket.room - The room to send message to.
 * @param {string} socket.room.name - The name of the recipient room.
 * @param {string} message - The message to be sent.
 * @return {Object} - Containing property "statusCode" set to 0 if successful.
 */
function sendMessage(socket, message) {
    if (socket.room == null || socket.nick == null) {
	// not connected to room
	return {
	    statusCode: -1,
	    message: "You are not connected to any room. " + 
		"Could not send message."
	};
    }
   
    // send message to room 
    messageRoom(socket.room, socket.nick + ": " + message);
    console.log(socket.room.name + "@" + socket.nick + ": " + message);
    return {
	statusCode: 0
    };
};

/**
 * Tell clients to draw from data and add to room history.
 * @param {Object} socket - The artist.
 * @param {Object} data - The content to be drawn.
 * @return {Object} - Containing "statusCode" set to 0 if successful.
 */
function draw(socket, data) {
    if (socket.room == null) {
	// the user is not connected
	return {
	    statusCode: -1,
	    message: "You are not connected to a room."
	};
    }

    if (!socket.room.isArtist(socket.nick)) {
	// the user is not artist
	return {
	    statusCode: -1,
	    message: "The user is not the artist."
	};
    }

    // save it history
    socket.room.history.push(JSON.parse(data));

    // send to all but the drawer who already drew it.
    socket.broadcast.to(socket.room.name).emit("draw", data);

    // everything went fine
    return {
	statusCode: 0
    };
};

/**
 * Return list of users in client's room.
 * @param {Object} socket - The client retrieving list.
 * @return {Object} - Containing "users" if successful, otherwise with 
 *		    explaining message.
 */
function list(socket) {
    
    if (socket.nick == null) {
	// user is not connected
	return {
	    users: null,
	    message: "You are not connected to a room."
	};
    }

    // everything fine
    return {
	users: socket.room.users
    };
};

/**
 * Set artist to next in line.
 * @param {Room} room - The room to switch artist in.
 */
function nextArtist(room) {
   
    // update artist, and notifiy members 
    room.nextArtist();
    io.to(room.name).emit("artist", room.getArtist());
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
 * Check if the room exists.
 * @param {string} room - The name of room to check whether exists.
 * @return {false|Object} - Either false or the room found.
 */
function roomExists(room) {
    
    // the room that is null does not exist
    if (room == null) 
	return false;

    // otherwise rooms exist if there are a room with given name
    room = rooms.find(function(other) { return other.name==room; });
    return room === undefined ? false : room;
};

