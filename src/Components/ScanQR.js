import React from 'react';
import Modal from '@material-ui/core/Modal';
import {Card, CardBody, FormGroup, Input, Button, InputGroup, InputGroupAddon } from 'reactstrap';

class ScanQR extends React.Component{
	constructor(props){
		super(props);
		this.state = {
			contact:false,
			modalOpen:false,
			stream:false,
		}
		
		this.addQRContact = this.addQRContact.bind(this);
		this.handleClose = this.handleClose.bind(this);
		this.sendQRSol = this.sendQRSol.bind(this);
		this.setupCamera = this.setupCamera.bind(this);
		
	}
	
	addQRContact(){
		if(this.state.contact){
			let [ solanaPublicKey,rsaPublicKey] = this.state.contact.split(" ");
			console.log("solana",solanaPublicKey,rsaPublicKey);
			this.props.addContact(solanaPublicKey,rsaPublicKey);
			this.handleClose();
		}
	}
	
	handleClose(){
		this.state.stream.getTracks().forEach(function(track) {
		  track.stop();
		});
		this.setState({modalOpen:false,contact:false,code:false,stream:false});
		return;
	}
	
	async sendQRSol(){
		let amount = document.getElementById("amountInSol").value;
		if(this.state.contact){
			let [ solanaPublicKey ] = this.state.contact.split(" ");
			await this.props.sendSol(solanaPublicKey,amount);
			this.handleClose();
		}
	}
	
	/**
	* Setup camera to scan qr code
	* @method setupCamera
	* @param {Event} Button click event
	* @return {null}
	*/		
	async setupCamera(evt){
		this.setState({modalOpen:true,checking:true});
		const jsQR = require("jsqr");
		let qrView;
		let canvas;
		let ctx;
		const checkImage =()=>{
			try{
				ctx.drawImage(qrView, 0, 0, canvas.width, canvas.height);
				let data = ctx.getImageData(0,0,canvas.width,canvas.height);
				let code = jsQR(data.data,data.width,data.height);
				if(code && code.data){
					this.setState({checking:false,contact:code.data});
				}
			}
			catch(e){
				console.log(e);
			}
			if(this.state.checking){
				return setTimeout(()=>{return checkImage(canvas);},250);
			}
		}
		let stream = await navigator.mediaDevices.getUserMedia({video:true});
		if(!stream){return;}
		qrView = document.getElementById("qrView");
		canvas = document.createElement("canvas");
		canvas.width = qrView.clientWidth;
		canvas.height = qrView.clientHeight;		
		ctx = canvas.getContext('2d');
		qrView.srcObject = stream;
		checkImage();
		this.setState({stream});
		return;
	}

	render(){
		return(<div>
				<span onClick={this.setupCamera}> {this.props.title }</span>
				<Modal
					open={this.state.modalOpen}
					aria-labelledby="simple-modal-title"
					aria-describedby="simple-modal-description"
					onClose={this.handleClose}
				>
				<div>
					{
						this.state.checking ?
						<video id="qrView" width={400} height={400} autoPlay/>
						:null
					}
					{
						this.state.contact ?
						<Card className="qrCapture">
							<CardBody>
								<img
									alt="card avatar"
									className={"cardAvatar"}
									src={"https://robohash.org/"+this.state.contact.split(" ")[0]+"?size=720x720"+this.props.avatarStyle}
									title="card avatar"
								/>
								<b>{this.state.contact.split(" ").join(" ")}</b>
								<FormGroup className="mb-4">
									<InputGroup className="mb-3 bg-soft-light input-group-lg rounded-lg">
										<InputGroupAddon addonType="prepend">
											<span className="input-group-text border-light text-muted">
												<i className="ri-money-dollar-box-fill"></i>
											</span>
										</InputGroupAddon>
										<Input
											type="number"
											id="amountInSol"
											name="Amount"
											className="form-control bg-soft-light border-light"
											placeholder="Enter Almount In SOL"
										/>	
										<InputGroupAddon addonType="append">
											<Button color="primary" onClick={this.sendQRSol}>Send Sol</Button>
										</InputGroupAddon>
										<InputGroupAddon addonType="append">
											<Button color="info" onClick={this.addQRContact} >Add Contact</Button>
										</InputGroupAddon>																						
									</InputGroup>
								</FormGroup>
							</CardBody>
						</Card>
						:null
					}	
				</div>			
				</Modal>		
			</div>)
	}
}

export {ScanQR};
