var Login = {};

Login.init = function() {

    this._addKeyUpListener(document.getElementById("join-room-password"), 
	Login.onKeyUp(this.join, this.focusJoin));
    this._addKeyUpListener(document.getElementById("create-room-password"), 
	Login.onKeyUp(this.create, this.focusCreate));
    
    this._addKeyUpListener(document.getElementById("join-room-text"), 
	this.onKeyUp(
	    Login.room.bind(
		this, 
		document.getElementById("join-room-text"),
		Login.joinCallback
	    )
	)
    );
    
    this._addKeyUpListener(document.getElementById("create-room-text"), 
	this.onKeyUp(
	    Login.room.bind(
		this, 
		document.getElementById("create-room-text"),
		Login.createCallback
	    )
	)
    );

    this._addKeyUpListener(document.getElementById("nick-text"),
	Login.onKeyUp(this.nick, Login.focus.bind(this, true)));

    document.getElementById("join-room-button").onclick =
	Login.room.bind(
	    this,
	    document.getElementById("join-room-text"),
	    Login.joinCallback
	);

    document.getElementById("create-room-button").onclick =
	Login.room.bind(
	    this,
	    document.getElementById("create-room-text"),
	    Login.createCallback
	);


    // hover-listener on join/create room articles
    var rooms = document.getElementsByClassName("rooms");
    for(var i = 0; i < rooms.length; i++) {
	rooms[i].addEventListener("mouseenter", 
	    this.focusRoom.bind(this, rooms[i], true));
	rooms[i].addEventListener("mouseleave", 
	    this.focusRoom.bind(this, rooms[i], false));
    }
};

Login.onKeyUp = function(enterFunc, escapeFunc) {
    return function(keyCode) {
	if (escapeFunc != null && keyCode == 27) {
	    // ESC
	    escapeFunc();
	} else if (enterFunc != null && keyCode == 13) {
	    // ENTER
	    enterFunc();
	}
    };
};

Login.createCallback = function(data) {
    if (data.room == null) {
	Login.showError(false);
	Login.createRoom();
    } else {
	Login.focusCreate();
	Login.showError(true, "There is already a room with given name.");
    }
};

Login.joinCallback = function(data) {
    if (data.room == null) {
	// room does not exist
	Login.focusJoin();
	Login.showError(true, "The room does not exist.");
    } else { 
	// remove previous errors
	Login.showError(false);

	if (data.password) { 
	    // password required
	    Login.showPassword();
	} else {
	    // nothing more needed, just join
	    Login.join();
	}
    }
};

Login.createRoom = function() {
    Login.displayRoomOptions(document.getElementById("create"), true);
    document.getElementById("create-room-text").style.display = "none";
    document.getElementById("create-room-password").style.display = "block";
    document.getElementById("create-room-password").focus();
    document.getElementById("create-room-button").onclick = this.create;
};

Login.focus = function(focus) {
    if (focus) {
	// clear errors
	this.showError(false);

	// make sure rooms are focused instead of nick
	this.focusNick(false);
    }

    // show or hide
    document.getElementById("login").style.display = 
	focus ? "block" : "none";
};

Login.showError = function(show, message) {
    document.getElementById("login-error-message").innerHTML =
	show ? message : "";
    document.getElementById("login-error").style.display = 
	show ? "block" : "none";
};

Login.join = function() {
    room = document.getElementById("join-room-text").value;
    password = document.getElementById("join-room-password").value;

    App.join(room, password);
};

Login.room = function(element, callback) {
    element.disabled = true;
    App.room(element.value, callback);
}

Login.create = function() {
    App.create(document.getElementById("create-room-text").value,
	document.getElementById("create-room-password").value,
	document.getElementById("create-room-private").checked);
};

Login.nick = function() {
    App.nick(document.getElementById("nick-text").value);
};

Login.focusRoom = function(element, focus=true) {
    
    // otherwise update status
    element.focused = focus;

    // set focus to input
    element.children[1].disabled = false;
    element.children[1].focus();

    // show input
    var hyperlink = element.children[0];
    if (focus) {
	hyperlink.classList.add("shrink");
	hyperlink.classList.remove("anti-shrink");
    } else {
	hyperlink.classList.add("anti-shrink");
	hyperlink.classList.remove("shrink");
    }
    
    if (element.id == "join") {
        this.focusJoin();
	App.rooms();
    } else {
	this.focusCreate();
    }

    if (element.id == "join" || !focus) {
        this.displayRoomOptions(element, focus);
    }
};

