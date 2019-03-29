const express = require('express');
const multer = require('multer'); 
const fs = require('fs'); //use the file system so we can save files
const cors = require('cors')

var path = '../Projects/tmp'
const upload = multer({
  dest: path // this saves your file into a directory called "uploads"
});

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
    console.log(req.file);
    res.status(204).send();
    changeFileName(req.file)
    //send back that everything went ok
});

app.listen(9025);
function changeFileName(fileData){
    fs.rename(fileData.path, fileData.destination + '/' +fileData.originalname, function (err) {
      if (err) throw err;
      console.log('renamed complete');
    });
}

// Create the HTTP Server
var WebSocketServer = require('websocket').server;
var http = require('http');
var server = http.createServer(function(request, response) {
    response.end("Good");});
// var server = http.createServer(app);

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
                    project: msg.project,
                    editing: msg.track,
                    connection: connection
                };

                var userMsg = {
                    id: id,
                    name: msg.name,
                    project: msg.project,
                    type: 'user'
                }

                clients[id] = clientObj;
                clients.map((client) =>{
                    if(client.project === msg.project){
                        client.connection.sendUTF(JSON.stringify(userMsg));
                    }  
                })
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
                                // url: "C:/home/farora/www/waudio-editor/Projects/TestProject1/Migrabacion2.wav",
                                url: "http://ecv-etic.upf.edu/students/2019/farora/waudio-editor/Projects/TestProject1/Migrabacion2.wav",
                                timeline: [{begin:30000, end: 60000}, {begin:102000, end:200000}], 
                                cuts: [{begin: 60000 , end: 90000},{begin:102000, end:200000}],
                                gain: 0.8,
                                editor: ''
                        },{
                                name: 'Migrabacion2.wav',
                                // url: "C:/Users/Felix/Desktop/waudio-editor/Projects/Projects/TestProject1/Migrabacion2.wav",
                                url: "http://ecv-etic.upf.edu/students/2019/farora/waudio-editor/Projects/TestProject1/Migrabacion2.wav",
                                timeline: [{begin:0, end: 430496}], 
                                cuts: [{begin:0, end: 430496}],
                                gain: 0.1,
                                editor: ''
                        }
                        ],
                        type: 'project'
                    };
                    // var project = {
                    //     name: msg.name,
                    //     path: '../Projects/' + msg.name,
                    //     size: 0,
                    //     audios:[],
                    //     type: 'project'
                    // };
                    projects[msg.name] = project;
                }
                else{
                    var project = projects[msg.name];
                }
                connection.sendUTF(JSON.stringify(project));
            }

            else if(msg.type === 'moveAudio'){
                if(msg.editor === projects[msg.project].audios[msg.track].editor){
                    projects[msg.project].audios[msg.track].timeline[msg.clip] = msg.timeline;
                    projects[msg.project].size = msg.size; //TODO: Maybe if
                    var moveMsg = {
                        track: msg.track,
                        clip: msg.clip,
                        size: msg.size,
                        timeline: msg.timeline,
                        type: 'moveAudio',
                    };
                    clients.map((client) =>{
                        if(client.project === msg.project){
                            client.connection.sendUTF(JSON.stringify(moveMsg));
                        }  
                    })
                }
                else{
                    var notEditorMsg = {
                        data: 'You are not the editor of this track',
                        type: 'editDeny'
                    }

                    connection.sendUTF(JSON.stringify(notEditorMsg))
                }
            }

            else if(msg.type === 'cutAudio'){
                if(msg.editor === projects[msg.project].audios[msg.track].editor){

                    projects[msg.project].audios[msg.track]['cuts'].splice(msg.clip,1,...msg.cuts);
                    projects[msg.project].audios[msg.track]['timeline'].splice(msg.clip,1,...msg.timelines);
                    var cutMsg = {
                        track: msg.track,
                        clip: msg.clip,
                        timelines: msg.timelines,
                        cuts: msg.cuts,
                        type: 'cutAudio',
                    };
                    clients.map((client) =>{
                        if(client.project === msg.project){
                            client.connection.sendUTF(JSON.stringify(cutMsg));
                        }  
                    })
                }
                else{
                    var notEditorMsg = {
                        data: 'You are not the editor of this track',
                        type: 'editDeny'
                    }

                    connection.sendUTF(JSON.stringify(notEditorMsg))
                }
                //TODO:Process data in own world
                //TODO: Send Message
            }

            else if(msg.type === 'gainChange'){
                if(msg.editor === projects[msg.project].audios[msg.track].editor){
                    projects[msg.project].audios[msg.track].gain = msg.gain;
                    
                    var gainMsg = {
                        track: msg.track,
                        gain: msg.gain,
                        type: 'gainChange',
                    };

                    clients.map((client) =>{
                        if(client.project === msg.project){
                            client.connection.sendUTF(JSON.stringify(gainMsg));
                        }  
                    })
                }
                else{
                    var notEditorMsg = {
                        data: 'You are not the editor of this track',
                        type: 'editDeny'
                    }

                    connection.sendUTF(JSON.stringify(notEditorMsg))
                }
            }

            else if(msg.type === 'reqEdit'){
                console.log(msg)
                if(projects[msg.project].audios[msg.track].editor === ''){
                    if(msg.editing!==null){
                        projects[msg.project].audios[msg.editing].editor = '';
                    }

                    var editorObj = {
                        editorName: msg.name,
                        data: 'accepted',
                        editing: msg.editing,
                        track: msg.track,
                        type: 'editorMsg',
                    }

                    clients[id].editing = msg.track;
                    projects[msg.project].audios[msg.track].editor = msg.name;
                    
                    clients.map((client) =>{
                        if(client.project === msg.project){
                            client.connection.sendUTF(JSON.stringify(editorObj));
                        }  
                    })
                }
                else{
                    var deniedEdit = {
                        editorName: projects[msg.project].audios[msg.track].editor,
                        data: 'denied',
                        track: msg.track,
                        type: 'editorMsg',
                    }

                    connection.sendUTF(JSON.stringify(deniedEdit))
                }
                //TODO:Process data in own world
                //TODO: Send Message
            }

            else if(msg.type === 'uploadAudio'){
                var newTrack = {
                    name: msg.filename,
                    //Track Name?
                    // url: "C:/home/farora/www/waudio-editor/Projects/TestProject1/Migrabacion2.wav",
                    url: 'http://ecv-etic.upf.edu/students/2019/farora/waudio-editor/Projects/tmp/'+ msg.filename,
                    // timeline: [{begin:0}], 
                    // cuts: [{}],
                    gain: 0.5,
                    editor: ''
                }
                var trackNum = projects[msg.project].audios.length;
                projects[msg.project].audios.push(newTrack);
                
                
                // projects[msg.project].audios[trackNum] = {};
                // projects[msg.project].audios[trackNum].name = msg.filename;

                console.log(projects[msg.project]);
                newTrack['type'] = 'newTrack';

                clients.map((client) =>{
                    if(client.project === msg.project){
                        client.connection.sendUTF(JSON.stringify(newTrack));
                    }  
                })

            }

            else if(msg.type === 'sizeChange'){
                projects[msg.project].size = msg.newSize;
            }

            else if(msg.type === 'updateTimeCut'){
                console.log(projects[msg.project].audios[msg.track])
                projects[msg.project].audios[msg.track]['cuts'] = [];
                projects[msg.project].audios[msg.track]['cuts'] = msg.cuts;
                projects[msg.project].audios[msg.track]['timeline'] = [];
                projects[msg.project].audios[msg.track]['timeline'] = msg.timelines;
            }
        }
    });
    
    // When a user closes connecton with the server
    connection.on('close', function(connection) {
        var disc_msg = {
            id: id,
            name: clients[id].name,
            project: clients[id].project,
            editing: clients[id].editing,
            type: 'disconnection'
        }

        if(clients[id].editing !== null){
            projects[clients[id].project].audios[clients[id].editing].editor = '';
        }

        clients.map((client) =>{
            if(client.project === clients[id].project){
                client.connection.sendUTF(JSON.stringify(disc_msg));
            }  
        })
    });

});

