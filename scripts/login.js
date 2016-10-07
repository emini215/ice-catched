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
    document.getElementById("login").style.display = "none";
};

// call function when enter is pressed
window.onload = function() {
    document.getElementById("nickname")
	.addEventListener("keyup", function(event) {
	event.preventDefault();
        if (event.which == 13) {
	    join();
	}
    });
}
