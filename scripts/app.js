var App = {};

// send a request to create a room with given name
App.create = function(room, password, visible) {
    // TODO: Make it possible to send password and private
    App.socket.emit("create", room, password, visible);
};

App.join = function(room, password) {
    // TODO: make it possible to enter password
    App.socket.emit("join", room, password);
};

App.nick = function(nick) {
    App.socket.emit("nick", nick);
};

App.draw = function(data) {
    App.socket.emit("draw", data);
};

App.leave = function() {
    // tell server you are leaving
    App.socket.emit("join", 0);
};

App.skip = function() {
    App.socket.emit("skip");
};

App.room = function(name) {
    App.socket.emit("room", name);
};

App.rooms = function() {
    App.socket.emit("rooms");
};

App.focus = function(focus) {
    document.getElementById("content").style.display = 
	focus ? "block" : "none";
}

// display given message in the chat-area
App.displayMessage = function(message) {
   App._appendParagraph(App._createParagraph(message)); 
};

App.displayError = function(message) {
    var paragraph = App._createParagraph(message);
    paragraph.style.color = "#ff0000";
    App._appendParagraph(paragraph);
};

App._createParagraph = function(message) { 
    var paragraph = document.createElement("p");
    paragraph.textContent = message;
    return paragraph;
};

App._appendParagraph = function(paragraph) {
    
    // append paragraph
    var chatarea = document.getElementById("chat-area");
    chatarea.appendChild(paragraph);

    // scroll down chat area
    chatarea.scrollTop = chatarea.scrollHeight;  
};

App.sendMessage = function() {

    // fetch message
    var message = document.getElementById("message").value;

    if (message == "/list") {
	App.socket.emit("list");
    } else if (message == "/active") { 
	App.socket.emit("active");
    } else {
        // send message
	App.socket.emit("msg", message);
    }

    // clear box
    document.getElementById("message").value = "";
};

App.undo = function() {
    App.socket.emit("undo");
};

App._resetVariables = function() {
    App.room = null;
    App.nickname = null;
    App.active = false;
};

App.init = function() {
    // create canvas
    Login.init();
    Draw.init();

    // whether or not its clients turn to draw
    App.active = false;

    // user's nick
    App.nickname = null;
    App.room = null;

    // loads the socket.io-client and connects
    var socket = io();
    App.socket = socket;

    // handle any errors that occur.
    socket.onerror = function(error) {
	console.log('WebSocket Error: ' + error);
    };

    // log whatever message sent by server (this far unused?)
    socket.onmessage = function(e) {
	console.log("STRANGE: " + e);
    };

    socket.on("exception", function(error) {
	console.log("EXCEPTION: " + error);
	App.displayError(error);
    });

    socket.on("room", function(data) {
	// TODO: tell join/create 
    };

    socket.on("rooms", function(list) {
	// display available rooms, sorted in descending order
	Login.fillRoomList(list.sort(
	    function(x, y) { return y.users - x.users; }
	));
    });

    socket.on("artist", function(artist) {

	// set as artist if server tells you you are artist
	if (App.nickname === artist) {
	    App.active = true;
	    App.displayMessage("You are drawing.");
	} else {
	    App.active = false;
	    App.displayMessage(artist + " is drawing.");
	}
    });

    socket.on("nick", function(data) {
	var nick = data.nick;
	var message = data.message;

	if (nick == null) {
	    // display error
	    Login.showError(true, message);
	} else if (App.nickname == null) {
	    Login.focus(false);
	    App.focus(true);
	}
	
	// update nick
	App.nickname = nick;
    });

    socket.on("create", function(data) {
	var room = data.room;
	var message = data.message;

	if (room == null) {
	    // display error message
	    Login.showError(true, message);
	} else {
	    App.room = room;
	    Login.focusNick();
	}
    });

    socket.on("join", function(data) {
	var room = data.room;
	var message = data.message;

	if (room == null) {
	    // error occured
	    if (data.errorCode == 2) {
		// required password
		Login.showPassword();

	    } else {
		Login.showError(true, message);
	    }
	} else if (room !== 0){
	    App.room = room;
	    Login.focusNick();
	} else if (App.room != null) {
	    App._resetVariables();
	    App.focus(false);
	    Login.focus(true);
	}
    });

    // display list of users
    socket.on("list", function(data) {

	if (data.users == null) {
	    // error occured
	    Login.showError(true, data.message);
	}
	
	// display list-label
	App.displayMessage("List of connected users:");

	// append all users to the list
	data.users.forEach(function(username) {
	    App.displayMessage(username);
	});

	// add space
	App.displayMessage("");
    });

    socket.on("skip", function(data) {
    
	if (data.skipped === data.nick) {
	    // artist skipped
	    App.displayMessage((data.nick === App.nickname ?
		"You" : data.nick) + " skipped.");

	} else {
	    // display who voted to skip and status
	    App.displayMessage((data.nick === App.nickname ?
		"You" : data.nick) + " voted to skip. (" + 
		    data.count + "/" + data.total + ")");

	    if (data.code === 0) {
		// vote was successful	    
		App.displayMessage((data.skipped === App.nickname ? 
		    "You were" : data.skipped + " was") + " skippped.");
	    }
	}
    });

    // listen for msg
    socket.on("msg", function(message) {
	App.displayMessage(message);	
    });

    // listen for drawing
    socket.on("draw", function(data) {
	Draw.draw(JSON.parse(data));
    });

    // clear canvas
    socket.on("clear", function() {
	Draw.clear();
    });

    // send message when enter is pressed
    document.getElementById("message")
	.addEventListener("keyup", function(event) {
	event.preventDefault();
	if (event.which == 13) {
	    App.sendMessage();
	}
    });

};

// create App on window load
window.onload = App.init;

