var expect = require("chai").expect;
var request = require("request");

var port = 3000;
var io = require("socket.io-client");
var server = require("../server.js");

var SERVER_URL = "http://localhost:" + port;
var SERVER_OPTIONS =  
    {
	"reconnection delay": 0,
	"reopen delay": 0,
	"force new connection": true,
	transports: ["websocket"]
    };

describe("Test socket connection", function() {
    var client;

    beforeEach(function(done) {
	
	// start server
	server.listen(port);

	// setup socket
	client = io.connect(SERVER_URL, SERVER_OPTIONS);

	client.on("connect", function() {
	    //console.log("Connected.");
	    done();
	});

	client.on("disconnect", function() {
	    //console.log("Disconnected.");
	});
    });

    afterEach(function(done) {
	
	// close connection if not already done
	if (client.connected) {
	    client.disconnect();
	}
	
	server.close();
	done();
    });

    describe("room", function() {

	it("Room not provided", function(done) {
	    client.emit("room", null);

	    client.once("room", function(data) {
		console.log(data);	
		done();
	    });
	});

	it("Room does not exist", function(done) {
	    client.emit("room", "non-existent-room");
	    done();
	});

	it("Room exist", function(done) {
	    client.emit("room", "existing-room");
	    done();
	});

    });
});
