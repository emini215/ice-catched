var App = {};

// send a request to create a room with given name
App.createRoom = function(room) {
    // TODO: Make it possible to send password and private
    App.socket.emit("create", room);
};

App.joinRoom = function(room) {
    // TODO: make it possible to enter password
    App.socket.emit("join", room);
};

App.sendNick = function(nick) {
    App.socket.emit("nick", nick);
};

App.draw = function(data) {
    console.log(data);
    App.socket.emit("draw", data);
};

// display given message in the chat-area
App.displayMessage = function(message) {
    var textarea = document.getElementById("chat-area");
    textarea.value += message + "\n";
    textarea.scrollTop = textarea.scrollHeight; 
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

App.init = function() {
    // create canvas
    Draw.init();

    // whether or not its clients turn to draw
    App.active = false;

    // user's nick
    App.nick = null;


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
    });

    socket.on("artist", function(artist) {

	// set as artist if server tells you you are artist
	if (App.nick === artist) {
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
	    Login.showError(message);
	} else if (App.nick == null) {
	    Login.showMainPage();
	}
	
	// update nick
	App.nick = nick;
    });

    socket.on("create", function(data) {
	var room = data.room;
	var message = data.message;
	if (room == null) {
	    // display error message
	    Login.showError(message);
	} else {
	    App.room = room;
	    Login.showNick();
	}
    });

    socket.on("join", function(data) {
	var room = data.room;
	var message = data.message;
	if (room == null) {
	    Login.showError(message);
	} else {
	    App.room = room;
	    Login.showNick();
	}
    });

    // display list of users
    socket.on("list", function(message) {
	var textarea = document.getElementById("chat-area");

	// put label on list
	textarea.value += "List of connected users:\n";

	// append all users to the list
	message.forEach(function(username) {
	    textarea.value += "\t" + username + "\n";
	});

	// add space between list and next message
	textarea.value += "\n";

	// scroll down
	textarea.scrollTop = textarea.scrollHeight;
    });

    socket.on("active", function(nick) {
   
	// update variable active according to given nick, null being self
	// also set the text to be displayed
	var text;
	if (nick == null) {
	    App.active = true;
	    text = "You are drawing.";
	} else {
	    App.active = false;
	    text = nick + " is drawing.";
	}

	// TODO: extract function of appending text
	// display notification of active-drawer status
	var textarea = document.getElementById("chat-area");
	textarea.value += text + "\n";
	textarea.scrollTop = textarea.scrollHeight;

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

    // global key events
    window.addEventListener("keyup", function(event) {
	// undo when U is pressed 
	// TODO: unless typing
	if (event.which == 85) {
	    App.undo();
	}
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

