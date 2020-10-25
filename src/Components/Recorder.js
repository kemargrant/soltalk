import React,{useEffect} from 'react';
import { Button } from 'react-bootstrap';
/**
* Audio recording component
*/		

function Recorder(props){
	let recordedMessage;
	let mimeType = "audio/ogg;codecs=opus"
	let msToRecord = 5000;	
	let pvn = document.getElementById("playVoiceNote");
	let uvn = document.getElementById("uploadVoiceNote");	
	useEffect(() => {
		let _pvn = document.getElementById("playVoiceNote");
		let _uvn = document.getElementById("uploadVoiceNote");		
		_uvn.disabled = true;	
		_pvn.disabled = true;
	});	

	/**
	* Create audio file
	* @method assemble
	* @param {Array} Array of blobs
	* @return {null}
	*/	
	function assemble(recordedChunks){
		recordedMessage = new Blob(recordedChunks, {
			type: mimeType
		});
		return;
	}

	/**
	* Playback audio file
	* @method play
	* @return {null}
	*/		
	function play(){
		if(!recordedMessage){return;}
		let audioElement = document.getElementById("voiceNote");
		audioElement.src = URL.createObjectURL(recordedMessage);
		audioElement.play();
		return;
	}
	
	/**
	* Setup media recorder
	* @method setupRecorder
	* @param {Event} Button click event
	* @return {null}
	*/		
	async function setupRecorder(evt){
		let target = evt.target;
		target.disabled = true;
		uvn.disabled = true;	
		pvn.disabled = true;		
		let file = [];
		let recordTime = document.getElementById("recordTime");
		let rt = 0;
		let stream = await navigator.mediaDevices.getUserMedia({
			audio:{
				channelCount:{exact:1}
			}
		});
		if(!stream){
			target.disabled = false;
			return;
		}
		let streamContraints = {
			audioBitsPerSecond: 12000,
		};
		let mediaRecorder = new MediaRecorder(stream,streamContraints);
		mediaRecorder.ondataavailable = (event)=> {
			if (event.data.size > 0) {
				return file.push(event.data);
			} 
		}
		mediaRecorder.start(250);
		let timer = setInterval(function(){
			rt++;
			recordTime.innerHTML = (msToRecord/1000) - rt;
		},1000);
		return setTimeout(()=>{
			mediaRecorder.stop();
			assemble(file);
			clearInterval(timer);
			target.disabled = false;
			uvn.disabled = false;	
			pvn.disabled = false;			
			recordTime.innerHTML = msToRecord/1000;
		},msToRecord);
	}
	
	/**
	* Call property function to upload audio file
	* @method uploadAudio
	* @return {null}
	*/	
	function uploadAudio(){
		props.uploadAudioFile(recordedMessage,"audio.ogg");	
		return;
	}
	
	return(<div>
		<Button onClick={setupRecorder}>Record <b id="recordTime"> {msToRecord/1000} </b>s</Button>
		<Button id="playVoiceNote" variant="info" onClick={play}>Play</Button>
		<Button id="uploadVoiceNote" variant="warning" onClick={uploadAudio}>Upload</Button>
		<audio id="voiceNote"/>
	</div>)
}

export { Recorder };
