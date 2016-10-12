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
    // create a canvas element
    App.canvas = document.createElement("canvas");
    document.getElementById("drawing").appendChild(App.canvas);
    var parentSize = App.canvas.parentNode.getBoundingClientRect();
    App.canvas.width = parentSize.width;
    App.canvas.height = parentSize.height;

    // drawing settings
    App.ctx = App.canvas.getContext("2d");
    App.ctx.fillstyle = "solid";
    App.ctx.strokeStyle = "#0078ff";
    App.ctx.lineWidth = 5;
    App.ctx.lineCap = "round";

    // whether or not the mouse is pressed
    App.drawing = false;

    // whether or not its clients turn to draw
    App.active = false;

    // user's nick
    App.nick = null;

    // add event listeners
    if (document.addEventListener) {
	App.canvas.addEventListener("mousedown", mouseDown);
	App.canvas.addEventListener("mouseup", mouseUp);
	App.canvas.addEventListener("mousemove", mouseMove);
    }
    else if (document.attachEvent) {
	// for cross-browser support IE8-
	App.canvas.attachEvent("mousedown", mouseDown);
	App.canvas.attachEvent("mouseup", mouseUp);
	App.canvas.attachEvent("mousemove", mouseMove);
    }

    // loads the socket.io-client and connects
    var socket = io();
    App.socket = socket;

    // handle any errors that occur.
    socket.onerror = function(error) {
	console.log('WebSocket Error: ' + error);
    };

    // log whatever message sent by server (this far unused?)
    socket.onmessage = function(e) {
	console.log(e);
    };

    socket.on("exception", function(error) {
	console.log("EXCEPTION: " + error);
    });

    socket.on("artist", function(artist) {

	// set as artist if server tells you you are artist
	if (App.nick === artist) {
	    App.active = true;
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
	data = JSON.parse(data);

	if (data.type == "mousemove")
	    drawMove(data);
	else if (data.type == "mouseup")
	    drawUp(data);
	else if (data.type == "mousedown")
	    drawDown(data);
	else {
	    // TODO: REMOVE
	    console.log("FAILED DRAW");
	    console.log(data);
	}
    });

    // clear canvas
    socket.on("clear", function() {
	App.ctx.clearRect(0, 0, App.canvas.width, App.canvas.height);
    });

    function mouseDown(event) {
	if (App.active == false) 
	    return;

	App.drawing = true;

	var rect = App.canvas.getBoundingClientRect();
	var e = {};
	e.type = event.type;
	e.clientX = (event.clientX - rect.left) / 
	    (rect.right - rect.left) * App.canvas.width;
	e.clientY = (event.clientY - rect.top) / 
	    (rect.bottom - rect.top) * App.canvas.height;

	// start line and emit to other clients
	drawDown(e);
	socket.emit("draw", JSON.stringify({
	    "type": e.type,
	    "clientX": e.clientX,
	    "clientY": e.clientY
	}));
    };

    function mouseUp(event) {
	if (App.active == false) 
	    return;

	App.drawing = false;
       
	// stop drawing and send to server
	drawUp(event); 
	socket.emit("draw", JSON.stringify({
	    "type": event.type
	}));
    };

    function mouseMove(event) {
	if (App.active == false)
	    return;

	// only draw if the mouse is down
	if (!App.drawing)
	    return;

	var rect = App.canvas.getBoundingClientRect();
	var e = {};
	e.type = event.type;
	e.clientX = (event.clientX - rect.left) / 
	    (rect.right - rect.left) * App.canvas.width;
	e.clientY = (event.clientY - rect.top) / 
	    (rect.bottom - rect.top) * App.canvas.height;

	// draw the move and emit object to other clients
	drawMove(e);
	socket.emit("draw", JSON.stringify({
	    "type": e.type,
	    "clientX": e.clientX,
	    "clientY": e.clientY
	}));
    };

    function drawUp(event) {
	// close path
	App.ctx.closePath();
    };

    function drawDown(event) {
	// start line
	App.ctx.moveTo(event.clientX, event.clientY);
	App.ctx.beginPath();
    };

    function drawMove(event) {
	// draw the line
	App.ctx.lineTo(event.clientX, event.clientY);
	App.ctx.stroke();
    };

    // send message when enter is pressed
    document.getElementById("message")
	.addEventListener("keyup", function(event) {
	event.preventDefault();
	if (event.which == 13) {
	    App.sendMessage();
	}
    });

    // global key events
    window.addEventListener("keyup", function(event) {
	// undo when U is pressed 
	// TODO: unless typing
	if (event.which == 85) {
	    App.undo();
	}
    });
};

// create App on window load
window.onload = App.init;

