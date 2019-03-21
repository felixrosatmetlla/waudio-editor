var context;
var testAudioBuffer;

var fs = 44100;
// Create new server object
// var socket = new WebSocket("ws://localhost:9023/");
var socket = new WebSocket("ws://ecv-etic.upf.edu:9023/");

var buffers = {};
var projectState = [];
var buffersToPlay = [{}];
var timelinesToPlay = [];
var gain = [];

var local_user = {
	id: null,
	name: '',
	editingAudio: null
}

// Login elements
var loginPage = document.querySelector('.login');
var editorPage = document.querySelector('.index');

var usernameInput = document.querySelector('#username_input');
var projectInput = document.querySelector('#project_input');
var loginButton = document.querySelector('.btn_enter');

loginButton.addEventListener('click', requestProject);

// Index elements
var playButton = document.querySelector('.play');

// playButton.addEventListener('click', prepareToPlay);

// TODO on improvements: Login Validation
function requestProject(){
	hideLogin();
	showEditor();

	context = new (window.AudioContext || window.webkitAudioContext);

	// get username value
	var username = usernameInput.value;
	var userObj = {
		name: username,
		type: 'user'
	}

	// get project name
	var projectName = projectInput.value;
	var projectObj = {
		name: projectName,
		type: 'reqProj'
	}
	// send data
	socket.send(JSON.stringify(userObj));
	socket.send(JSON.stringify(projectObj));
}

socket.onmessage = function(message){
	obj_msg = JSON.parse(message.data);

	if (obj_msg.type === 'project'){
		loadProject(obj_msg);
	}
	else if (obj_msg.type === 'moveAudio'){

	}
	else if (obj_msg.type === 'cutAudio'){

	}
	else if (obj_msg.type === 'volumeChange'){
		// changeGain(obj_msg.data.gain, obj_msg.data.audio);
	}
}

function uploadFile(){
	
}

//Generate the Wave Image to show in the timeline
var wave_cache = {};

// Function by Javi Agenjo
function getAudioWaveImage( url, callback, onError )
{
	if(wave_cache[url])
		return wave_cache[url];

	// window.AudioContext = window.AudioContext || window.webkitAudioContext;
	// var context = ANIMED.audio_context;
	// if(!context)
	// 	context = ANIMED.audio_context = new AudioContext();

	wave_cache[url] = 1;

	var request = new XMLHttpRequest();
	  request.open('GET', url, true);
	  request.responseType = 'arraybuffer';

	  // Decode asynchronously
	  request.onload = function() {
		context.decodeAudioData( request.response, function(buffer) {
			var start_time = performance.now();
			var canvas = document.createElement("canvas");
			canvas.width = Math.round(buffer.duration * 120); //120 samples per second
			canvas.height = 32;
			document.body.appendChild(canvas);
			var delta = (buffer.length / canvas.width);// * buffer.numberOfChannels;
			var ctx = canvas.getContext("2d");
			ctx.clearRect(0,0,canvas.width,canvas.height);
			ctx.fillStyle = ctx.strokeStyle = "white";
			var data = buffer.getChannelData(0);
			var pos = 0;
			var delta_ceil = Math.ceil(delta);
			ctx.beginPath();
			for(var i = 0; i < buffer.length; i += delta)
			{
				var min = 0;
				var max = 0;
				var start = Math.floor(i);
				for(var j = 0; j < delta_ceil; ++j)
				{
					var v = data[j + start];
					if(min > v) min = v;
					if(max < v) max = v;
				}
				var y = (1 + min) * 16;
				ctx.moveTo( pos, y );
				ctx.lineTo( pos, y + 16 * (max - min) );
				++pos;
			}
			ctx.stroke();
			canvas.buffer = buffer;
			wave_cache[url] = canvas;
			console.log( "wave image generation time: " + ((performance.now() - start_time)*0.001).toFixed(3) + "s");
		}, onError);
	  }
	  request.send();
}

function paintProject(buffersToPlay){

}
function loadProject(projectMsg){
	// Save Project state
	projectState = projectMsg;
	console.log(projectState.audios);
	// Load Audios needed
	if(projectState['audios'] === undefined){
		console.log('no load');
	}
	else{
		projectMsg.audios.map((x,index) => {
			loadAudio(projectMsg.audios[index].url,x, index);
		})
		
		// tRY TO AVOID SO MANY GLOBAL VARIABLES
		// for(var audio in projectMsg.audios){
			
			
		// 	gain.push(projectMsg.audios[audio].gain)
		// 	timelinesToPlay.push(projectMsg.audios[audio].timeline)
		// }

		
		

		// Read Msg to set actual state of project in screen
		// Paint
	}
	
}

