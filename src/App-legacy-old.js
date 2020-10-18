import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { Button,ButtonGroup,Card,Col,Container,
	FormControl,ListGroup,InputGroup,Modal,
	Row 
	} from 'react-bootstrap';
//solana
import {
  Account,
  Connection,
  PublicKey,  
  TransactionInstruction,
  Transaction,
} from '@solana/web3.js';

import {sendAndConfirmTransaction} from './util/send-and-confirm-transaction';

var socketRoot;
var urlRoot;

//

function confirm(message){
	return window.confirm(message);
}

if(window.location.href.search("https") === -1){
	urlRoot = "http://localhost:8899"
	socketRoot = "ws://localhost:8900";
}
else{
	urlRoot = "http://localhost:8899"
	socketRoot = "ws://localhost:8900";
	console.log = function(){}
	console.warn = function(){}
}



///////////////////////////

function getBinary(b64Data){
	const byteCharacters = atob(b64Data);
	return byteCharacters;
}

function stringToBytes ( str ) {
	str = atob(str);
	var ch, st, re = [];
	for (var i = 0; i < str.length; i++ ) {
		ch = str.charCodeAt(i);  
		st = [];                
		do {
			st.push( ch & 0xFF );  
			ch = ch >> 8;          
		}  
		while ( ch );
		re = re.concat( st.reverse() );
	}
	return Uint8Array.from(re);
}

