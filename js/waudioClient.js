// Audio context and fixed fs
var context;
var fs = 44100;

// Create new server object
var socket = new WebSocket("ws://ecv-etic.upf.edu:9023/");

// Global variables where to save the state of the world
var buffers = [];
var projectState = [];
var buffersToPlay = [[]];
var projectElements= [{}];

// Client state
var local_user = {
	id: null,
	name: '',
	project: '',
	editingAudio: null
}

// Login HTML elements
var loginPage = document.querySelector('.login');
var editorPage = document.querySelector('.index');

var usernameInput = document.querySelector('#username_input');
var projectInput = document.querySelector('#project_input');
var loginButton = document.querySelector('.btn_enter');

// Track HTML container
var trackContainer = document.querySelector('.content')
loginButton.addEventListener('click', requestProject);

// Beowse Button
var browse = document.getElementById('upload-audio');

// Inform to user which audio has selected
browse.change = function(){
	var box = document.querySelector('.project_msg');
    box.innerText = "File selected to upload: " + box.value;
}

// TODO on improvements: Login Validation
function requestProject(){ //Function to request the project 
	
	// Change login for track page
	hideLogin();
	showEditor();

	// Initialize Audio context
	context = new (window.AudioContext || window.webkitAudioContext);

	// Get username and project requested
	var projectName = projectInput.value;
	var username = usernameInput.value;
	var userObj = {
		name: username,
		track: local_user.editingAudio,
		project: projectName,
		type: 'user'
	}

	var projectObj = {
		name: projectName,
		type: 'reqProj'
	}

	// Inform the user during the edition
	document.querySelector('.current_project').innerText = "Current Project: " + projectName;

	// Send user and project info
	socket.send(JSON.stringify(userObj));
	socket.send(JSON.stringify(projectObj));

	// Set local variables
	local_user.name = username;
	local_user.project = projectName;
}

socket.onmessage = function(message){ // Function to get server messages and manage correspondant actions
	
	// Parse JSON message
	obj_msg = JSON.parse(message.data);

	if (obj_msg.type === 'project'){ // Load Project
		loadProject(obj_msg);
	}
	else if (obj_msg.type === 'editorMsg'){ // Set track editor
		checkEditor(obj_msg);
	}
	else if (obj_msg.type === 'moveAudio'){ // Move a clip in a track
		changeTimelines(obj_msg);
	}
	else if (obj_msg.type === 'cutAudio'){ // Cut a clip in a track
		getCutBuffers(obj_msg);
	}
	else if (obj_msg.type === 'gainChange'){ // Change volume in a track
		changeGain(obj_msg.gain, obj_msg.track);
	}
	else if(obj_msg.type == 'newTrack'){ // Create a new track
		setNewTrack(obj_msg);
	}
	else if(obj_msg.type === 'user'){ // Set user information
		checkUser(obj_msg);
	}
	else if(obj_msg.type === 'disconnection'){ // Manage disconnection of some user
		disconnectedUser(obj_msg);
	}
}

function disconnectedUser(msg){

	// Get message bar and set disconnection message
	var msg_bar = document.querySelector('.project_msg');
	msg_bar.innerText = msg.name + ' has disconnected.'

	// If the user was editing a track set the track to free
	if(msg.editing !== null){
		projectElements[msg.editing]['selectionBtn-'+msg.editing].innerText = 'Free';
	}
}

function checkUser(msg){

	// If it is the local user, set his id, else he will set the connection message
	if(msg.name === local_user.name){
		local_user.id = msg.id;
	}
	else{
		var msg_bar = document.querySelector('.project_msg');
		msg_bar.innerText = msg.name + ' has connected.'
	}
}

