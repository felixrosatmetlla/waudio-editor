var context = new (window.AudioContext || window.webkitAudioContext);
var testAudioBuffer;

var fs = 44100;
// Create new server object
var socket = new WebSocket("ws://localhost:9023/");

var buffers = [];
var projectState = [];
var buffersToPlay = [];
var timelinesToPlay = [];
var gain = [];

var local_user = {
	id: null,
	name: '',
	editingAudio: null
}


var playButton = document.getElementByClassName('play');

playButton.addEventListener('click', prepareToPlay);

function requestProject(){
	// get username value
	var username;
	var userObj = {
		name: username,
		type: 'user'
	}

	// get project name
	var projectName;
	var projectObj = {
		name: projectName,
		type: 'reqProj'
	}
	// send data
	socket.send(JSON.stringify(userObj));
	socket.send(JSON.stringify(projectObj));
}

socket.onmessage = function(msg){
	if (msg.type === 'project'){
		loadProject(msg);
	}
	else if (msg.type === 'moveAudio'){

	}
	else if (msg.type === 'cutAudio'){

	}
	else if (msg.type === 'volumeChange'){
		changeGain(msg.gain, msg.audio);
	}
}

function uploadFile(){
	
}

function loadProject(projectMsg){
	// Save Project state
	projectState = projectMsg;

	// Load Audios needed
	for(var audio in projectMsg){
		loadAudio(projectMsg[audio].url);
	}

	// Create buffers from audios
	for(var audio in projectMsg){
		for(var times in projectMsg[audio].cutTimes){	
			var originalBuffer = buffers[getAudioIndex(audio)];
			console.log(projectMsg[audio].cutTimes[times])
			var length = projectMsg[audio].cutTimes[times].end - projectMsg[audio].cutTimes[times].begin;
			var emptyBuffer = context.createBuffer(1, length, 44100);

			for (var i = projectMsg[audio].cutTimes[times].begin, len = projectMsg[audio].cutTimes[times].end, j=0; i < len; i++, j++) {
		        emptyBuffer[j] = originalBuffer[i];
		    }
		    buffersToPlay.push(emptyBuffer);
		    timelinesToPlay.push(projectMsg[audio].timeline[times])
		    gain.push(projectMsg[audio].gain)
		}
	}

	// Read Msg to set actual state of project in screen
	// Paint
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



function loadAudio(url){
	var request = new XMLHttpRequest();
	request.open('GET', url, true);
	request.responseType = 'arraybuffer';

	request.onload = function() {
		context.decodeAudioData(request.response, function(buffer) {
			buffers.push(buffer);
		}, onError);
	}
	request.send();
}
//BufferLoader



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
// 	request.open('POST', 'https://ecv-etic.upf.edu/students/2019/farora/waudio-editor/Projects/'+ProjectName, true);

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