//Connect To the Network
let connection: Connection;
async function establishConnection(): Promise<void> {
  connection = new Connection(urlRoot, 'recent');
  const version = await connection.getVersion();
  console.log('Connection to cluster established:', urlRoot, version);
}
async function genp(data){
	let hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
	let hashArray = Array.from(new Uint8Array(hashBuffer));                    
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function addChat(pk){
	let chats = window.localStorage.getItem("chats");	
	if(chats){
		chats = JSON.parse(chats);
		if(chats.indexOf(pk) < 0){
			chats.push(pk);
		}
	}
	else if(!chats){
		chats = [pk]
	}
	window.localStorage.setItem("chats",JSON.stringify(chats));	
}


function getChat(){
	let chats = window.localStorage.getItem("chats");	
	if(chats){
		chats = JSON.parse(chats);
		let latest = chats[chats.length - 1]
		document.getElementById("pubKey").value = latest;
	}
}

function getProgramID(){
	let id = window.localStorage.getItem("ProgramID");
	if(id){
		document.getElementById("SolID").value = id;
		id = id.trim();
	}
	return id;
}

function setProgramID(){
	let sol_id = document.getElementById("SolID");
	if(sol_id.value){
		return window.localStorage.setItem("ProgramID",sol_id.value.trim());
	}	
}

function notify(message){
	return alert(message);
}

function register(username,password){
	return window.fetch(urlRoot+"/register",{
		method: "POST",
		body: JSON.stringify({username,pass:password}),
	})
	.then(function(r){return r.json()})
	.catch(console.warn);
}


////////////////////////

class App extends React.Component{ 
	constructor(props){
		super(props);
		this.state = {
			characterCount:1028,
			connected:false,
			loading:false,
			payerAccount:false,
			roomKey:false,
			ws:null,
			
		}
		this.getLocalAccount = this.getLocalAccount.bind(this);
		this.importKey = this.importKey.bind(this);
		this.messageKeyUp = this.messageKeyUp.bind(this);
		this.sendMessage = this.sendMessage.bind(this);
		this.subscribe = this.subscribe.bind(this);
		this.transact = this.transact.bind(this);
		this.writeChat = this.writeChat.bind(this);
		this.writeLogs = this.writeLogs.bind(this);
		this.unsubscribe = this.subscribe.bind(this);
		this.updateCharacterCount = this.updateCharacterCount.bind(this);
	}
	
	async componentDidMount(){
		establishConnection().catch(console.warn);;	
		getChat();
		getProgramID();
		if(this.getLocalAccount())
		{
			//this.importKey(this.getLocalAccount());
		}
		//Account connect
		let connection = new Connection(clusterApiUrl('devnet'));
		let providerUrl = 'https://www.sollet.io';
		let wallet = new Wallet(providerUrl);
		wallet.on('connect', publicKey => console.log('Connected to sollet.io:' + publicKey.toBase58()));
		wallet.on('disconnect', () => console.log('Disconnected'));
		await wallet.connect();
	}
	
	getLocalAccount(){
		let localAccount = window.localStorage.getItem("myAccount");
		return localAccount;
	}
	
	importKey(localAccount = false){
		console.log(localAccount);
		let pk;
		if(localAccount){
			pk = localAccount;
		}
		else{
			pk = window.prompt("Import base64 Private Key?");
		}
		if(!pk){return}
		let secKey = pk;
		console.log(pk);
		let bytes = stringToBytes(secKey);
		console.log(bytes,Buffer.from(btoa(secKey)));
		let payerAccount = new Account(bytes);
		this.setState({payerAccount});
		if(!this.getLocalAccount()){
			let saveAccount = window.confirm("Save Account Locally?");
			if(saveAccount){
				window.localStorage.setItem("myAccount",secKey);
			}
		}
		console.log(payerAccount);
	}
	
	messageKeyUp(evt){
		this.updateCharacterCount();
		if(evt.keyCode === 13){
			evt.currentTarget.disabled = true;
			return this.sendMessage();
		}
	}
	
	sendMessage(){

		let message = document.getElementById("newMessage");
		if(!this.state.ws){
			message.disabled = false;
			return notify("Please subscribe to a chat first");
		}
		return this.transact(message.value)
		.then(()=>{
			message.value = "";
		})
		.catch(console.warn)
		.finally(()=>{
			message.disabled = false;
			this.updateCharacterCount();
		});
	}
	
	subscribe(){
		//var proc = prompt("subscribe to chat?");
		//if(!proc){return}
		//console.log(proc);
		let pubKey = document.getElementById("pubKey").value.trim();
		let message = {
			"jsonrpc":"2.0", "id":1, 
			"method":"accountSubscribe",
			"params":[`${pubKey}`, 
			{"encoding":"jsonParsed"}
			//{"encoding":"base64"}
		]}
		const onOpen = (obj)=>{
			console.log("socket open",obj);
			let ws = obj.target;
			addChat(pubKey);
			setProgramID();
			ws.send(JSON.stringify(message));
			pubKey = new PublicKey(pubKey);
			this.setState({ws,roomKey:pubKey,connected:pubKey})
		}
		const onMessage = (evt)=> {
			try{
				console.log("socket Message:",evt.data);
				this.writeLogs(evt.data);
				let account = JSON.parse(evt.data);
				if(account.params){
					let accountData = account.params.result.value.data;
					this.writeChat(atob(accountData[0]));
					//this.writeChat(accountData[0]);
				}
			}
			catch(e){
				console.error(e);
			}
		}

		function onClose(){
			console.warn("socket closed");
		}

		function onError(evt) {
		  console.error(evt.data);
		}
		var websocket = new WebSocket(socketRoot);
		websocket.onopen = onOpen;
		websocket.onclose = onClose;
		websocket.onmessage = onMessage;
		websocket.onerror = console.error	
	}
	
	async transact(message){
		let programId = getProgramID();
		if(!programId){return notify("Unable to located Program ID");}
		programId = new PublicKey(programId)
		let string = `
		  -test A SOL is the name of Solana's native token, which can be passed to nodes in a Solana cluster in exchange for running an 
		  on-chain program or validating its output. The system may perform micropayments of fractional SOLs, 
		  `;
		for(let a = 0;a < 1232;a++){string += "a";}
		//Construct Message
		let pdata;
		if(!message){
			pdata = Buffer.from(string.slice(0,1028));
		}
		else{
			//truncate message
			if(message.length > 1028){
				message = message.slice(0,1028);
			}
			//pad message
			while(message.length < 1028){
				message += " ";
			}
			pdata = Buffer.from(message.slice(0,1028));
		}
		///
		let buffer = (message && message.length > 0) ? Buffer.from(message.slice(0,1028)): Buffer.from( string.slice(0,1028) );
		var instruction = new TransactionInstruction({
			keys: [{pubkey:this.state.roomKey, isSigner: false, isWritable: true}],
			programId,
			data: buffer
		});
		let _transaction =  new Transaction().add(instruction);
		console.log(message);
		console.log(this.state.payerAccount);
		console.log(programId,this.state.roomKey);
		//transaction size max 3381
		console.log(pdata.length,JSON.stringify(_transaction).length);
		try{
			return await sendAndConfirmTransaction(
			'sayHello',
			connection,
			_transaction,
			this.state.payerAccount,
			);
		}
		catch(e){
			console.log(e)
		}
	}
	
	updateCharacterCount(){
		let message = document.getElementById("newMessage");
		let count = message.value ? message.value.length : 0;
		this.setState({characterCount: (1028 - count) });
	}
	
	writeChat(string){
		//console.log("string length:",string.length);
		//Timestamp
		let time = document.createElement("p");
		time.setAttribute("class","fromStamp");
		time.innerHTML = new Date().toString();
		document.getElementById("chat").appendChild(time);
		//Message
		let msg = document.createElement("text");
		msg.setAttribute("class","fromMessage");
		msg.innerHTML = string;
		let chat = document.getElementById("chat");
		chat.appendChild(msg);
		chat.scrollTo(0,chat.scrollHeight);
		return;
	}
	
	writeLogs(string){
		document.getElementById("logs").value = string;
		return;
	}
	
	unsubscribe(){
		let message = {"jsonrpc":"2.0", "id":1, "method":"accountUnsubscribe", "params":[0]}
		this.state.ws.send(JSON.stringify(message));
		return;
	}	
		
	render(){
	  return (
		<div className="App">
			<Row>
				{ this.state.payerAccount ? <Button variant="warning">SOL Account Loaded</Button> : null }
				{
					this.state.connected ?
					<Button variant="success">Connected to chat with public key{this.state.connected.toString()}</Button> :
					<div id="joinChatForm">
						<input id="pubKey" type="text" placeholder="Chat Account Public Key"/>
						<Button onClick={this.subscribe}>JOIN CHAT</Button>
					</div>
				}
				<div id="SolTalkID">
					ProgramID<input id="SolID" type="text" placeholder="ProgramID"/>
				</div>
			</Row>
			<Row>
				<div id="chat"></div>
				<input id="newMessage" type="text" placeholder="new message" onKeyUp={this.messageKeyUp}/>
				<Button block id="sendMessage" onClick={this.sendMessage}>Send Message ( {this.state.characterCount} ) </Button>
			</Row>
			<Row id="lowRow">
				<p>RAW MESSAGES</p>
				<textarea id="logs"></textarea>
			</Row>
			<textarea id="privateKey"></textarea>
			<Button onClick={()=>{this.importKey()}}>Import Private Key</Button>

		</div>);
	}
}


function ListView(props){
	return(<div>
	<ListGroup>
		{
			props.results.map((item)=>(
				<ListGroup.Item key={Math.random()}onClick={()=>props.setAddress(item)} ><Button variant="default" onClick={()=>props.setAddress(item)}>{item.Address}</Button></ListGroup.Item>
			))
		}
	</ListGroup>
	</div>)
}
function Loading(props){
	return (<progress style={{width:"100%"}}></progress>)
}


	

export default App;
