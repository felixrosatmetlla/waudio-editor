var context;
var testAudioBuffer;

var fs = 44100;
// Create new server object
// var socket = new WebSocket("ws://localhost:9023/");
var socket = new WebSocket("ws://ecv-etic.upf.edu:9023/");

var buffers = [];
var projectState = [];
var buffersToPlay = [[]];
var projectElements= [{}];
var local_user = {
	id: null,
	name: '',
	project: '',
	editingAudio: null
}

// Login elements
var loginPage = document.querySelector('.login');
var editorPage = document.querySelector('.index');

var usernameInput = document.querySelector('#username_input');
var projectInput = document.querySelector('#project_input');
var loginButton = document.querySelector('.btn_enter');

var trackContainer = document.querySelector('.content')
loginButton.addEventListener('click', requestProject);

// Index elements
var browser = document.getElementById('upload-audio');

// Inform to user which audio has selected
browser.change = function(){
	var box = document.querySelector('.project_msg');
    box.innerText = "File selected to upload: " + asd.value;
}
// TODO on improvements: Login Validation
function requestProject(){
	hideLogin();
	showEditor();

	context = new (window.AudioContext || window.webkitAudioContext);

	// get username value
	var projectName = projectInput.value;
	var username = usernameInput.value;
	var userObj = {
		name: username,
		project: projectName,
		type: 'user'
	}

	var projectObj = {
		name: projectName,
		type: 'reqProj'
	}

	// To inform the user during the edition
	document.querySelector('.current_project').innerText = "Current Project: " + projectName;

	// send data
	socket.send(JSON.stringify(userObj));
	socket.send(JSON.stringify(projectObj));

	local_user.name = username;
	local_user.project = projectName;
}

socket.onmessage = function(message){
	obj_msg = JSON.parse(message.data);

	if (obj_msg.type === 'project'){
		loadProject(obj_msg);
	}
	else if (obj_msg.type === 'editorMsg'){
		checkEditor(obj_msg);
	}
	else if (obj_msg.type === 'moveAudio'){
		changeTimelines(obj_msg);
	}
	else if (obj_msg.type === 'cutAudio'){
		getCutBuffers(obj_msg);
	}
	else if (obj_msg.type === 'gainChange'){
		changeGain(obj_msg.gain, obj_msg.track);
	}
	else if (obj_msg.type === 'editDeny'){
		// TODO: Show in some way that you are not the editor
	}
	else if(obj_msg.type == 'newTrack'){
		setNewTrack(obj_msg);
	}
}

async function setNewTrack(msg){
	console.log(msg);
	var trackNum = projectState.audios.length;
	console.log(trackNum)
	loadAudio(msg.url,msg, trackNum);
	await new Promise((resolve, reject) => setTimeout(resolve, 8000));

	var length  = buffersToPlay[trackNum][0].length;
	var newTrack = {
		name: msg.name,
        //Track Name?
        // url: "C:/home/farora/www/waudio-editor/Projects/TestProject1/Migrabacion2.wav",
        url: msg.url,
        timeline: [{begin:0, end:length}], 
        cuts: [{begin:0, end:length}],
        gain: 0.5,
        editor: ''
	}
	
	var updateTimeCutsMsg = {
		project: local_user.project,
		track: trackNum,
		timelines: newTrack.timeline,
		cuts: newTrack.cuts,
		type: 'updateTimeCut'
	};

	socket.send(JSON.stringify(updateTimeCutsMsg));

	projectState.audios[trackNum] = newTrack;

	if(length > projectState.size){
		projectState.size = length;

		var newSizeMsg = {
			project: msg.project,
			newSize: length,
			type: 'sizeChange'
		}
		// TODO: Delete Previous tracks
		reRenderTracks();
		// paintProject(buffersToPlay)
	}
	else{
		trackElements(trackNum);
		paintWaveform(buffersToPlay[trackNum][0],trackNum, 0);
	}
}

