var Draw = {};

/**
 * Initialise canvas and context
 */
Draw.init = function() {

    // create a canvas element
    Draw.canvas = document.createElement("canvas");
    document.getElementById("drawing").appendChild(Draw.canvas);
    var parentSize = Draw.canvas.parentNode.getBoundingClientRect();
    Draw.canvas.width = parentSize.width;
    Draw.canvas.height = parentSize.height;

    // make canvas focusable
    Draw.canvas.tabIndex = 1;

    // drawing settings
    Draw.ctx = Draw.canvas.getContext("2d");
    Draw.ctx.fillstyle = "solid";
    Draw.ctx.strokeStyle = "#0078ff";
    Draw.ctx.lineWidth = 5;
    Draw.ctx.lineCap = "round";

    // whether or not the mouse is pressed
    Draw.drawing = false;

    Draw._addEventListeners();
};

/**
 * Draw from given data.
 * @param {Object} data - Contains information what to draw.
 * @param {string} data.type - The type of event to emulate.
 */
Draw.draw = function(data) {	
    if (data.type == "mousemove")
	Draw._drawMove(data);
    else if (data.type == "mouseup")
	Draw._drawUp(data);
    else if (data.type == "mousedown")
	Draw._drawDown(data);
    else {
	// TODO: REMOVE
	console.log("FAILED DRAW");
	console.log(data);
    }
};

/**
 * Clear the canvas
 */
Draw.clear = function() {
    Draw.ctx.clearRect(0, 0, Draw.canvas.width, Draw.canvas.height);
};

/**
 * Add event-listeners for canvas 
 */
Draw._addEventListeners = function() {
    // add event listeners
    if (document.addEventListener) {
	Draw.canvas.addEventListener("mousedown", Draw._mouseDown);
	Draw.canvas.addEventListener("mouseup", Draw._mouseUp);
	Draw.canvas.addEventListener("mousemove", Draw._mouseMove);
	Draw.canvas.addEventListener("keyup", Draw._keyUp);
	
	// touch-screen support
	Draw.canvas.addEventListener("touchstart", Draw._mouseDown);
	Draw.canvas.addEventListener("touchend", Draw._mouseUp);
	Draw.canvas.addEventListener("touchmove", Draw._mouseMove);
    }
    else if (document.attachEvent) {
	// for cross-browser support IE8-
	Draw.canvas.attachEvent("mousedown", Draw._mouseDown);
	Draw.canvas.attachEvent("mouseup", Draw._mouseUp);
	Draw.canvas.attachEvent("mousemove", Draw._mouseMove);
	Draw.canvas.attachEvent("keyup", Draw._keyUp);

	Draw.canvas.attachEvent("touchstart", Draw._mouseDown);
	Draw.canvas.attachEvent("touchend", Draw._mouseUp);
	Draw.canvas.attachEvent("touchmove", Draw._mouseMove);
    }
};

Draw._keyUp = function(event) {
    // undo on u, only if artist
    if (event.which == 85 && App.active) {
	App.undo();
    }
};

Draw._mouseDown = function(event) {
    if (App.active == false) 
	return;

    Draw.drawing = true;

    var rect = Draw.canvas.getBoundingClientRect();
    var e = {};
    e.type = "mousedown";
    if (event.type == "mousedown") {
	e.clientX = (event.clientX - rect.left) / 
	    (rect.right - rect.left) * Draw.canvas.width;
	e.clientY = (event.clientY - rect.top) / 
	    (rect.bottom - rect.top) * Draw.canvas.height;
    } else {
	// set from touch
	e.clientX = event.PageX;
	e.clientY = event.PageY;
	
	// also set focus to canvas
	Draw.canvas.focus();
     }

    // start line and emit to other clients
    Draw._drawDown(e);
    App.draw(JSON.stringify({
	"type": e.type,
	"clientX": e.clientX,
	"clientY": e.clientY
    }));
};

Draw._mouseUp = function(event) {
    if (App.active == false) 
	return;

    Draw.drawing = false;
   
    // stop drawing and send to server
    Draw._drawUp(event); 
    App.draw(JSON.stringify({
	"type": "mouseup"
    }));
};

Draw._mouseMove = function(event) {
    // only draw if user is artist and mouse is down
    if (App.active == false || !Draw.drawing)
	return;

    var rect = Draw.canvas.getBoundingClientRect();
    var e = {};
    e.type = "mousemove"; 
    if (event.type =="mousemove") {
	e.clientX = (event.clientX - rect.left) / 
	    (rect.right - rect.left) * Draw.canvas.width;
	e.clientY = (event.clientY - rect.top) / 
	    (rect.bottom - rect.top) * Draw.canvas.height;
    } else {
	// use touch-screen properties
	e.clientX = event.PageX;
	e.ClienyY = event.PageY;
    }
    // draw the move and emit object to other clients
    Draw._drawMove(e);
    App.draw(JSON.stringify({
	"type": e.type,
	"clientX": e.clientX,
	"clientY": e.clientY
    }));
};

Draw._drawUp = function(event) {
    // close path
    Draw.ctx.closePath();
};

Draw._drawDown = function(event) {
    // start line
    Draw.ctx.moveTo(event.clientX, event.clientY);
    Draw.ctx.beginPath();
};

Draw._drawMove = function(event) {
    // draw the line
    Draw.ctx.lineTo(event.clientX, event.clientY);
    Draw.ctx.stroke();
};
