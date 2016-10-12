var Login = {};

Login.fillRoomList = function(list) {
    
    // get room-list and clear it
    var roomList = document.getElementById("room-list");
    while (roomList.firstChild)
	roomList.removeChild(roomList.firstChild);

    list.forEach(function(room) {
	// create list object and append to list
	roomList.appendChild(Login._createListItem(room));
    });
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
    password.appendChild(document.createTextNode(room.password));

    var users = document.createElement("div");
    users.appendChild(document.createTextNode(room.users));
    
    // append children
    item.appendChild(name);
    item.appendChild(password);
    item.appendChild(users);

    return item;
};

Login.showError = function(message) {
    document.getElementById("login-error-message").innerHTML = message;
    document.getElementById("login-error").style.display = "block";

    // reenable input fields
    document.getElementById("nick-text").disabled = false;
    document.getElementById("nick-text").focus();
    document.getElementById("join-room-text").disabled = false;
    document.getElementById("create-room-text").disabled = false;
};

Login.hideError = function() {
    document.getElementById("login-error").style.display = "none";
};

Login.joinRoom = function() {
    App.joinRoom(document.getElementById("join-room-text").value);
    document.getElementById("join-room-text").disabled = true;
    document.getElementById("join-room-button").focus();
};

Login.createRoom = function() {
    // try creating room
    App.createRoom(document.getElementById("create-room-text").value);
    document.getElementById("create-room-text").disabled = true;
    document.getElementById("create-room-button").focus();
};

Login.register = function() {

    // send nick to server
    App.sendNick(document.getElementById("nick-text").value);
    
    // set focus to button and disable text input
    document.getElementById("nick-text").disabled = true;
    document.getElementById("nick-button").focus();
};

Login.showNick = function() {
    // hide previous errors
    Login.hideError();

    // hide room buttons
    var elements = document.getElementsByClassName("rooms");
    for (var i = 0; i < elements.length; i++) {
	elements[i].style.display = "none";
    }

    // show nick entry and focus input
    document.getElementById("nick").style.display = "block";
    document.getElementById("nick-text").focus();
};

Login.showLoginPage = function() {

    // hide previous errors
    Login.hideError();

    // show login and hide content
    document.getElementById("content").style.display = "none";
    document.getElementById("login").style.display = "block";

    // hide nick and show rooms
    document.getElementById("nick").style.display = "none";
    var elements = document.getElementsByClassName("rooms");
    for (var i = 0; i < elements.length; i++) {
	elements[i].style.display = "block";
    }
};

// make the main page visible
Login.showMainPage = function() {
    // hide the login page and previous errors
    document.getElementById("login").style.display = "none";
    document.getElementById("content").style.display = "block";
    Login.hideError();

    // set focus to message-box
    document.getElementById("message").focus();
};

// add slides to button-covers
function createSlideButtons(id) {
    
    // set focus to input field when hovering over cover
    document.getElementById(id)
	.addEventListener("mouseover", function(event) {
	    // set focus to input
	    document.getElementById(id + "-text").focus();

	    // show input
	    this.classList.add("shrink");
	    this.classList.remove("anti-shrink");

	});

    // when focus is lost of input hide the input again
    document.getElementById(id + "-text")
	.addEventListener("blur", function(e) {

	    // hide input
	    var label = document.getElementById(id);
	    label.classList.remove("shrink");
	    label.classList.add("anti-shrink");

	}, true);
}

// onload
window.addEventListener("load", function() {

    // create sliding buttons
    createSlideButtons("join-room");
    createSlideButtons("create-room");

    // focus text input and 
    document.getElementById("nick-text").focus();
    document.getElementById("nick-text")
	.addEventListener("keyup", function(event) {
	    event.preventDefault();
	    if (event.which == 13) {
		Login.register();
	    }
	});


    document.getElementById("join-room-text")
	.addEventListener("keyup", function(event) {
	    event.preventDefault();
	    if (event.which == 13) {
		Login.joinRoom();
	    }
	});


    document.getElementById("create-room-text")
	.addEventListener("keyup", function(event) {
	    event.preventDefault();
	    if (event.which == 13) {
		Login.createRoom();
	    }
	});
});