async function setNewTrack(msg){

	// Get track number and load the audio from the server
	var trackNum = projectState.audios.length;
	loadAudio(msg.url,msg, trackNum);
	await new Promise((resolve, reject) => setTimeout(resolve, 8000));

	// Set message of the new track info and the metadata of the track to the local info
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
	projectState.audios[trackNum] = newTrack;

	// Send the timeline and cuts info of tracks to the server
	var updateTimeCutsMsg = {
		project: local_user.project,
		track: trackNum,
		timelines: newTrack.timeline,
		cuts: newTrack.cuts,
		type: 'updateTimeCut'
	};
	socket.send(JSON.stringify(updateTimeCutsMsg));

	// If the length of the new track is higher than the project length inform the server of timeline change
	if(length > projectState.size){
		projectState.size = length;

		var newSizeMsg = {
			project: msg.project,
			newSize: length,
			type: 'sizeChange'
		}
		
		socket.send(JSON.stringify(newSizeMsg));

		// Re-render all the tracks
		reRenderTracks();
	}
	else{
		// Render only the new track
		trackElements(trackNum);
		paintWaveform(buffersToPlay[trackNum][0],trackNum, 0);
	}
}

function checkEditor(msg){
	
	if(msg.data === 'accepted'){

		// If the new editor is the client and was editing nothing, show the editing tools
		if(msg.editorName === local_user.name && msg.editing === null){
			var editOptions = document.querySelector('.audio-options');
			editOptions.style.display = 'grid';
			local_user.editingAudio = msg.track; 
		}

		// Set the editor name in local data and in the button
		projectState.audios[msg.track].editor = msg.editorName;
		projectElements[msg.track]['selectionBtn-'+msg.track].innerText = msg.editorName;

		// If the user was editing, set the track to free
		if(msg.editing!==null){
			projectElements[msg.editing]['selectionBtn-'+msg.editing].innerText = 'Free';
		}	
	}
	else if(msg.data === 'denied'){
		
		// Show that someone is already editing the track
		var msg_bar = document.querySelector('.project_msg');
		if(msg.editorName === projectState.audios[msg.track].editor){ 
			msg_bar.innerText = 'You cannot use this track because someone else is using it.'
		}									
	}
}

function paintWaveform(clip, track_index, clip_id){

	// Create the canvas
	var canvasContainer = document.querySelector('#track-waveform-'+track_index);
	var waveCanvas = document.createElement("canvas");
	waveCanvas.id = "canvas-"+track_index+'-'+clip_id;

	// Compute the samples per second using the track width
	var sample_per_second = projectElements[0]["track-waveform-0"].clientWidth/sampleToTime(projectState.size);
	waveCanvas.width = Math.round(clip.duration * sample_per_second); //120 samples per second
	waveCanvas.height = 150;
	
	// Draw Timeline
	drawTimeline(sampleToTime(projectState.size),projectElements[0]["track-waveform-0"].clientWidth+20);

	// Set initial canvas position
	var begin_pos = Math.round(sampleToTime(projectState.audios[track_index].timeline[clip_id].begin) * sample_per_second);
	waveCanvas.style.left = begin_pos + "px";

	// Set into html and save canvas
	canvasContainer.appendChild(waveCanvas);
	projectElements[track_index]['canvas'+'-'+clip_id] = waveCanvas;

	// Create canvas context and delta
	var delta = (clip.length / waveCanvas.width);// * clip.numberOfChannels;
	var ctx = waveCanvas.getContext("2d");
	ctx.clearRect(0,0,waveCanvas.width,waveCanvas.height);
	ctx.fillStyle = ctx.strokeStyle = "black";

	var data = clip.getChannelData(0);
	var pos = 0;
	var delta_ceil = Math.ceil(delta);
	ctx.beginPath();

	// Center of the track
	var half_track = Math.floor(waveCanvas.height/2);
	
	// Draw
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
		var y = (1 + min) * half_track;
		ctx.moveTo( pos, y );
		ctx.lineTo( pos, y + half_track * (max - min) );
		++pos;
	}
	ctx.stroke();
	waveCanvas.clip = clip;
}

function paintProject(buffersToPlay){
	
	// For each track create it, and paint the clips of each track
	buffersToPlay.map((audio,index) => {
		trackElements(index);

		audio.map((clip,id)=>{
			paintWaveform(clip,index, id);
		})	
	})
}

