import React from 'react';
import { Row, Col, Card, CardBody,Button } from 'reactstrap';

function TransactionInfo(props){
	let popChannel = new BroadcastChannel('tran_pop');	
	let cancel = ()=>{ 
		return props.resolveSignature({'tran_resp':true,'tran_sig':false});
	}
	let sendSig = (autoSign=false)=>{ 
		let sig =  document.getElementById("signature").innerHTML;
		sig = new Uint8Array(sig.split(','));
		props.resolveSignature({'tran_resp':true,'tran_sig':sig,autoSign});
	}
	popChannel.onmessage = (evt)=>{
		if(evt.data && evt.data.signature){
			let sig = document.getElementById("signature");
			document.getElementById("msg").innerHTML = evt.data.message;
			document.getElementById("base64_message").innerHTML = Buffer.from(evt.data.message).toString("base64");
			document.getElementById("base64_signature").innerHTML = Buffer.from(evt.data.signature).toString("base64");
			sig.innerHTML = evt.data.signature;
			if(evt.data.transaction && evt.data.transaction.feePayer){
				let data = document.createElement("p");
				let feePayer = document.createElement("p");	
				let keys = document.createElement("p");				
				let programId = document.createElement("p");					
				data.innerHTML = "<b>transaction data:</b><br/>" + evt.data.transaction.instructions[0].data;
				feePayer.innerHTML = "<b>feePayer:</b><br/>"+ evt.data.transaction.feePayer;
				keys.innerHTML = "KEYS:<br/>"
				evt.data.transaction.instructions[0].keys.map((acc,i)=>{
					return keys.innerHTML += `<b>${i}:</b> pubkey:<b>` +acc.pubkey +"</b> isSigner:"+acc.isSigner+" isWritable:"+acc.isWritable+ "<br/>";
				});
				programId.innerHTML = "<b>programId:</b><br/>"+ evt.data.transaction.instructions[0].programId;
				sig.parentElement.appendChild(data);
				sig.parentElement.appendChild(feePayer);
				sig.parentElement.appendChild(keys);
				sig.parentElement.appendChild(programId);
			}
			popChannel.onmessage = null;
			popChannel = null;
		}
	}
	return(<div className="transactionPopup">
		 <Row className="justify-content-center">
			<Col md={8} lg={6} xl={5} >
				<Card>
					<Button block> Transaction Details <i class="ri-information-fill"></i></Button>
					<CardBody className="transactionCard">
						message:<p id="msg"></p>
						<br/>message(base64):<p id="base64_message"></p>	
						<p id="signature" style={{display:"none"}}></p>
						<br/>signature(base64):<p id="base64_signature"></p>										
					</CardBody>
					<div id="secureButtons">
						<Button color="danger" onClick={cancel}>Cancel</Button>
						<Button id="protectButton" color="primary" onClick={sendSig}>Confirm</Button>
						<Button color="link" onClick={()=>{return sendSig(true);}}>Auto Sign Transactions</Button>
					</div>
				</Card>
			</Col>
		</Row>
	</div>)
}

export { TransactionInfo }