Login.focusNick = function(focus=true) {

    // hide previous errors
    Login.showError(false);

    // show either rooms or nick
    if (focus) {
	document.getElementById("nick-text").focus();
	document.getElementById("join").style.display = "none";
	document.getElementById("create").style.display = "none";
	document.getElementById("nick").style.display = "block";
    } else {
	document.getElementById("create-room-password").onclick = 
	    this.room.bind(
		null,
		document.getElementById("create-room-text"),
		Login.createCallBack
	    );	
	document.getElementById("join-room-password").onclick = 
	    this.room.bind(
		null,
		document.getElementById("join-room-text"),
		Login.joinCallback
	    );
	document.getElementById("nick").style.display = "none";	
	document.getElementById("join").style.display = "block";	
	document.getElementById("create").style.display = "block";
    }
}

Login.focusJoin = function() {
    var text = document.getElementById("join-room-text");
    document.getElementById("join-room-password").style.display = "none";
    text.style.display = "block";
    text.disabled = false;
    text.focus();
};

Login.focusCreate = function() {
    var text = document.getElementById("create-room-text");
    document.getElementById("create-room-password").style.display = "none";
    text.style.display = "block";
    text.disabled = false;
    text.focus();
};


Login.displayRoomOptions = function(element, focus) {
    element.children[3].style.display = focus ? "block" : "none";
};

Login.showPassword = function(show=true) {
    var password = document.getElementById("join-room-password");
    var button = document.getElementById("join-room-button");
    var text = document.getElementById("join-room-text");
    password.style.display = show ? "block" : "none";
    text.style.display = show ?
	"none" : "block";
   
    // set focus respectively and set button to respond same
    if (show) {
        password.focus();
	button.onclick = this.join;
    } else {
	password.blur();
	button.onclick = this.room.bind(
	    null,
	    text, 
	    Login.joinCallback);
    }
};

/**
 * Add listener for keyup.
 * @param {element} element - Element to add listener to.
 * @param {function} callback - Function to call when event occurs.
 */
Login._addKeyUpListener = function(element, callback) {
    element.addEventListener("keyup", function(event) {
	event.preventDefault();
	callback(event.keyCode);
    });
};

/**
 * Fill the room-list with room-list-items from given list.
 * @param {Object[]} list - List of the rooms to add.
 */
Login.fillRoomList = function(list) {
    
    // get room-list and clear it
    var roomList = document.getElementById("room-list");
    while (roomList.firstChild)
	roomList.removeChild(roomList.firstChild);

    if (list.length == 0) {
	// let user know if no visible rooms were found
	var item = document.createElement("p");
	item.className = "no-rooms";
	item.appendChild(document.createTextNode(
	    "There are no visible rooms."
	));
	roomList.appendChild(item);
    } else {
	// add all rooms
	list.forEach(function(room) {
	   // create list object and append to list
	    roomList.appendChild(Login._createListItem(room));
	});
}
};

/**
 * Create room list-item for room.
 * @param {Object} room - The room to create object of.
 * @param {string} room.name - The name of the room.
 * @param {boolean} room.password - Whether room is passworded or not.
 * @param {int} room.users - The amount of players in room.
 * @return // TODO
 */
Login._createListItem = function(room) {
    var item = document.createElement("div");
    item.className = "room-list-item";
    
    // room info div
    var info = document.createElement("div");
    info.className = "room-list-info";

    // create children
    var name = document.createElement("div");
    name.appendChild(document.createTextNode(room.name));
    
    var password = document.createElement("div");
    
    password.appendChild(document.createTextNode(
	room.password ? "Yes" : "No"
    ));

    var users = document.createElement("div");
    users.appendChild(document.createTextNode(room.users));
    
    // append children
    info.appendChild(name);
    info.appendChild(password);
    info.appendChild(users);
    item.appendChild(info);
    if (room.password) { 
	var passwordItem = document.createElement("input");
	passwordItem.type = "password";
	passwordItem.placeholder = "password";
	
	item.appendChild(passwordItem);
	item.showPassword = function(bool) {
	    passwordItem.style.display = bool ? "block" : "none";
	    if (bool)
		passwordItem.focus();
	    else
		passwordItem.blur();
	}
	passwordItem.addEventListener("keyup", function(event) {
	    event.preventDefault();
	    if (event.keyCode == 13) {
		// enter
		App.join(room.name, passwordItem.value);
	    } else if (event.keyCode == 27) {
		// esc
		item.showPassword(false);
	    }
	});
    }

    // append a eventlistener
    item.addEventListener("click", function(event) {
	if (room.password) {
	    this.showPassword(true);
	} else {
	    App.join(room.name);
	}
    });

    item.addEventListener("mouseleave", function(event) {
	if (room.password)
	    this.showPassword(false);
    });

    return item;
};

