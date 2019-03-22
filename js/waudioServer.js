const express = require('express');
const multer = require('multer');
var path = '../Projects/tmp'
const upload = multer({
  dest: path // this saves your file into a directory called "uploads"
}); 
const fs = require('fs'); //use the file system so we can save files
const cors = require('cors')

//Get wav file from binary only by changing name
// var path = '/Users/felixrosatmetlla/waudio-editor/js/uploads/6e378b2afbb843ed6476e446369ea658';
// fs.rename('/Users/felixrosatmetlla/waudio-editor/js/uploads/6e378b2afbb843ed6476e446369ea658', '/Users/felixrosatmetlla/waudio-editor/js/uploads/violin.wav', function (err) {
//   if (err) throw err;
//   console.log('renamed complete');
// });

const app = express();
app.use(express.static('/home/farora/www/waudio-editor/'));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.get('/',(req, res) => {
  res.sendFile('/home/farora/www/waudio-editor/html' + '/index.html');
});


// It's very crucial that the file name matches the name attribute in your html
app.post('/', upload.single('audio'), (req, res) => {
    console.log(req);
  // res.sendStatus(200); //send back that everything went ok
});

app.listen(3000);


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
    console.log(id);

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
                };
                clients.push(clientObj);
            }

            else if (msg.type === 'reqProj'){
                if(projects[msg.name] === undefined){
                    var project = {
                        name: msg.name,
                        path: '../Projects/' + msg.name,
                        size: 430496,
                        audios:[
                            {
                                name: 'Migrabacion2.wav',
                                //Track Name?
                                // url: "C:/Users/Felix/Desktop/waudio-editor/Projects/Projects/TestProject1/Migrabacion2.wav",
                                url: "http://ecv-etic.upf.edu/students/2019/farora/waudio-editor/Projects/TestProject1/Migrabacion2.wav",
                                timeline: [{begin:50000, end: 60000}, {begin:2000, end:3000}], 
                                cuts: [{begin: 50000 , end: 60000},{begin: 2000, end:3000}],
                                gain: 0.5,
                                editor: ''
                        },{
                                name: 'Migrabacion2.wav',
                                // url: "C:/Users/Felix/Desktop/waudio-editor/Projects/Projects/TestProject1/Migrabacion2.wav",
                                url: "http://ecv-etic.upf.edu/students/2019/farora/waudio-editor/Projects/TestProject1/Migrabacion2.wav",
                                timeline: [{begin:0, end: 430496}], 
                                // cuts: {},
                                gain: 0.5,
                                editor: ''
                        }
                        ],
                        type: 'project'
                    };
                    projects[msg.name] = project;
                }
                else{
                    var project = projects[msg.name];
                }
                connection.sendUTF(JSON.stringify(project));
            }

            else if(msg.type === 'moveAudio'){
                //TODO:Process data in own world
                //TODO: Send Message
            }

            else if(msg.type === 'cutAudio'){
                //TODO:Process data in own world
                //TODO: Send Message
            }

            else if(msg.type === 'gainChange'){
                //TODO:Process data in own world
                //TODO: Send Message
            }
        }
    });
    
    // When a user closes connecton with the server
    connection.on('close', function(connection) {
        
    });

});

