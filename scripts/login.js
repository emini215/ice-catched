var Login = {};

Login.showError = function(message) {
    document.getElementById("login-error").style.display = "block";
    document.getElementById("login-error-message").innerHTML = message;

    // reenable input fields
    document.getElementById("nick-text").disabled = false;
    document.getElementById("join-room-text").disabled = false;
    document.getElementById("create-room-text").disabled = false;
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

    // hide room buttons
    var elements = document.getElementsByClassName("rooms");
    for (var i = 0; i < elements.length; i++) {
	elements[i].style.display = "none";
    }

    // show nick entry and focus input
    document.getElementById("nick").style.display = "block";
};

// make the main page visible
Login.showMainPage = function() {
    // hide the login page
    document.getElementById("login").style.display = "none";

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
