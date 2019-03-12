var context = new (window.AudioContext || window.webkitAudioContext);
var testAudioBuffer;

function playAudio(buffer){
	var source = context.createBufferSource();
	source.buffer = buffer;
	var gainNode = context.createGain();
	source.connect(gainNode);
	gainNode.connect(context.destination);
	gainNode.start(0);
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
			testAudioBuffer = buffer;
		}, onError);
	}
	request.send();
}
//BufferLoader

