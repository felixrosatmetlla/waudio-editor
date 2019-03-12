var context = new (window.AudioContext || window.webkitAudioContext);
var testAudioBuffer;

var buffers = [];

function manageMSG(){

}

function loadProject(projectMsg){
	// Load Audios needed in buffers
	for(var audio in projectMsg){
		loadAudio(projectMsg[audio].url);
	}
	// Read Msg to set actual state of project in screen
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

function playAudio(buffer, timeline){
	var source = context.createBufferSource();
	source.buffer = buffer;
	var gainNode = context.createGain();
	source.connect(gainNode);
	gainNode.connect(context.destination);
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

