(function() {
    var App = {};
    App.init = function() {
        // create a canvas element
        App.canvas = document.createElement("canvas");
        App.canvas.height = 400;
        App.canvas.width = 400;

        // append canvas element to article
        document.getElementById("drawing").appendChild(App.canvas);

        // drawing settings
        App.ctx = App.canvas.getContext("2d");
        App.ctx.fillstyle = "solid";
        App.ctx.strokeStyle = "#0078ff";
        App.ctx.lineWidth = 5;
        App.ctx.lineCap = "round";
        App.drawing = false;

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

        function mouseDown(event) {
            App.drawing = true;
            App.ctx.moveTo(event.clientX, event.clientY);
            App.ctx.beginPath();
        };

        function mouseUp(){
            App.drawing = false;
            App.ctx.closePath();
        };

        function mouseMove(event) {

            // only draw if the mouse is down
            if (!App.drawing)
                return;

            App.ctx.lineTo(event.clientX, event.clientY);
            App.ctx.stroke();
        };
    };

    // create App on window load
    window.onload = App.init;

}).call(this);
