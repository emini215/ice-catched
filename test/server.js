var expect = require("chai").expect;
var request = require("request");

var port = 3000;
var io = require("socket.io-client");

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
    var server;

    beforeEach(function(done) {
	
	// make sure previous cached versions of server is deleted, then
	// import and start the server
	delete require.cache[require.resolve('../server')];
	server = require("../server.js");
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

	// make sure all connections are closed before returning done	
	server.close(done);
    });

    // test checking room status
    describe("room", function() {

	it("Room not provided", function(done) {
	    client.emit("room", null);

	    // always assume response on room, should be null
	    client.once("room", function(data) {
		expect(data.room).to.equal(null);
		done();
	    });
	});

	it("Room does not exist", function(done) {
	    client.emit("room", "non-existent-room");

	    // expect room to be null
	    client.once("room", function(data) {
		expect(data.room).to.equal(null);
		done();
	    });
	});

	it("Room exist", function(done) {
	    // create room and ask if exists
	    var roomName = "#room";
	    client.emit("create", roomName);
	    client.emit("room", roomName);

	    client.once("room", function(data) {
		expect(data.room).to.equal(roomName);
		done();
	    });
	});
    });
});
