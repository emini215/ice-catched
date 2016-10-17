var socketio = require("socket.io")(http);

// history of drawn lines
var rooms = [];

// main function for handling connection to client
module.exports.listen = function(http) {
    io = socketio.listen(http);

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
	var res = undo(socket);
	if (res.statusCode !== 0) {
	    socket.emit("exception", res.message);
	}
    });

    socket.on("skip", function() {
	var res = skip(socket);
	if (res.statusCode !== 0) {
	    // could not skip
	    socket.emit("exception", res.message);
	}
    });

    socket.on("clear", function() {
	var res = clear(socket);
	if (res.statusCode !== 0) {
	    socket.emit("exception", res.message);
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
	socket.emit("create", create(socket, room, password, visible)) 
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
	password: room.password != null
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
    if (room.password != null && !passwordMatch(password, room)) {
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
	if (isArtist(socket)) {
	    // restart round
	    restart(socket, true);
	}
    }

    // remove the user from the room
    removeUser(socket.nick, socket.room);
   
    // let other clients know that user has disconnected
    messageRoom(socket.room, socket.nick + " has disconnected.");
    socket.room = null;
    socket.nick = null;
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
	visible = true;
    }

    // do not consider empty string a password
    if (password === "") {
	password = null;
    }
    
    if (!!roomExists(name)) {
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

    if (typeof visible !== "boolean") {
	// visible must be a boolean
	return {
	    room: null,
	    message: "Visibility must be set by a boolean or null."
	};
    }

    // everything fine, create the room and return
    var room = {};
    room.name = name;
    room.password = password;
    room.visible = visible;
    room.users = [];
    room.artist = null;
    room.history = [];
    room.skip = [];
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
	    statusCode: -1,
	    message: "The nick must be of type string and at least" + 
		" 3 characters long."
	};
    }

    if (nickIsTaken(nick, socket.room)) {
	// the nick is already taken
	return {
	    nick: socket.nick,
	    statusCode: -1,
	    message: "The nick is already taken."
	};
    }

    if (socket.nick == null) {
	// add user to room
	addUser(nick, socket.room);

	// add the user to the socket.io's room
	socket.join(socket.room.name);

	// message room
	messageRoom(socket.room, nick + " joined this room.");
	console.log(socket.room.name + "@" + nick + " joined this room.");
    } else {
	// rename user
	renameUser(nick, socket.room);

	// message room
	messageRoom(socket.room, socket.nick + " is now called: " + nick);
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
 * Restart the round.
 * @param {Object} socket - The client restarting.
 * @param {Object} socket.room - The room to be restarted.
 * @param {boolean} leaving - Whether restart is because of leaving user 
 *				or not.
 */
function restart(socket) {
    
    // clear the canvas before selecting new artist
    clear(socket);
    socket.room.history = [];

    // reset skip
    socket.room.skip.fill(0);

    // set the next artist
    nextArtist(socket.room);
};

/**
 * Vote to skip round.
 * @param {Object} socket - The client voting to skip.
 * @return {Object} - Containing "statusCode" set to 0 if successful.
 */
function skip(socket) {
    if (isArtist(socket)) {
	// artists can always skip
	io.to(socket.room.name).emit("skip", {
	    code: 0,
	    nick: socket.nick,
	    skipped: socket.nick
	});

	restart(socket);
	return {
	    statusCode: 0
	};
    }

    if (socket.room.skip[socket.room.users.indexOf(socket.nick)] === 1) {
	// user already skipped
	return {
	    statusCode: -1,
	    message: "You have already voted to skip."
	};
    } 

    // set skip of user
    socket.room.skip[socket.room.users.indexOf(socket.nick)] = 1;

    if (isMajority(socket.room)) {
	// majority of the users skipped, accepted
	io.to(socket.room.name).emit("skip", { 
	    code: 0,
	    count: skipCount(socket.room),
	    nick: socket.nick,
	    skipped: artistNick(socket.room),
	    total: socket.room.skip.length
	});
	
	// start new round
	restart(socket);
	return {
	    statusCode: 0
	};

    } else {
	// skip added, but not yet majority
	// tell the room of updated status
	io.to(socket.room.name).emit("skip", {
	    code: -1,
	    count: skipCount(socket.room),
	    nick: socket.nick,
	    total: socket.room.skip.length
	});

	return {
	    statusCode: 0
	};
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
    
    if (!isArtist(socket)) {
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
 * Clear the drawing for everyone in room.
 * @param {Object} socket - The user who clears the room.
 * @param {Objecc} socket.room - The room to be cleared.
 * @return {Object} - Containing "statusCode" set to 0 if successful.
 */
function clear(socket) {
    
    if (!isArtist(socket)) {
	// only artists can clear
	return {
	    statusCode: -1,
	    message: "Only artists can clear."
	};
    }

    // send clear-message
    io.to(socket.room.name).emit("clear");

    // all goood
    return {
	statusCode: 0
    };
};

/**
 * Undo previous draw-event in room.
 * @param {Object} socket - The user performing undo.
 * @return {Object} - Containing "statusCode" set to 0 if successful.
 */
function undo(socket) {

    if (!isArtist(socket)) {
	// only artsits can undo
	return {
	    statusCode: -1,
	    message: "Only artists can undo."
	};
    }

    // remove the last element
    var strokeEnd = findStrokeEnd(socket.room.history);
    if (strokeEnd != null)
	socket.room.history.splice(strokeEnd);

    // clear clients and send history to all
    clear(socket);
    sendHistory(io, socket.room);

    return {
	statusCode: 0
    };
};

/**
 * Find the index of last "mouseup"-event in array or the last 
 * "mousedown"-event if the previous was not found.
 * @param {Object[]} arr - Array of draw-events.
 * @return {int|null} - The index of last "mouseup", or if none found last
 *			"mousedown", if none of those were found returns null.
 */
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
 * Set artist to next in line.
 * @param {Object} room - The room to switch artist in.
 * @param {int} room.artist - Index of artist in room.users.
 * @param {string[]} room.users - List of users in room.
 */
function nextArtist(room) {
    
    // update artist
    if (room.artist == room.users.length -1 || room.artist == null) {
	room.artist = 0;
    } else {
	room.artist++;
    }
    
    // notify members of room
    io.to(room.name).emit("artist", room.users[room.artist]);
};

/**
 * Check if user is the artist.
 * @param {Object} socket - The connection to the user.
 * @param {string} socket.nick - The user's nick.
 * @param {Object} socket.room - The room to check if artist in.
 * @return {boolean}
 */
function isArtist(socket) {
    if (socket.nick == null) {
	// if the user is not connected return false
	// there is no way the user is artist
	return false;
    }

    return socket.nick === socket.room.users[socket.room.artist];
}

/**
 * Get the name of the artist.
 * @param {Object} room - The room to return artist of.
 * @return {string} - The nick of the artist.
 */
function artistNick(room) {
    return room.users[room.artist];
}

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
 * Add all skips.
 * @param {Object} room - The room to count skips in.
 * @param {int[]} room.skip - The skips to count.
 * @return {int} - The count.
 */
function skipCount(room) {
    return room.skip.reduce(function(x, y) { return x + y; }, 0);
};

/**
 * Check if majority of room-members want to skip.
 * @param {Object} room - The room to check.
 * @return {boolean}
 */
function isMajority(room) {
    return skipCount(room) > room.skip.length/2;
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
    room.skip.push(0);
};

/**
 * Remove user from room.
 * @param {string} nick - Name of user to remove.
 * @param {Object} room - The room to leave.
 * @param {string[]} room.users - List of users.
 */
function removeUser(nick, room) {

    // if the artist is after the to be removed user then
    // decrement the artist-index
    if (room.users.indexOf(nick) < room.artist) {
	room.artist--;
    }

    // remove user's skip value
    room.skip.splice(room.users.indexOf(nick), 1);

    // remove user from list
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

