var app = require("express")();
var http = require("http").Server(app);

app.get("/", function(req, res) {
    res.sendFile(__dirname + "/index.html");
});

app.use("/styles", express.static(__dirname + "/styles"));
app.use("/scripts", express.static(__dirname + "/scripts"));

http.listen(3000, function() {
    console.log("Listening on port 3000.");
});

