function join() {
    var nickname = document.getElementById("nickname").value;
    // TODO: flashy animation screen?
    // TODO: verify nickname not taken
    console.log(nickname);
    window.location.href = "/draw/index.html";
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
