function join() {
    var nickname = document.getElementById("nickname").value;
    // TODO: flashy animation screen?
    // TODO: verify nickname not taken

    if (nickname == "") {
	// TODO: FADE IN CUS COOL
	document.getElementById("login-error-message").innerHTML = "ERROR: Nickname is bad.";
	document.getElementById("login-error").style.display = "block";
	return;
    }

    // register nick
    App.sendNick(nickname);

    // hide login
    document.getElementById("login").style.display = "none";

    // focus text-box
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

    // call join() when enter is pressed
    document.getElementById("join-room-text")
	.addEventListener("keyup", function(event) {
	    event.preventDefault();
	    if (event.which == 13) {
		join();
	    }
	});
});
