var Login = {};

Login.init = function() {

    this._addEnterListener(document.getElementById("join-room-text"),
	this.join);
    this._addEnterListener(document.getElementById("create-room-text"),
	this.createRoom);
    this._addEnterListener(document.getElementById("nick-text"),
	this.nick);
    this._addEnterListener(document.getElementById("create-room-password"),
	this.create);
    this._addEnterListener(document.getElementById("join-room-password"),
	this.join);

    // hover-listener on join/create room articles
    var rooms = document.getElementsByClassName("rooms");
    for(var i = 0; i < rooms.length; i++) {
	rooms[i].focused = false;
	rooms[i].addEventListener("mouseover", 
	    this.focusRoom.bind(this, rooms[i], true));
	rooms[i].addEventListener("mouseout", 
	    this.focusRoom.bind(this, rooms[i], false));
    }
};

Login.createRoom = function() {
    Login.displayRoomOptions(document.getElementById("create"), true);
    document.getElementById("create-room-password").focus();
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

Login.join = function(room=null) {

    // fetch name of room from text or given room
    if (room == null) {	
	room = document.getElementById("join-room-text").value;
    } else {
	if (room.password) {
	    this.showPassword()
	}
	room = room.name;
    }
    
    // if there is a password
    password = document.getElementById("join-room-password").value;

    App.join(room, password);
};

Login.create = function() {
    App.create(document.getElementById("create-room-text").value,
	document.getElementById("create-room-password").value,
	document.getElementById("create-room-private").checked);
};

Login.nick = function() {
    App.nick(document.getElementById("nick-text").value);
};

Login.focusRoom = function(element, focus=true) {
    // no need to do anything if already focused
    if (focus == element.focused)
	return;
    
    // otherwise update status
    element.focused = focus;

    // show input
    var hyperlink = element.children[0];
    if (focus) {
	hyperlink.classList.add("shrink");
	hyperlink.classList.remove("anti-shrink");
    } else {
	hyperlink.classList.add("anti-shrink");
	hyperlink.classList.remove("shrink");
	this.showPassword(false);
    }
    
    if (element.id == "join") {
        this.focusJoin(element, focus);
    }

    if (element.id == "join" || !focus) {
        this.displayRoomOptions(element, focus);
    }
};

Login.focusNick = function(focus=true) {

    // show either rooms or nick
    if (focus) {
	document.getElementById("join").style.display = "none";
	document.getElementById("create").style.display = "none";
	document.getElementById("nick").style.display = "block";
    } else {
	document.getElementById("nick").style.display = "none";	
	document.getElementById("join").style.display = "block";	
	document.getElementById("create").style.display = "block";
    }
}

Login.focusJoin = function(element, focus) {
    if (focus) {
	// get available rooms
	App.rooms();

    } else {

    }

};

Login.displayRoomOptions = function(element, focus) {
    element.children[3].style.display = focus ? "block" : "none";
};

Login.showPassword = function(show=true) {
    document.getElementById("join-room-password").style.display = show ?
	"block" : "none";
};

/**
 * Add listener for enter-keyup.
 * @param {element} element - Element to add listener to.
 * @param {function} callback - Function to call when event occurs.
 */
Login._addEnterListener = function(element, callback) {
    element.addEventListener("keyup", function(event) {
	event.preventDefault();
	
	// callback on enter
	if (event.which == 13) {
	    callback();
	}
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

    list.forEach(function(room) {
	// create list object and append to list
	roomList.appendChild(Login._createListItem(room));
    });

    if (roomList.children.length == 0) {
	// let user know if no visible rooms were found
	var item = document.createElement("p");
	item.className = "no-rooms";
	item.appendChild(document.createTextNode(
	    "There are no visible rooms."
	));
	roomList.appendChild(item);
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
    item.appendChild(name);
    item.appendChild(password);
    item.appendChild(users);

    // append a eventlistener
    item.addEventListener("click", function(event) {
	if (room.password) {
	    // TODO: add password under item instead
	    Login.showPassword();
	} else {
	    Login.join(room);
	}
    });

    return item;
};

