import React,{Component} from 'react';
import { Button,Modal, ModalBody,ModalFooter } from 'reactstrap';

/**
* Audio recording component
*/		

class Recorder extends Component {
    constructor(props) {
        super(props);
        this.state = { 
			displayModal:false,
			recording:false,
		}
		this.assemble = this.assemble.bind(this);
		this.closeModal = this.closeModal.bind(this);
		this.setupRecorder = this.setupRecorder.bind(this);
		this.uploadAudio = this.uploadAudio.bind(this);
		this.recordedMessage = null;
		this.mimeType = "audio/ogg;codecs=opus"
		this.msToRecord = 3000;
	}
		
	/**
	* Create audio file
	* @method assemble
	* @param {Array} Array of blobs
	* @return {null}
	*/	
	assemble(recordedChunks){
		this.recordedMessage = new Blob(recordedChunks, {
			type: this.mimeType
		});
		let audioElement = document.getElementById("voiceNote");
		audioElement.src = URL.createObjectURL(this.recordedMessage);
		return;
	}
	
	/**
	* Close Modal
	* @method closeModal
	* @return {null}
	*/		
	closeModal(){
		this.setState({displayModal:false});
		return;
	}
	
	/**
	* Setup media recorder
	* @method setupRecorder
	* @param {Event} Button click event
	* @return {null}
	*/		
	async setupRecorder(evt){
		let target = evt.target;
		target.disabled = true;	
		let file = [];
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
		this.setState({recording:true});
		mediaRecorder.start(250);
		return setTimeout(()=>{
			this.setState({displayModal:true,recording:false});
			target.disabled = false;
			mediaRecorder.stop();
			this.assemble(file);
		},this.msToRecord);
	}
	
	/**
	* Call property function to upload audio file
	* @method uploadAudio
	* @return {null}
	*/	
	uploadAudio(){
		this.props.uploadAudioFile(this.recordedMessage,"audio.ogg")
		.then(()=>{
			return this.setState({displayModal:false});
		})
		.catch(console.warn);
		return;
	}
	
	render(){
		return(<div>
				<Modal id="audioModal" isOpen={this.state.displayModal} centered toggle={this.closeModal} >
					<ModalBody>
						<audio id="voiceNote" controls/>
					</ModalBody>
					<ModalFooter>
						<Button type="button" color="link" onClick={this.closeModal}>Cancel</Button>
						<Button color="primary" onClick={this.uploadAudio}>Upload</Button>
					</ModalFooter>
				</Modal>
				<Button color={this.state.recording? "danger" : this.props.color} onClick={this.setupRecorder}> <i className="ri-mic-fill"></i> </Button>
		</div>)
	}
}

export { Recorder };
