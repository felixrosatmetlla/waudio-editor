// Create the HTTP Server
var WebSocketServer = require('websocket').server;
var http = require('http');
var server = http.createServer(function(request, response) {
    response.end("Good");
});

// Server will listen at port 9023
server.listen(9023, function() { 
	console.log("Server listening to port 9023");
});

// Create the Websocket Server
wsServer = new WebSocketServer({
    httpServer: server
});

// Provisional variable, pendant to update if we implement database
projects = [];
clients = [];
// On request connection to the server
wsServer.on('request', function(request) {

    // The server accpets the connection
    var connection = request.accept(null, request.origin);
	
    //TODO: set user id
    var id = clients.length;

    // On message received
    connection.on('message', function(message) {

        // We ensure that it is encoded in utf8
        if (message.type === 'utf8') {

            // We get the message object and check the type of message
            var msg = JSON.parse(message.utf8Data);

            if (msg.type === 'user'){
                var clientObj = {
                    id: id,
                    name: msg.name,
                    connection: connection
                }
                clients.push(clientObj);
            }

            if (msg.type === 'reqProj'){
                var project = projects[msg.name];
                connection.sendUTF(JSON.stringify(project));
            }
        }
    });
    
    // When a user closes connecton with the server
    connection.on('close', function(connection) {
        
    });

});