function trackElements(index){

	// Create each track element and save it into the client info
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
	volumeDiv.appendChild(volumeButtn);

	projectElements[index][volumeButtn.id] = volumeButtn;
	projectElements[index][volumeButtn.id].addEventListener('click', mute)

	var volumeUpButtn = document.createElement("button");
	volumeUpButtn.className = " fa fa-caret-up btn-action";
	volumeUpButtn.id = "upBtn-" + index;
	volumeDiv.appendChild(volumeUpButtn);

	projectElements[index][volumeUpButtn.id] = volumeUpButtn;
	projectElements[index][volumeUpButtn.id].addEventListener('click', increaseGain);

	var volumeDownButtn = document.createElement("button");
	volumeDownButtn.className = " fa fa-caret-down btn-action";
	volumeDownButtn.id = "dwnBtn-" + index;
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

	// Create message to request edition and send it
	var reqEditTrack = {
		id: local_user.id,
		name: local_user.name,
		project: local_user.project,
		editing: local_user.editingAudio,
		track: track_id,
		type: 'reqEdit',
	};
	socket.send(JSON.stringify(reqEditTrack));
}

async function loadProject(projectMsg){
	
	// Save Project state
	projectState = projectMsg;
	
	// Load Audios needed
	if(projectState['audios'].length === 0){
		console.log('no load');
	}
	else{
		// For every track load the audio and paint it
		projectMsg.audios.map((x,index) => {
		 	loadAudio(projectMsg.audios[index].url,x, index);
		})
		await new Promise((resolve, reject) => setTimeout(resolve, 8000));
		paintProject(buffersToPlay);
	}
}

function loadAudio(url,audio, index){
	
	// Create xmlhttprequest with cors header and request the audios
	var request = createCORSRequest('GET', url);

	request.onload = function() {
		// For each audio get the audio info and set the tracks and clips buffers
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
			buffers[index]=data;
		}, function onError(){
			console.log('error');
		});
	}
	request.send();
}

// Get cut tools
var cutClip = document.querySelector("#cutInput_clip");
var cutFromInput = document.querySelector("#cutInput_fromTime");
var cutToInput = document.querySelector("#cutInput_toTime");
var cutBtn = document.querySelector('#cutBtn');
cutBtn.addEventListener('click', cutAudio);

