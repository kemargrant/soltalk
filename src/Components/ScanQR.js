import React from 'react';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CardMedia from '@material-ui/core/CardMedia';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import InputAdornment from '@material-ui/core/InputAdornment';

import Modal from '@material-ui/core/Modal';
import OutlinedInput from '@material-ui/core/OutlinedInput';

import Typography from '@material-ui/core/Typography';

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
							<CardActionArea>
									<CardMedia
									className={"cardAvatar"}
									image={"https://robohash.org/"+this.state.contact.split(" ")[0]+"?size=720x720"+this.props.avatarStyle}
									title="card avatar"/>
							<CardContent>
								<Typography variant="body2" color="textSecondary" component="p">{this.state.contact.split(" ").join(" ")}</Typography>
							</CardContent>
							</CardActionArea>
								<FormControl fullWidth className="amoutInput" variant="outlined">
								<InputLabel htmlFor="outlined-adornment-amount">Amount</InputLabel>
									<OutlinedInput
									type="Number"
									id="amountInSol"
									startAdornment={<InputAdornment position="start">$</InputAdornment>}
									labelWidth={60}
								/>
								</FormControl>	
								<CardActions>
									<Button size="small" variant="contained" color="primary" onClick={this.addQRContact} >Add Contact</Button>
									<Button size="small" variant="contained" color="secondary" onClick={this.sendQRSol}>Send SOL</Button>
							</CardActions>
						</Card>
						:null
					}	
				</div>			
				</Modal>		
			</div>)
	}
}

export {ScanQR};