function loadAudio(url,audio, index){
	// var request = new XMLHttpRequest();
	var request = createCORSRequest('GET', url);
	// request.open('GET', url, true);
	// request.responseType = 'arraybuffer';

	request.onload = function() {
		context.decodeAudioData(request.response).then(function(buffer) {
			var data = buffer.getChannelData(0);
			console.log(data);
			
			if(audio['cuts'] !== undefined){
				// Create buffers from audios
				audio.cuts.map((x,ind)=>{
					var length = x.end - x.begin;
					var emptyBuffer = new Float32Array(length);
					var dummyBuffer = context.createBuffer(1, length, 44100);
					
				    

					for (var i = x.begin, j=0; i < x.end; i++, j++) {
				        var aux = data[i]
				        emptyBuffer[j] = aux;
				    }
				    dummyBuffer.copyToChannel(emptyBuffer,0,0);
				    buffersToPlay[index][ind]=dummyBuffer;
				})

			}
			buffers[index]=data;
		}, function onError(){
			console.log('error');
		});
	}
	request.send();
}

function getAudioIndex(audioName){
	splitAudioName = string.split('_');
	return splitAudioName[1];
}

function checkEditMode(track){

}
                            
function getFinalAudio(){

}

function cutAudio(){
	//Get Start timeCut
	var startTime;
	var startSample = timeToSample(startTime);
	
	//Get final timecut
	var endTime;
	var endSample = timeToSample(endTime);

	var startBuffer = context.createBuffer(1, startSample - 0, 44100);
	var midBuffer = context.createBuffer(1, endSample - startSample, 44100);
	var endBuffer = context.createBuffer(1, buffers[local_user.editingAudio].length - endSample, 44100);
	
	if(startSample===0){
		for(i=0; i<endSample; i++){
			startBuffer[i] = buffers[local_user.editingAudio][i];
		}
		for(i=0,j=endSample; j<buffers[local_user.editingAudio].length; i++, j++){
			endBuffer[i] = buffers[local_user.editingAudio][j];
		}
	}
	else if(endSample===buffers[local_user.editingAudio].length){
		for(i=0; i<startSample; i++){
			startBuffer[i] = buffers[local_user.editingAudio][i];
		}
		for(i=0,j=startSample; j<buffers[local_user.editingAudio].length; i++, j++){
			endBuffer[i] = buffers[local_user.editingAudio][j];
		}
	}
	else{
		for(i=0; i<startSample; i++){
			startBuffer[i] = buffers[local_user.editingAudio][i];
		}
		for(i=0,j=startSample; j<emptyBuffer.length; i++, j++){
			midBuffer[i] = buffers[local_user.editingAudio][j];
		}
		for(i=0,j=endSample; j<buffers[local_user.editingAudio].length; i++, j++){
			endBuffer[i] = buffers[local_user.editingAudio][j];
		}
	}
	//TODO: Manage that we can get 2 or 3 buffers
	//TODO: Save the buffers accordingly
	
}

function timeToSample(time){
	sample = time/fs;
	return sample
}

// function processProjectChanges(){

// }

function moveAudio(){
	//Get Start time Move
	var destinationTime;
	var destinationSample = timeToSample(destinationTime);
	
	var clipNumber

	//Access the correct timeline audio clip position
}

function prepareToPlay(){ //Function that prepares the buffers to play them in time and order
	//TODO: Get timelines and gain to play here and delete global variable
	var gain = [];
	for(i = 0; i<buffersToPlay.length; i++){
		playAudio(buffersToPlay[i], timelinesToPlay[i], gain[i]);
	}
}

function playAudio(buffer, timeline, gain){
	var source = context.createBufferSource();
	source.buffer = buffer;
	var gainNode = context.createGain();
	source.connect(gainNode);
	gainNode.connect(context.destination);
	gainNode.gain.value = gain;
	gainNode.start(timeline[beg]);
	gainNode.stop(timeline[end]);
}

function pauseAudio(source){
	source.stop(context.currentTime + 1);
}