function getCutBuffers(msg){
	
	// For the edited track remove all the canvas
	buffersToPlay[msg.track].map((clip,id)=>{
		projectElements[msg.track]['canvas'+'-'+id].remove();
	});

	// Set the new cut and timelines info 
	projectState.audios[msg.track]['cuts'].splice(msg.clip,1,...msg.cuts);
    projectState.audios[msg.track]['timeline'].splice(msg.clip,1,...msg.timelines);

    // Get the new clips data and set into the local variable
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

	buffersToPlay[msg.track] = cutBuffers;

	// Paint the clips
	buffersToPlay[msg.track].map((clip,id)=>{
		paintWaveform(clip,msg.track, id);
	})
}
function cutAudio(){

	// Check that is allowed to edit
	if(local_user.editingAudio !== null){
		var startTime = parseFloat(cutFromInput.value);
		var startSample = timeToSample(startTime);
		
		var endTime = parseFloat(cutToInput.value);
		var endSample = timeToSample(endTime);

		var cutLength = endSample-startSample;
		var clipToCut = parseInt(cutClip.value) - 1;

		// If the data on inputs is correct create the new cuts and timelines info and send it to teh server
		if(clipToCut>=0 && clipToCut<projectState['audios'][local_user.editingAudio].timeline.length && startSample>=0 && endSample<=projectState['audios'][local_user.editingAudio].cuts[clipToCut].end){
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
		else{
			var msg_bar = document.querySelector('.project_msg');
			msg_bar.innerText = 'Time range or clip number invalid. This audio has ' + projectState['audios'][local_user.editingAudio].timeline.length + ' clips.';
		}
	}
	else{
		var msg_bar = document.querySelector('.project_msg');
		msg_bar.innerText = 'You are not editing any track. Please click the track button to procede.'
	}			
}

function timeToSample(time){
	var sample = time*fs;
	return Math.floor(sample);
}

function sampleToTime(sample){
	var time =sample/fs;
	return time;
}

// Move HTML elements
var moveToInput = document.querySelector("#moveInput_time");
var clipMoveInput = document.querySelector('#moveInput_clip');
var moveBtn = document.querySelector('#moveBtn');
moveBtn.addEventListener('click', moveAudio);

//TODO: number clips always by order in timeline;
//TODO: Do not permit overlap with clips;
function moveAudio(){

	// Check user is allowed to edit
	if(local_user.editingAudio !== null){	

		var destinationTime = parseFloat(moveToInput.value);
		var destinationSample = timeToSample(destinationTime);
		
		var clipNumber = parseInt(moveInput_clip.value) - 1;

		// If the input values are correct set new timeline positions and send the message to server
		if(clipNumber>=0 && clipNumber<projectState['audios'][local_user.editingAudio].timeline.length && destinationSample>=0){
			var clipTimeline = projectState['audios'][local_user.editingAudio].timeline[clipNumber];
			var clipLength = clipTimeline.end - clipTimeline.begin;

			var endSample = destinationSample+clipLength;

			// If audio overpasses projectSize, we will inform the server in the move message
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
		else{
			var msg_bar = document.querySelector('.project_msg');
			msg_bar.innerText = 'Time range or clip number is invalid. This audio has ' + projectState['audios'][local_user.editingAudio].timeline.length + ' clips.';
		}
	}
	else{
		var msg_bar = document.querySelector('.project_msg');
		msg_bar.innerText = 'You are not editing any track. Please click the track button to procede.'
	}
}

function reRenderTracks(){
	deleteTracks();
	paintProject(buffersToPlay);
}

function deleteTracks(){

	// For each track delete alk the canvas and HTML track elements
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
	
	// If the project size has changed, rerender all tracks, else only render the edited track
	projectState['audios'][msg.track].timeline[msg.clip] = msg.timeline;

	if(msg.size > projectState.size){
		projectState.size = msg.size;
		reRenderTracks();
	}
	else{
		projectElements[msg.track]['canvas'+'-'+msg.clip].remove();
		paintWaveform(buffersToPlay[msg.track][msg.clip], msg.track, msg.clip)
	}	
}

// Get play button element
var playButton = document.querySelector('#playBtn');
playButton.addEventListener('click', getPlayAudio);

function getPlayAudio(){
	
	// For each track, get the clips info and sum it. Play each track separately
	var fileSize = projectState.size;
	buffersToPlay.map((track, index) => {
		
		var finalAudio = new Float32Array(fileSize);
		var finalAudioBuffer = context.createBuffer(1, fileSize, 44100);
		
		buffersToPlay[index].map((clip,id)=>{
			var dummyBuffer = new Float32Array(fileSize);
			var clipTimeline = projectState.audios[index].timeline[id];
			var clipData = clip.getChannelData(0);
			
			for(var i=clipTimeline.begin, j=0; i<clipTimeline.end; i++, j++){
				dummyBuffer[i] = clipData[j];
			}

			for(var i=0; i<fileSize; i++){
				finalAudio[i] = finalAudio[i] + dummyBuffer[i];
			}
		})
		finalAudioBuffer.copyToChannel(finalAudio,0,0);

		// Create source and apply gain of the track and play it from origin
		let source = context.createBufferSource();
		let gainNode = context.createGain();
		source.buffer = finalAudioBuffer;
		source.connect(gainNode);
		gainNode.gain.value = projectState.audios[index].gain;
		gainNode.connect(context.destination);
		source.start(0);
	})
}

// Get export button element
var exportButton = document.querySelector('#exportBtn');
exportButton.addEventListener('click', exportAudio);

function exportAudio(){
	getFinalAudio();
}

function getFinalAudio(){
	var fileSize = projectState.size;
	var finalAudio = new Float32Array(fileSize);
	var finalAudioBuffer = context.createBuffer(1, fileSize, 44100);

	//For each track get the data and sum between tracks to obtain a final buffer
	buffersToPlay.map((track, index) => {
		buffersToPlay[index].map((clip,id)=>{
			var dummyBuffer = new Float32Array(fileSize);
			var clipTimeline = projectState.audios[index].timeline[id];
			var clipData = clip.getChannelData(0);
			for(var i=clipTimeline.begin, j=0; i<clipTimeline.end; i++, j++){
				dummyBuffer[i] = clipData[j];
			}

			for(var i=0; i<fileSize; i++){
				finalAudio[i] = finalAudio[i] + dummyBuffer[i];
			}
		})
	})

	finalAudioBuffer.copyToChannel(finalAudio,0,0);

	make_download(finalAudioBuffer, fileSize);
}

function make_download(abuffer, total_samples) {
	var container = document.querySelector('.project_msg');

	// set sample length and rate
	var duration = abuffer.duration,
		rate = abuffer.sampleRate,
		offset = 0;

	// Generate audio file and assign URL
	var new_file = URL.createObjectURL(bufferToWave(abuffer, total_samples));

	// Make it downloadable
	var link = document.createElement('a');
	
	// Set link info
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
	
	// If client is editor send mute message
	if(local_user.editingAudio !== null){	
		var gainMsg = {
			editorId: local_user.id,
			editor: local_user.name,
			project: local_user.project,
			track: local_user.editingAudio, 
			gain: 0,
			type: 'gainChange',
		};

		socket.send(JSON.stringify(gainMsg));
	}
	else{
		var msg_bar = document.querySelector('.project_msg');
		msg_bar.innerText = 'You are not editing any track. Please click the track button to procede.'
	}
}

// TODO: Merge increase and decrease into one function
function decreaseGain(){
	
	// Message to decrease gain in 0.05 steps
	var gainDelta = 0.05;
	if(local_user.editingAudio !== null){
		if(projectState['audios'][local_user.editingAudio].gain>0.05){
			var newGain = projectState['audios'][local_user.editingAudio].gain - gainDelta;
		}
		else{
			var newGain = 0;
		}
		
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
	else{
		var msg_bar = document.querySelector('.project_msg');
		msg_bar.innerText = 'You are not editing any track. Please click the track button to procede.'
	}
}

function increaseGain(){
	
	// Message to increase gain in 0.05 steps
	var gainDelta = 0.05;
	if(local_user.editingAudio !== null){
		if(projectState['audios'][local_user.editingAudio].gain<0.95){
			var newGain = projectState['audios'][local_user.editingAudio].gain + gainDelta;
		}
		else{
			var newGain = 1;
		}

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
	else{
		var msg_bar = document.querySelector('.project_msg');
		msg_bar.innerText = 'You are not editing any track. Please click the track button to procede.'
	}
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

// Get form
var form = document.querySelector('#update-form');
var fileInput = document.getElementById('upload-audio');   

// On submit form get filename and set info to server
form.onsubmit = function(event){

 	var filename = fileInput.files[0].name;

 	var uploadFileMsg = {
 		project: local_user.project,
 		filename: filename,
 		type: 'uploadAudio',
 	}

 	socket.send(JSON.stringify(uploadFileMsg));
}

function drawTimeline(maxValue, large){
  	var chart = new CanvasJS.Chart("timeline", {
        width: large,
        height: 40,
        backgroundColor: "",
        axisX: [{
	      lineColor: "#C24642",
	      minimum: 0,
	      maximum: maxValue,
	              }],
        axisY:{
          title: "",
          tickLength: 0,
          lineThickness:0,
          margin:0,
          valueFormatString:" " //comment this to show numeric values
      	},

        data: [
        {
          type: "line",
          dataPoints: [
            {x: 1},
          ]
        },]
      });
      chart.width = large + "px";
      chart.render();

      document.querySelector('a.canvasjs-chart-credit').remove();
}