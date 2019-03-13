var context = new (window.AudioContext || window.webkitAudioContext);
var testAudioBuffer;

var buffers = [];
var projectState = [];
var buffersToPlay = [];
var timelinesToPlay = [];
var gain = [];

function manageMSG(){

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

}

function processProjectChanges(){

}

function moveAudio(){

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

function changeGain(gainNode){
	
	source.gain.value = 0.5;

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