function checkEditor(msg){
	if(msg.data === 'accepted'){
		if(msg.editorName === local_user.name && msg.editing === null){
			var editOptions = document.querySelector('.audio-options');
			editOptions.style.display = 'grid';
			local_user.editingAudio = msg.track; 
		}
		projectState.audios[msg.track].editor = msg.editorName;
		projectElements[msg.track]['selectionBtn-'+msg.track].innerText = msg.editorName;
		if(msg.editing!==null){
			projectElements[msg.editing]['selectionBtn-'+msg.editing].innerText = 'Free';
		}	
	}
	else if(msg.data === 'denied'){
		//TODO: Remark thta its not free
		var msg_bar = document.querySelector('.project_msg');
		msg.editorName === projectState.audios[msg.track].editor && msg_bar.innerText = 'You cannot use this track because someone else is using it.'
											
	}
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
function paintWaveform(clip, track_index, clip_id){
	var canvasContainer = document.querySelector('#track-waveform-'+track_index);
	var waveCanvas = document.createElement("canvas");
	waveCanvas.id = "canvas-"+track_index+'-'+clip_id;

	// sample per second
	var sample_per_second = projectElements[0]["track-waveform-0"].clientWidth/sampleToTime(projectState.size)
	waveCanvas.width = Math.round(clip.duration * sample_per_second); //120 samples per second
	waveCanvas.height = 150;
	
	// Set init canvas position
	var begin_pos = Math.round(sampleToTime(projectState.audios[track_index].timeline[clip_id].begin) * sample_per_second);

	waveCanvas.style.left = begin_pos + "px";

	canvasContainer.appendChild(waveCanvas);
	projectElements[track_index]['canvas'+'-'+clip_id] = waveCanvas;

	var delta = (clip.length / waveCanvas.width);// * clip.numberOfChannels;
	var ctx = waveCanvas.getContext("2d");
	ctx.clearRect(0,0,waveCanvas.width,waveCanvas.height);
	ctx.fillStyle = ctx.strokeStyle = "black";

	var data = clip.getChannelData(0);
	var pos = 0;
	var delta_ceil = Math.ceil(delta);
	ctx.beginPath();
	for(var i = 0; i < clip.length; i += delta)
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
	waveCanvas.clip = clip;
}

//Fiund a way to do it and paint it
function paintProject(buffersToPlay){
	buffersToPlay.map((audio,index) => {
		trackElements(index);

		audio.map((clip,id)=>{
			paintWaveform(clip,index, id);
		})
		
	})
}


function trackElements(index){
	var trackDiv = document.createElement("div");
	trackDiv.className = "track";
	trackDiv.id = "track-"+index;
	trackContainer.appendChild(trackDiv);

	projectElements[index] = {};
	projectElements[index][trackDiv.id] = trackDiv;


	var track = document.createElement("div");
	track.className = "pista";
	track.id = "pista-" + index;
	trackDiv.appendChild(track);

	projectElements[index][track.id] = track;


	var trackOptDiv = document.createElement("div");
	trackOptDiv.className = "track-options";
	trackOptDiv.id = "track-options-" + index;
	track.appendChild(trackOptDiv);

	projectElements[index][trackOptDiv.id] = trackOptDiv;


	var trackName = document.createElement("p");
	trackName.className = "track-name";
	trackName.id = "track-name-" + index;
	trackName.innerHTML = "Track " + index;
	trackOptDiv.appendChild(trackName);

	projectElements[index][trackName.id] = trackName;

	var volumeDiv = document.createElement("div");
	volumeDiv.className = "volume";
	volumeDiv.id = "volume-" + index;
	trackOptDiv.appendChild(volumeDiv);

	projectElements[index][volumeDiv.id] = volumeDiv;


	var volumeButtn = document.createElement("button");
	volumeButtn.className = " fa fa-volume-up center-icon";
	volumeButtn.id = "volBtn-" + index;
	volumeButtn.innerHTML="volume"
	volumeDiv.appendChild(volumeButtn);

	projectElements[index][volumeButtn.id] = volumeButtn;
	projectElements[index][volumeButtn.id].addEventListener('click', mute)

	var volumeUpButtn = document.createElement("button");
	volumeUpButtn.className = " fa fa-caret-up btn-action";
	volumeUpButtn.id = "upBtn-" + index;
	volumeUpButtn.innerHTML="volume up"
	volumeDiv.appendChild(volumeUpButtn);

	projectElements[index][volumeUpButtn.id] = volumeUpButtn;
	projectElements[index][volumeUpButtn.id].addEventListener('click', increaseGain);

	var volumeDownButtn = document.createElement("button");
	volumeDownButtn.className = " fa fa-caret-down btn-action";
	volumeDownButtn.id = "dwnBtn-" + index;
	volumeDownButtn.innerHTML="volume down"
	volumeDiv.appendChild(volumeDownButtn);

	projectElements[index][volumeDownButtn.id] = volumeDownButtn;
	projectElements[index][volumeDownButtn.id].addEventListener('click', decreaseGain);
	
	var trackWaveDiv = document.createElement("div");
	trackWaveDiv.className = "track-waveform";
	trackWaveDiv.id = "track-waveform-" + index;
	track.appendChild(trackWaveDiv);

	projectElements[index][trackWaveDiv.id] = trackWaveDiv;



	var editorSelection =document.createElement("div");
	editorSelection.className = "selection";
	editorSelection.id = "selection-" + index;
	trackDiv.appendChild(editorSelection);

	projectElements[index][editorSelection.id] = editorSelection;



	var editorSelectButtn = document.createElement("button");
	editorSelectButtn.className = " btn user-selected";
	editorSelectButtn.id = "selectionBtn-"+index;
	console.log(projectState.audios[index].editor)
	projectState.audios[index].editor == '' ? editorSelectButtn.innerHTML = "Free" : editorSelectButtn.innerHTML = projectState.audios[index].editor
		
	editorSelection.appendChild(editorSelectButtn);

	projectElements[index][editorSelectButtn.id] = editorSelectButtn;
	projectElements[index][editorSelectButtn.id].addEventListener('click',()=>{
		requestEdit(index);
	})

}

function requestEdit(track_id){

	var reqEditTrack = {
		id: local_user.id,
		name: local_user.name,
		project: local_user.project,
		editing: local_user.editingAudio,
		track: track_id,
		type: 'reqEdit',
	};
	console.log(reqEditTrack);
	socket.send(JSON.stringify(reqEditTrack));
}

function getTrackElement(trackId, elementId){
	projectElements[trackId] = {};
	var element = document.querySelector("." + elementId);
	console.log(element)
	projectElements[trackId][elementId] = element;
}

async function loadProject(projectMsg){
	// Save Project state
	projectState = projectMsg;
	// Load Audios needed
	if(projectState['audios'] === undefined){
		console.log('no load');
	}
	else{
		projectMsg.audios.map((x,index) => {
		 	loadAudio(projectMsg.audios[index].url,x, index);
		})
		await new Promise((resolve, reject) => setTimeout(resolve, 1000));
		paintProject(buffersToPlay);
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
			
			if(audio['cuts'] !== undefined){
				// Create buffers from audios
				buffersToPlay[index] = [];
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
			else{

				var length = data.length;
				var dummyBuffer = context.createBuffer(1, length, 44100);
				dummyBuffer.copyToChannel(data,0,0);
				buffersToPlay[index] = [];
			    buffersToPlay[index][0]=dummyBuffer;
			}
			console.log(buffersToPlay)
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

var cutClip = document.querySelector("#cutInput_clip");
var cutFromInput = document.querySelector("#cutInput_fromTime");
var cutToInput = document.querySelector("#cutInput_toTime");
var cutBtn = document.querySelector('#cutBtn');
cutBtn.addEventListener('click', cutAudio);

// TODO: remake
//TODO: Manage that we can get 2 or 3 buffers
//TODO: Save the buffers accordingly
function getCutBuffers(msg){
	buffersToPlay[msg.track].map((clip,id)=>{
		projectElements[msg.track]['canvas'+'-'+id].remove();
	});
	projectState.audios[msg.track]['cuts'].splice(msg.clip,1,...msg.cuts);
    projectState.audios[msg.track]['timeline'].splice(msg.clip,1,...msg.timelines);

	// var startBuffer = context.createBuffer(1, startSample - 0, 44100);
	// var midBuffer = context.createBuffer(1, endSample - startSample, 44100);
	// var endBuffer = context.createBuffer(1, buffers[local_user.editingAudio].length - endSample, 44100);
	var cutBuffers=[];
	var clipData = buffersToPlay[msg.track][msg.clip].getChannelData(0);
	projectState.audios[msg.track].cuts.map((x,index)=>{
		var length = x.end - x.begin;
		var emptyBuffer = new Float32Array(length);
		var dummyBuffer = context.createBuffer(1, length, 44100);
		
		for (var i = x.begin, j=0; i < x.end; i++, j++) {
	        var aux = clipData[i]
	        emptyBuffer[j] = aux;
	    }
	    dummyBuffer.copyToChannel(emptyBuffer,0,0);

	    cutBuffers.push(dummyBuffer);
	})

	// buffersToPlay[msg.track].splice(msg.clip, 1, ...cutBuffers);
	buffersToPlay[msg.track] = cutBuffers;



	buffersToPlay[msg.track].map((clip,id)=>{
		paintWaveform(clip,msg.track, id);
	})


}
function cutAudio(){
	var startTime = parseFloat(cutFromInput.value);
	var startSample = timeToSample(startTime);
	
	var endTime = parseFloat(cutToInput.value);
	var endSample = timeToSample(endTime);

	var cutLength = endSample-startSample;

	var clipToCut = parseInt(cutClip.value);
	var clipTimeline = projectState['audios'][local_user.editingAudio].timeline[clipToCut];
	var clipLength = clipTimeline.end - clipTimeline.begin;

	var buffersCuts = [{}];
	var startBuffer;
	var midBuffer;
	var endBuffer;
	if(startSample===0){
		startBuffer = {begin: startSample, end: endSample};
		endBuffer = {begin:endSample+1,end:clipLength};

		startBufferTime = {begin: clipTimeline.begin, end: clipTimeline.begin + cutLength};
		endBufferTime = {begin:clipTimeline.begin + cutLength+1, end:clipTimeline.end};

		buffersCuts=[startBuffer,endBuffer];
		bufferTimes=[startBufferTime, endBufferTime];
	}
	else if(endSample===clipLength){

		startBuffer = {begin: 0, end: startSample-1};
		endBuffer = {begin: startSample, end: endSample};

		startBufferTime = {begin: clipTimeline.begin, end: clipTimeline.end - cutLength-1};
		endBufferTime = {begin: clipTimeline.end - cutLength, end: clipTimeline.end};

		buffersCuts=[startBuffer,endBuffer];
		bufferTimes=[startBufferTime, endBufferTime];
	}
	else{

		startBuffer = {begin: 0, end: startSample-1};
		midBuffer = {begin: startSample, end: endSample}
		endBuffer = {begin: endSample+1, end: clipLength};

		startBufferTime = {begin: clipTimeline.begin, end: clipTimeline.begin + startSample-1};
		midBufferTime = {begin: clipTimeline.begin + startSample, end: clipTimeline.begin + endSample}
		endBufferTime = {begin: clipTimeline.begin + endSample+1, end: clipTimeline.end};

		buffersCuts=[startBuffer,midBuffer,endBuffer];
		bufferTimes=[startBufferTime, midBufferTime, endBufferTime];
	}

	

	var cutMsg = {
		editorId: local_user.id,
		editor: local_user.name,
		project: local_user.project,
		track: local_user.editingAudio,
		clip: clipToCut,  
		cuts: buffersCuts,
		timelines: bufferTimes,
		type: 'cutAudio',
	};

	socket.send(JSON.stringify(cutMsg));	
}

function timeToSample(time){
	var sample = time*fs;
	return Math.floor(sample);
}

function sampleToTime(sample){
	var time =sample/fs;
	return time;
}

// function processProjectChanges(){

// }
var moveToInput = document.querySelector("#moveInput_time");
var clipMoveInput = document.querySelector('#moveInput_clip');
var moveBtn = document.querySelector('#moveBtn');
moveBtn.addEventListener('click', moveAudio);

//TODO: number clips always by order in timeline;
//TODO: Do not permit overlap with clips;
function moveAudio(){
	//Get Start time Move
	var destinationTime = parseFloat(moveToInput.value);
	var destinationSample = timeToSample(destinationTime);
	
	var clipNumber = parseInt(moveInput_clip.value);

	var clipTimeline = projectState['audios'][local_user.editingAudio].timeline[clipNumber];
	var clipLength = clipTimeline.end - clipTimeline.begin;

	var endSample = destinationSample+clipLength;

	// Check overlap if(true) => overlap not allowed

	var projSize;
	if(endSample > projectState.size){
		projSize = endSample;
	}
	else{
		projSize = projectState.size;
	}

	var moveMsg = {
		editorId: local_user.id,
		editor: local_user.name,
		project: local_user.project,
		size: projSize,
		track: local_user.editingAudio,
		clip: clipNumber,  
		timeline: {begin: destinationSample, end: endSample},
		type: 'moveAudio',
	};

	socket.send(JSON.stringify(moveMsg));

}
function checkOverlap(){

}
function reRenderTracks(){
	deleteTracks();
	paintProject(buffersToPlay);
}

function deleteTracks(){
	projectElements.map((track, index) => {
		var clipsNum = projectState.audios[index].timeline.length
		for(i=0; i<clipsNum; i++){
			track['canvas'+'-'+i].remove();
		}

		track['dwnBtn'+'-'+index].remove();
		track['upBtn'+'-'+index].remove();
		track['volBtn'+'-'+index].remove();
		track['volume'+'-'+index].remove();
		track['selectionBtn'+'-'+index].remove();
		track['selection'+'-'+index].remove();
		track['track-waveform'+'-'+index].remove();
		track['track-name'+'-'+index].remove();
		track['track-options'+'-'+index].remove();
		track['pista'+'-'+index].remove();
		track['track'+'-'+index].remove();
	})
}
function changeTimelines(msg){
	projectState['audios'][msg.track].timeline[msg.clip] = msg.timeline;

	if(msg.size > projectState.size){
		// TODO: Delete Previous tracks
		projectState.size = msg.size;
		reRenderTracks();
	}
	else{
		projectElements[msg.track]['canvas'+'-'+msg.clip].remove();
		paintWaveform(buffersToPlay[msg.track][msg.clip], msg.track, msg.clip)

	}
	
}


var playButton = document.querySelector('#playBtn');
playButton.addEventListener('click', getPlayAudio);

function prepareToPlay(){ //Function that prepares the buffers to play them in time and order
	//TODO: Get timelines and gain to play here and delete global variable
	var gains = [];
	var timelines = [[]];
	projectState.audios.map((audio,index)=>{
		console.log(audio)
		console.log(index)
		gains[index] = audio.gain;
		timelines[index] = [];
		audio.timeline.map((time,ind) => {
			console.log(time)
			timelines[index][ind] = time;
		})
	})


	buffersToPlay.map((track, index) =>{
		track.map((buffer,ind)=>{
			playAudio(buffer, timelines[index][ind], gains[index]);
		})
	})
}

function playAudio(buffer, timeline, gain){
	var beginTime = sampleToTime(timeline.begin)
	var endTime = sampleToTime(timeline.end)
	console.log(beginTime)
	console.log(endTime)
	let source = context.createBufferSource();
	source.buffer = buffer;
	let gainNode = context.createGain();
	source.connect(gainNode);
	gainNode.connect(context.destination);
	gainNode.gain.value = gain;
	source.start(beginTime);
	source.stop(endTime);
}

function pauseAudio(source){
	source.stop(context.currentTime + 1);
}

var exportButton = document.querySelector('#exportBtn');
exportButton.addEventListener('click', exportAudio);
function getPlayAudio(){
	var fileSize = projectState.size;
	var finalAudio = new Float32Array(fileSize);
	var finalAudioBuffer = context.createBuffer(1, fileSize, 44100);

	console.log('To initiate');
	buffersToPlay.map((track, index) => {
			console.log('Track');
		buffersToPlay[index].map((clip,id)=>{
			var dummyBuffer = new Float32Array(fileSize);
			var clipTimeline = projectState.audios[index].timeline[id];
			var clipData = clip.getChannelData(0);
			console.log('clip')
			for(var i=clipTimeline.begin, j=0; i<clipTimeline.end; i++, j++){
				dummyBuffer[i] = clipData[j];
			}

			for(var i=0; i<fileSize; i++){
				finalAudio[i] = finalAudio[i] + dummyBuffer[i];
			}

		})
	})

	finalAudioBuffer.copyToChannel(finalAudio,0,0);
	let source = context.createBufferSource();
	source.buffer = finalAudioBuffer;
	source.connect(context.destination);
	source.start(0);

	
}
function exportAudio(){
	console.log('exporting')
	getFinalAudio();
	// createDownloadLink(finalAudioBlob);
}
function getFinalAudio(){
	var fileSize = projectState.size;
	var finalAudio = new Float32Array(fileSize);
	var finalAudioBuffer = context.createBuffer(1, fileSize, 44100);

	console.log('To initiate');
	buffersToPlay.map((track, index) => {
			console.log('Track');
		buffersToPlay[index].map((clip,id)=>{
			var dummyBuffer = new Float32Array(fileSize);
			var clipTimeline = projectState.audios[index].timeline[id];
			var clipData = clip.getChannelData(0);
			console.log('clip')
			for(var i=clipTimeline.begin, j=0; i<clipTimeline.end; i++, j++){
				dummyBuffer[i] = clipData[j];
			}

			for(var i=0; i<fileSize; i++){
				finalAudio[i] = finalAudio[i] + dummyBuffer[i];
			}

		})
	})

	console.log(finalAudio);
	finalAudioBuffer.copyToChannel(finalAudio,0,0);

	make_download(finalAudioBuffer, fileSize);
}

function make_download(abuffer, total_samples) {
	console.log(abuffer);
	var container = document.querySelector('.options');

	// set sample length and rate
	var duration = abuffer.duration,
		rate = abuffer.sampleRate,
		offset = 0;

	// Generate audio file and assign URL
	var new_file = URL.createObjectURL(bufferToWave(abuffer, total_samples));

	// Make it downloadable
	var link = document.createElement('a');
	// var download_link = document.getElementById("download_link");
	link.href = new_file;
	var name = new Date().toISOString() + '.wav';;
	link.download = name;
    link.innerHTML = link.download;
    container.appendChild(link);
}

// Convert AudioBuffer to a Blob using WAVE representation
function bufferToWave(abuffer, len) {
	var numOfChan = abuffer.numberOfChannels,
	length = len * numOfChan * 2 + 44,
	buffer = new ArrayBuffer(length),
	view = new DataView(buffer),
	channels = [], i, sample,
	offset = 0,
	pos = 0;

	// write WAVE header
	setUint32(0x46464952);                         // "RIFF"
	setUint32(length - 8);                         // file length - 8
	setUint32(0x45564157);                         // "WAVE"

	setUint32(0x20746d66);                         // "fmt " chunk
	setUint32(16);                                 // length = 16
	setUint16(1);                                  // PCM (uncompressed)
	setUint16(numOfChan);
	setUint32(abuffer.sampleRate);
	setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
	setUint16(numOfChan * 2);                      // block-align
	setUint16(16);                                 // 16-bit (hardcoded in this demo)

	setUint32(0x61746164);                         // "data" - chunk
	setUint32(length - pos - 4);                   // chunk length

	// write interleaved data
	for(i = 0; i < abuffer.numberOfChannels; i++)
		channels.push(abuffer.getChannelData(i));

	while(pos < length) {
		for(i = 0; i < numOfChan; i++) {             // interleave channels
			sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
			sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // scale to 16-bit signed int
			view.setInt16(pos, sample, true);          // write 16-bit sample
			pos += 2;
		}
		offset++                                     // next source sample
	}

	// create Blob
	return new Blob([buffer], {type: "audio/wav"});

	function setUint16(data) {
		view.setUint16(pos, data, true);
		pos += 2;
	}

	function setUint32(data) {
		view.setUint32(pos, data, true);
		pos += 4;
	}
}

function changeGain(gainValue, track){ //By Message(update from other users change)
	projectState['audios'][track].gain = gainValue;

}

function mute(){

}

// TODO: Merge increase and decrease into one function
// TODO: Set maximum and minimum values of gain
function decreaseGain(){
	var gainDelta = 0.05;
	var newGain = projectState['audios'][local_user.editingAudio].gain - gainDelta;

	var gainMsg = {
		editorId: local_user.id,
		editor: local_user.name,
		project: local_user.project,
		track: local_user.editingAudio, 
		gain: newGain,
		type: 'gainChange',
	};

	socket.send(JSON.stringify(gainMsg));
}

function increaseGain(){
	var gainDelta = 0.05;
	var newGain = projectState['audios'][local_user.editingAudio].gain + gainDelta;

	var gainMsg = {
		editorId: local_user.id,
		editor: local_user.name,
		project: local_user.project,
		track: local_user.editingAudio, 
		gain: newGain,
		type: 'gainChange',
	};

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

var form = document.querySelector('#update-form');
var fileInput = document.getElementById('upload-audio');   

// // Maybe send a message to change the audio from /tmp/
form.onsubmit = function(event){
 	//event.preventDefault();

 	var filename = fileInput.files[0].name;
 	console.log(filename);
 	console.log(fileInput.files[0]);
 	console.log(event);

 	var uploadFileMsg = {
 		project: local_user.project,
 		filename: filename,
 		type: 'uploadAudio',
 	}

 	socket.send(JSON.stringify(uploadFileMsg));
}
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
