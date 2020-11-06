import React from 'react';
import { Button,Modal } from 'react-bootstrap';

/**
* Audio recording component
*/		

function Recorder(props){
	let recordedMessage;
	let mimeType = "audio/ogg;codecs=opus"
	let msToRecord = 3000;	
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
		let audioElement = document.getElementById("voiceNote");
		audioElement.src = URL.createObjectURL(recordedMessage);
		return;
	}
	
	/**
	* Close audio modal
	* @method closeModal
	* @param {Object} Button press event
	* @return {null}
	*/	
	function closeModal(recordedChunks){
		let audioModal = document.getElementById("audioModal");
		audioModal.setAttribute("style","display:none");
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
		let file = [];
		let recordTime = document.getElementById("recordTime");
		let audioModal = document.getElementById("audioModal");
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
			audioBitsPerSecond: 10000,
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
			target.disabled = false;
			mediaRecorder.stop();
			audioModal.setAttribute("style","display:block;position:absolute;top:-50vh;left:40%");
			assemble(file);
			clearInterval(timer);		
			recordTime.innerHTML = (msToRecord/1000)-1;
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
		{
			<Modal.Dialog id="audioModal" style={{display:"none"}}>
				<Modal.Header >
					<Modal.Title>Voice Note</Modal.Title>
				</Modal.Header>

				<Modal.Body>
					<audio id="voiceNote" controls/>
				</Modal.Body>

				<Modal.Footer>
					<Button variant="danger" onClick={closeModal}>Cancel</Button>
					<Button variant="primary" onClick={uploadAudio}>Upload</Button>
				</Modal.Footer>
			</Modal.Dialog>
		}
		<Button variant="primary" onClick={setupRecorder}><span role="img" aria-label="envelope">🎙️</span>  <b id="recordTime"> {(msToRecord/1000)-1} </b>s </Button>
	</div>)
}

export { Recorder };
