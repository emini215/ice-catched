
(function() {
  var io;

  io = require("socket.io").listen(4000);
  // remind user in terminal of port
  console.log("Server running on port 4000.");

  io.sockets.on("connection", function(socket) {});

}).call(this);