function changeGain(gainValue, audio){ //By Message(update from other users change)
	
	projectState[audio].gain = gainValue;

}

// TODO: Merge increase and decrease into one function
function decreaseGain(){
	var gainDelta = 0.1;
	projectState[audio].gain = projectState[audio].gain - gainDelta;

	var gainMsg = {
		project: '',//To see where its defined
		audio: audio, //Obtain audio name in which the user is working
		gain: projectState[audio].gain,
		type: gainChange
	}

	socket.send(JSON.stringify(gainMsg));
}

function increaseGain(){
	var gainDelta = 0.1;
	projectState[audio].gain = projectState[audio].gain + gainDelta;

	var gainMsg = {
		project: '',//To see where its defined
		audio: audio, //Obtain audio name in which the user is working
		gain: projectState[audio].gain,
		type: gainChange
	}

	socket.send(JSON.stringify(gainMsg));
}

function createCORSRequest(method, url) {
  var xhr = new XMLHttpRequest();
  if ("withCredentials" in xhr) {
    // XHR for Chrome/Firefox/Opera/Safari.
    xhr.open(method, url, true);
    xhr.responseType = 'arraybuffer';
  } else if (typeof XDomainRequest != "undefined") {
    // XDomainRequest for IE.
    xhr = new XDomainRequest();
    xhr.open(method, url);
    xhr.responseType = 'arraybuffer';
  } else {
    // CORS not supported.
    xhr = null;
  }
  return xhr;
}


//Function to display chat
function showEditor(){ // Change display style to grid
	editorPage.style.display = "grid"; 
}

//Function to hide login
function hideLogin(){ // Change display style as none to hide it
	loginPage.style.display = "none"; 
}

//BufferLoader

// var form = document.getElementById();
// // Maybe send a message to change the audio from /tmp/
// form.onsubmit = function(event){
// 	event.preventDefault();

// 	var moveToProject = {
// 		audioName:'',
// 		origPath:'',
// 		destPath:'',

// 	}
// }

// var form = document.getElementById('file-form');
// var fileSelect = document.getElementById('file-select');
// var uploadButton = document.getElementById('upload-button');

// form.onsubmit = function(event) {
// 	event.preventDefault();

// 	// Update button text.
// 	uploadButton.innerHTML = 'Uploading...';

// 	// Get the selected files from the input.
// 	var files = fileSelect.files;

// 	// Create a new FormData object.
// 	var formData = new FormData();

// 	// Loop through each of the selected files.
// 	for (var i = 0; i < files.length; i++) {
// 		var file = files[i];

// 		// Check the file type.
// 		if (!file.type.match('image.*')) {
// 			continue;
// 		}

// 		// Add the file to the request.
// 		formData.append('audios[]', file, file.name);
// 	}

// 	// Set up the request.
// 	var request = new XMLHttpRequest();

// 	// Open the connection.
// 	request.open('POST', '/Upload', true);

// 	// Set up a handler for when the request finishes.
// 	request.onload = function () {
// 		if (request.status === 200) {
// 		// File(s) uploaded.
// 			uploadButton.innerHTML = 'Upload';
// 		} 
// 		else {
// 			alert('An error occurred!');
// 		}
// 	};

// 	// Send the Data.
// 	request.send(formData);
// }

// let soundBlob = soundFile.getBlob(); //get the recorded soundFile's blob & store it in a variable

// let formdata = new FormData() ; //create a from to of data to upload to the server
// formdata.append('soundBlob', soundBlob,  'myfiletosave.wav') ; // append the sound blob and the name of the file. third argument will show up on the server as req.file.originalname

//   // Now we can send the blob to a server...
// var serverUrl = '/upload'; //we've made a POST endpoint on the server at /upload
// //build a HTTP POST request
// var httpRequestOptions = {
// 	method: 'POST',
// 	body: formdata , // with our form data packaged above
// 	headers: new Headers({
// 	  'enctype': 'multipart/form-data' // the enctype is important to work with multer on the server
// 	})
// };
// // console.log(httpRequestOptions);
// // use p5 to make the POST request at our URL and with our options
// httpDo(
// serverUrl,
// httpRequestOptions,
// (successStatusCode)=>{ //if we were successful...
//   console.log("uploaded recording successfully: " + successStatusCode)
// },
// (error)=>{console.error(error);}
// )
