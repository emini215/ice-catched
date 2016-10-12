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

    // drawing settings
    Draw.ctx = Draw.canvas.getContext("2d");
    Draw.ctx.fillstyle = "solid";
    Draw.ctx.strokeStyle = "#0078ff";
    Draw.ctx.lineWidth = 5;
    Draw.ctx.lineCap = "round";

    // whether or not the mouse is pressed
    Draw.drawing = false;

};

/**
 * Add event-listeners for canvas 
 */
Draw.addEventListeners = function() {
    // add event listeners
    if (document.addEventListener) {
	Draw.canvas.addEventListener("mousedown", mouseDown);
	Draw.canvas.addEventListener("mouseup", mouseUp);
	Draw.canvas.addEventListener("mousemove", mouseMove);
    }
    else if (document.attachEvent) {
	// for cross-browser support IE8-
	Draw.canvas.attachEvent("mousedown", mouseDown);
	Draw.canvas.attachEvent("mouseup", mouseUp);
	Draw.canvas.attachEvent("mousemove", mouseMove);
    }
};

/**
 * Draw from given data.
 * @param {Object} data - Contains information what to draw.
 * @param {string} data.type - The type of event to emulate.
 */
Draw.draw = function(data) {	
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
};

/**
 * Clear the canvas
 */
Draw.clear = function() {
    Draw.ctx.clearRect(0, 0, Draw.canvas.width, Draw.canvas.height);
};

function mouseDown(event) {
    if (App.active == false) 
	return;

    Draw.drawing = true;

    var rect = Draw.canvas.getBoundingClientRect();
    var e = {};
    e.type = event.type;
    e.clientX = (event.clientX - rect.left) / 
	(rect.right - rect.left) * Draw.canvas.width;
    e.clientY = (event.clientY - rect.top) / 
	(rect.bottom - rect.top) * Draw.canvas.height;

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

    Draw.drawing = false;
   
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
    if (!Draw.drawing)
	return;

    var rect = Draw.canvas.getBoundingClientRect();
    var e = {};
    e.type = event.type;
    e.clientX = (event.clientX - rect.left) / 
	(rect.right - rect.left) * Draw.canvas.width;
    e.clientY = (event.clientY - rect.top) / 
	(rect.bottom - rect.top) * Draw.canvas.height;

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
    Draw.ctx.closePath();
};

function drawDown(event) {
    // start line
    Draw.ctx.moveTo(event.clientX, event.clientY);
    Draw.ctx.beginPath();
};

function drawMove(event) {
    // draw the line
    Draw.ctx.lineTo(event.clientX, event.clientY);
    Draw.ctx.stroke();
};
