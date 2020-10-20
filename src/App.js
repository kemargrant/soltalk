import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
// Time Ago English
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
//Crypto
import bs58 from 'bs58';
import nacl from 'tweetnacl';
//Bootstrap imports
import { 
	Button,ButtonGroup,Col,
	FormControl,ListGroup,InputGroup,
	ProgressBar,
	Row 
} from 'react-bootstrap';
//Solana imports
import {
  Account,
  Connection,
  BpfLoader,
  BPF_LOADER_DEPRECATED_PROGRAM_ID,
  LAMPORTS_PER_SOL,
  PublicKey,  
  SystemProgram,
  TransactionInstruction,
  Transaction,
  clusterApiUrl
} from '@solana/web3.js';
import Wallet from '@project-serum/sol-wallet-adapter';
import {sendAndConfirmTransaction} from './util/send-and-confirm-transaction';

var socketRoot;
var urlRoot;
var Intervals = []
var defaultProgram = "JB2LCd9oV7xNemBSV8dJu6gkrpWQSrDPcfHUQAQnXRZu";
var defaultChannel = "BoSJNDkt37kxQthSgvMqCER1dMzyqEUS34Kkp2YazEiq";
 
TimeAgo.addLocale(en)
// Date formatter.
const timeAgo = new TimeAgo('en-US')

if(window.location.href.search("localhost") > -1){
	urlRoot = "https://testnet.solana.com/";
	socketRoot = "ws://testnet.solana.com:8900";
	console.log("Running Local");
}
else{
	console.log("Running Production")
	urlRoot = "https://testnet.solana.com/";
	socketRoot = "wss://testnet.solana.com";
	//console.log = function(){}
	//console.warn = function(){}

}

///////////////////////////
function stringToBytes(str) {
	try{str = atob(str);}catch(e){console.log(e);}
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

function addContact(solanaPublicKey,rsaPublicKey){
	let contacts = window.localStorage.getItem("contacts");	
	contacts = contacts ? JSON.parse(contacts) : {} ;
	if(contacts[solanaPublicKey]){
		let overwrite = window.confirm("Update existing contact?");
		if (!overwrite){return;}
	}
	contacts[solanaPublicKey] = {
		publicKey:solanaPublicKey,
		channel:defaultChannel,
		chatPublicKey:rsaPublicKey,
		programId:defaultProgram,
		message:"",
		time:new Date().getTime()
	}
	window.localStorage.setItem("contacts",JSON.stringify(contacts));	
	return contacts;
}

function decryptMessage(rsaPrivateKey,encryptedMessage) {
	if(typeof encryptedMessage !== "object"){encryptedMessage = Buffer.from(encryptedMessage);}
	return window.crypto.subtle.decrypt(
		{name: "RSA-OAEP"},
		rsaPrivateKey,
		encryptedMessage
	);
}

function encryptMessage(rsaPublicKey,message) {
	if(typeof message === "string"){message = Buffer.from(message);}
	return window.crypto.subtle.encrypt(
		{name: "RSA-OAEP"},
		rsaPublicKey,
		message
	);
}

function generateRSAKeyPair(){
	return window.crypto.subtle.generateKey({
		name: "RSA-OAEP",
		modulusLength: 4096,
		publicExponent: new Uint8Array([1, 0, 1]),
		hash: "SHA-256"
	  },
	  true,
	  ["encrypt","decrypt"]
	);
}


function getContacts(){
	let contacts = window.localStorage.getItem("contacts");	
	contacts = contacts ? JSON.parse(contacts) : {} ;
	if( Object.keys(contacts).length < 1){
		//Tom 
		//contacts = addContact("CRBzvyRxKqBEfEinhp89kxykYHKyek5D9Yh5rh3kxzrC","");		
	}
	return contacts;
}

async function getSiteKeys(){
	let kp = window.localStorage.getItem("siteKeys");	
	if(kp){
		kp = JSON.parse(kp);
		kp.publicKey = await importPublicKey(kp.publicKey);
		kp.privateKey = await importPrivateKey(kp.privateKey);
	}
	else{kp = {}}
	return kp;
}

function importPrivateKey(jwk) {
  return window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
	  modulusLength: 4096,
	  publicExponent: new Uint8Array([1, 0, 1]),
	  hash: "SHA-256"
    },
    true,
    ["decrypt"]
  );
}

function importPublicKey(jwk) {
  return window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
	  modulusLength: 4096,
	  publicExponent: new Uint8Array([1, 0, 1]),
	  hash: "SHA-256"
    },
    true,
    ["encrypt"]
  );
}

function notify(message){
	return alert(message);
}

function padText(str){
	if(Buffer.from(str).length > 1028){
		while(Buffer.from(str).length < 1028){
			str = str.slice(0,str.length - 1);
		}
	}
	else if(Buffer.from(str).length < 1028){
		while(Buffer.from(str).length < 1028){
			str += " ";
		}
	}
	return Buffer.from(str);
}

function removeContact(solanaPublicKey){
	let contacts = window.localStorage.getItem("contacts");	
	contacts = contacts ? JSON.parse(contacts) : {} ;
	delete contacts[solanaPublicKey]
	window.localStorage.setItem("contacts",JSON.stringify(contacts));	
	return contacts;
}

function updateContacts(contactsObject){
	return window.localStorage.setItem("contacts",JSON.stringify(contactsObject));	
}

////////////////////////

class App extends React.Component{ 
	constructor(props){
		super(props);
		this.state = {
			characterCount:880-264,
			currentContact:{
				
			},
			contacts:[],
			connected:[],
			loading:false,
			localPayerAccount:false,
			localPayerBalance:0,
			payerAccount:false,
			payerAccountBalance:0,
			providerUrl:'https://www.sollet.io/#origin='+window.location.origin+'&network=testnet',
			showContactForm:false,
			siteKeys:false,
			wallet:false,
			ws:null,
		}
		
		this.addContact = this.addContact.bind(this);
		this.broadcastPresence = this.broadcastPresence.bind(this);
		this.cancelContactForm = this.cancelContactForm.bind(this);
		this.checkBroadCast = this.checkBroadCast.bind(this);
		this.createLocalChatAccount = this.createLocalChatAccount.bind(this);
		this.decodeMessage = this.decodeMessage.bind(this);
		this.disconnect = this.disconnect.bind(this);
		this.encodeMessage = this.encodeMessage.bind(this);
		this.getContacts = this.getContacts.bind(this);
		this.getLocalAccount = this.getLocalAccount.bind(this);
		this.importKey = this.importKey.bind(this);
		this.loadProgram = this.loadProgram.bind(this);
		this.createRoom = this.createRoom.bind(this);
		this.messageKeyUp = this.messageKeyUp.bind(this);
		this.removeChatAccount = this.removeChatAccount.bind(this);
		this.removeContact = this.removeContact.bind(this);
		this.sendMessage = this.sendMessage.bind(this);
		this.setCurrentContact = this.setCurrentContact.bind(this);
		this.showContactForm = this.showContactForm.bind(this);
		this.subscribe = this.subscribe.bind(this);
		this.transact = this.transact.bind(this);
		this.walletAdapter = this.walletAdapter.bind(this);
		this.writeChat = this.writeChat.bind(this);
		this.writeChatFromContact = this.writeChatFromContact.bind(this);
		this.writeLogs = this.writeLogs.bind(this);
		this.unsubscribe = this.subscribe.bind(this);
		this.updateCharacterCount = this.updateCharacterCount.bind(this);
	}
	
	addContact(pubKey=false,chatPubKey=false){
		if(!pubKey){
			let new_solana_key = document.getElementById("new_contact_key");
			let new_chat_key = document.getElementById("new_chat_key");
			if(new_solana_key && new_solana_key.value.length === 44){
				addContact(new_solana_key.value,new_chat_key.value);
				this.cancelContactForm();
				this.getContacts();
			}
		}
		else{
			addContact(pubKey,chatPubKey)
		}
	}
	
	addContactPrompt(rsaPublicKey,solanaPublicKey){
		let contactsList = Object.keys(this.state.contacts);
		let msg = `Add ${solanaPublicKey} ?`;
		if( contactsList.indexOf(solanaPublicKey) > - 1){
			msg.replace("Add","Update");
		}
		if(window.confirm(msg)){
			addContact(solanaPublicKey,rsaPublicKey);
		}
	}
	
	async broadcastPresence(){
		if(!this.state.wallet){
			return notify("Connect Wallet to Sign Message");
		}
		let kp = this.state.siteKeys;
		let chat_publicKey = await crypto.subtle.exportKey("jwk",kp.publicKey);
		console.log(chat_publicKey);
		let transaction = {
			addSignature:function(key,signature){
				this.signature = signature;
				this.key = key;
			},
			key:false,
			message: this.state.payerAccount.toBase58()+" "+chat_publicKey.n,
			serializeMessage:function(){return Buffer.from(this.message)},
			signature:false,
		}
		let signed = await this.state.wallet.signTransaction(transaction);
		let valid = nacl.sign.detached.verify(transaction.serializeMessage(),transaction.signature,transaction.key.toBuffer());
		this.transact(transaction.message+" "+transaction.signature.join(","),true);
		console.log(signed,"is valid?",valid);
		console.log(transaction.message.length,transaction.signature.length,transaction.signature);

	}
	
	cancelContactForm(){
		return this.setState({showContactForm:false});
	}
	
	checkBroadCast(message){
		let isBroadcast = false;
		try{
			message = message.split(" ");
			let contacts = this.state.contacts;
			let friends = Object.keys(contacts);
			let stranger = message[0]
			let valid;
			let str = message[0] + " " + message[1];
			let sig = Buffer.from(message[2].split(","));
			valid = nacl.sign.detached.verify(Buffer.from(str),sig,new PublicKey(stranger).toBuffer());
			isBroadcast = valid;
			if(valid && friends.indexOf(stranger) > -1){
				if(valid){
					console.log("Valid Broadcast from:",stranger);
					if(window.confirm("Update contact: " +stranger+ " chat public key?")){
						contacts[stranger].chatPublicKey = message[1];
						updateContacts(contacts);
					}
				}
			}
			else if(valid && this.state.payerAccount && (stranger !== this.state.payerAccount.toBase58()) ){
				if(window.confirm("Add new contact:"+ stranger)){
					this.addContact(stranger,message[1]);
					this.getContacts()
				}
			}
			else if(valid && !this.state.payerAccount){
				if(window.confirm("Add new contact:"+ stranger)){
					this.addContact(stranger,message[1]);
					this.getContacts()
				}
			}
		}
		catch(e){
			console.log(e);
		}
		return isBroadcast;
	}
	
	async componentDidMount(){
		establishConnection().catch(console.warn);;	
		let myContacts = this.getContacts();
		this.subscribe(myContacts);
		//Set current contact
		if(Object.keys(myContacts).length > 0){
			this.setCurrentContact(myContacts[Object.keys(myContacts)[0]]);
		}
		if(this.getLocalAccount()){
			this.importKey(this.getLocalAccount());
		}
		let siteKeys = await getSiteKeys();
		if(Object.keys(siteKeys).length > 1){
			this.setState({siteKeys});
		}
	}
	
	async createLocalChatAccount(){
		if(!this.state.siteKeys){
			let keypair = await generateRSAKeyPair();
			let exp = {
				publicKey:await crypto.subtle.exportKey("jwk",keypair.publicKey),
				privateKey:await crypto.subtle.exportKey("jwk",keypair.privateKey)
			}
			this.setState({siteKeys:keypair});
			window.localStorage.setItem("siteKeys",JSON.stringify(exp));
		}
	}
	
	async decodeMessage(message){
		try{
			console.log("decoding",message);
			let p1 = stringToBytes(message.slice(0,512));
			let p2 = stringToBytes(message.slice(512,1024));
			let decoder = new TextDecoder(); 
			let d1 = await decryptMessage(this.state.siteKeys.privateKey,p1);
			let d2 = await decryptMessage(this.state.siteKeys.privateKey,p2);
			let txt1 = decoder.decode( d1 );
			let txt2 = decoder.decode( d2 );
			console.log("rawMessage",txt1,txt2);
			let packet = JSON.parse(txt1+txt2);
			return packet
		}
		catch(e){
			console.log(e);
			return {}
		}
	}
	
	disconnect(){
		this.state.ws.close();
		return this.setState({ws:false,connected:[]});
	}
	
	async encodeMessage(msg){
		try{
			if(msg.length > 1028){
				return notify("Message too large");
			}
			let packet = {
				t:msg,
				u:Math.random().toFixed(6).slice(2),
				us:false,
			}
			let faux_transaction = {
				addSignature:function(key,signature){
					this.signature = signature;
					this.key = key;
				},
				key:false,
				message:packet.u,
				serializeMessage:function(){return Buffer.from(this.message)},
				signature:false,
			}
			await this.state.wallet.signTransaction(faux_transaction);
			packet.us = new Uint8Array(faux_transaction.signature).toString();
			//pad message
			console.log("Before padding length:",Buffer.from(JSON.stringify(packet)).length)
			while(Buffer.from(JSON.stringify(packet)).length < 880){
				packet.t += " ";
			}
			msg = JSON.stringify(packet);
			console.log(msg,msg.length,this.state.siteKeys.publicKey)
			// 
			let jwk = {
				alg: "RSA-OAEP-256",
				e: "AQAB",
				ext: true,
				key_ops: ["encrypt"],
				kty: "RSA",
				n:""
			}
			jwk.n = this.state.currentContact.chatPublicKey;
			let publicContactKey = await importPublicKey(jwk);
			//this publickey should be the public key of the contact you want to message
			let enc1 = await encryptMessage(publicContactKey,msg.slice(0,440));
			let enc2 = await encryptMessage(publicContactKey,msg.slice(440,880));
			let encoded = new Uint8Array(1028);
			encoded.set(new Uint8Array(enc1));
			encoded.set(new Uint8Array(enc2),enc2.byteLength);
			//EncryptMessage
			return encoded;
		}
		catch(e){
			console.log(e);
			return null;
		}
		
	}
	
	async getBalance(){
		let balance = await connection.getBalance(this.state.payerAccount);
		this.setState({payerAccountBalance:balance / LAMPORTS_PER_SOL});
	}
	
	getContacts(){
		let contacts = getContacts();
		this.setState({contacts});
		return contacts;
	}
	
	getLocalAccount(){
		let localAccount = window.localStorage.getItem("myAccount");
		return localAccount;
	}
	
	async importKey(localAccount = false){
		let pk;
		if(localAccount){
			pk = localAccount;
		}
		else{
			pk = window.prompt("Import base64 Private Key?");
		}
		if(!pk){return}
		pk = pk.trim();
		let secKey = pk;
		let bytes = stringToBytes(secKey);
		let localPayerAccount = new Account(bytes);
		localPayerAccount.publicKey.toBase58 = function(){
			return bs58.encode(localPayerAccount.publicKey);
		}

		console.log("local account imported:",localPayerAccount.publicKey.toBase58());
		console.log(localPayerAccount);
		let balance = await connection.getBalance(localPayerAccount.publicKey);

		this.setState({localPayerAccount,localPayerBalance:balance});
		window.localStorage.setItem("myAccount",secKey);
		
	}
	
	//Load the soltalk to Solana Chain
	async loadProgram(){
		let program_text = await fetch("/program.so").then(r=>r.blob());
		console.log(program_text,program_text.length);
		//let data = new Blob([program_text], {type : 'binary'});
		//console.log("binary data:",data);
		let buffer2 = await program_text.arrayBuffer();
		
		//buffer2 = buffer2.Uint8Array;
		console.log("buffer from data",buffer2);
		
		var programAccount = new Account();
		let programId = programAccount.publicKey;
		//let la1 = await connection.getBalance(this.state.localPayerAccount.publicKey);
		//console.log("Balance:",la1, la1/ LAMPORTS_PER_SOL);
		console.log('Loading Program To:', programId.toBase58());
		let loaded;
		try{
			loaded = await BpfLoader.load(
			connection,
			this.state.localPayerAccount,
			programAccount,
			Buffer.from(buffer2),
			BPF_LOADER_DEPRECATED_PROGRAM_ID,
			);
		}
		catch(e){
			console.log(e);
		}
		console.log("loaded ?",loaded);
		//let la2 = await connection.getBalance(this.state.localPayerAccount.publicKey);
		//console.log("Deploy Cost--->lamport:",la1-la2,"aka",(la1-la2) / LAMPORTS_PER_SOL);  
	}
	
	//Load an account to be used as a shared File
	async createRoom(){
		const chatRoomAccount = new Account();
		const chatRoomPubkey = chatRoomAccount.publicKey;
		console.log('Creating account', chatRoomPubkey.toBase58());
		const lamports = await connection.getMinimumBalanceForRentExemption(1028);
		console.log("Mininum lamports for free account:",lamports,lamports / LAMPORTS_PER_SOL);
		let ppid = window.prompt("Program Address")
		if(!ppid){return}
		console.log("using ",ppid,"as program public key");
		let programId = new PublicKey(ppid);
		const instruction = SystemProgram.createAccount({
			fromPubkey: this.state.localPayerAccount.publicKey,
			newAccountPubkey:chatRoomAccount.publicKey,
			lamports,
			space:1028,
			programId,
		});
		////
		let transaction = new Transaction().add(instruction);
		try{
			await sendAndConfirmTransaction(
				'createAccount',
				connection,
				transaction,
				this.state.localPayerAccount,
				chatRoomAccount
			);
		}
		catch(e){
			notify("Error Creating Account");
			console.log(e);
		}
		let pk = chatRoomPubkey.toBase58();
		notify(pk +" channel created");
	    console.log("new room:",pk);
	}
					
	messageKeyUp(evt){
		this.updateCharacterCount();
		if(evt.keyCode === 13){
			evt.currentTarget.disabled = true;
			return this.sendMessage();
		}
	}

	removeChatAccount(){
		if(!window.confirm("Clear local chat account keys?")){return;}
		window.localStorage.removeItem("siteKeys");
		return this.setState({siteKeys:false});
	}

	removeContact(pubKey){
		if(window.confirm("Remove Contact?")){
			let contacts = removeContact(pubKey);
			return this.setState({contacts});
		}
	}

	async sendMessage(){	
		let message = document.getElementById("newMessage");	
		if(!this.state.connection){
			message.disabled = false;
			return this.walletAdapter();
		} 
		if(!this.state.ws){
			message.disabled = false;
			return notify("Please subscribe to a chat first");
		}
		//this.setState({loading:true,loadingMessage:"sending transaction"});
		return this.transact(message.value)
		.then((confirmed)=>{
			console.log("transaction confirmed",confirmed);
			if(confirmed && confirmed.context){
				let msg = document.getElementById(confirmed.context.slot);
				if(msg){msg.setAttribute("style","background:white");}
				else{
					console.log("Unable to confirm message");
				}
			}
		})
		.catch((e)=>{console.warn("Error sending message:",e)})
		.finally(()=>{
			if(message.disabled){message.disabled = false;}
			this.updateCharacterCount();
			//this.setState({loading:false,loadingMessage:""});
		});
	}
	
	setCurrentContact(contact){
		return this.setState({currentContact:contact});
	}
	
	showContactForm(){
		this.setState({showContactForm:true});
	}
	
	subscribe(contacts){
		const attachChannels = (_ws)=>{
			let pubKey;
			let uniqueChannels = this.state.connected.slice(0);
			let message = {
				"jsonrpc":"2.0", 
				"id":0, 
				"method":"accountSubscribe",
				"params":[]
			}
			if(Object.keys(contacts).length < 1){
				//Auto subscribe to base channel
				let channel = defaultChannel;
				uniqueChannels.push(channel);
				message.id = uniqueChannels.length;
				message.params = [ channel,{"encoding":"jsonParsed"} ]; 
				_ws.send(JSON.stringify(message));
			}
			else{
				Object.keys(contacts).map(async(key)=>{
					console.log(contacts[key])
					if(!contacts[key].channel){return}
					if(_ws.send && uniqueChannels.indexOf(contacts[key].channel) < 0){
						uniqueChannels.push(contacts[key].channel);
						message.id = uniqueChannels.length;
						message.params = [ contacts[key].channel,{"encoding":"jsonParsed"} ]; 
						await setTimeout(()=>{_ws.send(JSON.stringify(message));},1500);
					}
				})
			}
			this.setState({connected:uniqueChannels});	
			console.log("Connected Channels:",uniqueChannels);		
		}	
		const onOpen = (obj)=>{
			console.log("socket open",obj);
			let ws = obj.target;
			this.setState({ws},this.getBlockHash);
			let heartbeat = setInterval( ()=>ws.send(JSON.stringify({"jsonrpc":"2.0","method":"ping","params":null})),4998);
			Intervals.push(heartbeat);
			attachChannels(ws);
		}
		const onMessage = (evt)=> {
			try{
				console.log("socket Message:",evt.data);
				this.writeLogs(evt.data);
				let account = JSON.parse(evt.data);
				if(account.params){
					let accountData = account.params.result.value.data;
					this.writeChat(atob(accountData[0]),account.params.result.context.slot);
				}
			}
			catch(e){
				console.error(e);
			}
		}

		const onClose = () => {
			console.warn("socket closed");
			for(let i = 0;i < Intervals.length;i++){
				clearInterval(Intervals[i]);
			}
			Intervals = [];
			this.subscribe(contacts);
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
	
	async transact(message,isBroadcast=false){
		if(!message || message.length < 1){return}
		let programId = this.state.currentContact.programId ? this.state.currentContact.programId : defaultProgram ;
		if(!programId){return notify("Unable to located Program ID");}
		programId = new PublicKey(programId)
		let buffer = isBroadcast ? padText(message) : await this.encodeMessage(message);
		console.log("Buffer:",buffer);
		var instruction = new TransactionInstruction({
			keys: [{pubkey:this.state.currentContact.channel ? this.state.currentContact.channel : defaultChannel, isSigner: false, isWritable: true},{pubkey:this.state.payerAccount, isSigner: true, isWritable: false}],
			programId,
			data: buffer
		});
		let _transaction =  new Transaction().add(instruction);
		let { blockhash } = await this.state.connection.getRecentBlockhash();
		_transaction.recentBlockhash = blockhash;
		_transaction.setSigners(this.state.payerAccount);
		console.log(_transaction);
		try{
			let signed = await this.state.wallet.signTransaction(_transaction);
			console.log("serialized",signed.serialize(),signed.serialize().length);
			let txid = await this.state.connection.sendRawTransaction(signed.serialize());
			console.log("confirming transaction:",txid,new Date().getTime());
			console.log("broadcast:",isBroadcast);
			//Update input box
			if(!isBroadcast){
				this.writeChatFromContact(message,Math.random().toFixed(5),false,txid)
				//this.setState({loadingMessage:"confirming transaction"});
				let input = document.getElementById("newMessage");
				input.disabled = false;
				input.value = "";
				this.updateCharacterCount();
			}
			//
			return this.state.connection.confirmTransaction(txid);
		}
		catch(e){
			console.log(e);
		}
		
	}
	
	async walletAdapter(isMessage=false){
		let connection = new Connection(clusterApiUrl('testnet'));
		let providerUrl = this.state.providerUrl;
		let wallet = new Wallet(providerUrl);
		wallet.on('connect', (publicKey) => {
			console.log('Connected to sollet.io:' + publicKey.toBase58());
			console.log(publicKey,wallet);
			if(!this.state.ws){this.subscribe();}
			this.setState({wallet,connection,payerAccount:publicKey},this.getBalance);
		});
		wallet.on('disconnect', () => {
			console.log('Disconnected');
			this.setState({wallet:false,payerAccount:false});
		});
		await wallet.connect();
	}
	
	async writeChat(string,id){
		//console.log("string length:",string.length);
		//Timestamp
		try{if(this.checkBroadCast(string)){return};}catch(e){console.log(e);}
		let packet = await this.decodeMessage(string);
		if(packet && packet.t){
			string = packet.t.trim() + " 🔓";
			//Verify Message
			let contacts = Object.keys(this.state.contacts);
			let valid;
			for(let i = 0;i < contacts.length;i++){
				let pk = new PublicKey( contacts[i] );
				let sig = packet.us.split(",");
				valid = nacl.sign.detached.verify(Buffer.from(packet.u),Buffer.from(sig), pk.toBuffer() );
				if(valid){
					this.setCurrentContact(contacts[i]);
					string = string.slice(0,string.length-2)
					string += " 🔒"
					break;
				}
			}
			
		}
		else{
			return;
		}
		return this.writeChatFromContact(string,id,true,false)
	}
	
	writeChatFromContact(string,id,inbound=false,txid){
		let time = document.createElement("p");
		time.setAttribute("class","fromStamp");
		time.innerHTML = new Date().toString().split("GMT")[0];
		//Message
		let div = document.createElement("div");
		if(inbound){
			div.setAttribute("class","msgHolderO");
		}
		else{
			div.setAttribute("class","msgHolder");
		}
		let msg = document.createElement("p");
		msg.setAttribute("class","fromMessage");
		//msg.setAttribute("style","background:orange");
		//msg.setAttribute("id",id);
		msg.innerHTML = string.trim();
		if(txid){
			msg.innerHTML += `<br/> <a href='https://explorer.solana.com/tx/${txid}?cluster=testnet' target='_blank'> ${txid.slice(0,10)} </a> `
		}
		let chat = document.getElementById("chat");
		div.appendChild(time);
		div.appendChild(msg);
		chat.appendChild(div);
		chat.scrollTo(0,chat.scrollHeight);	
	}
	
	writeLogs(string){
		document.getElementById("logs").value = string;
		return;
	}
	
	updateCharacterCount(){
		let message = document.getElementById("newMessage");
		let count = message.value ? message.value.length : 0;
		let remaining = 880 -264 - count;
		if (remaining < 0){
			message.value = message.value.slice(0,880-264);
			remaining = 0;
		}
		this.setState({characterCount: remaining });
	}
	
	unsubscribe(){
		let message = {"jsonrpc":"2.0", "id":1, "method":"accountUnsubscribe", "params":[0]}
		this.state.ws.send(JSON.stringify(message));
		return;
	}	
		
	render(){
	  return (
		<div className="App">
		{ this.state.loading ? <ProgressBar id="progressBar" striped animated now={99} label={this.state.loadingMessage}/> : null }
		<Row className="grid">
			<Col sm={2} md={3} className="leftCol">
				<div className="topBar">
					{ 
						this.state.payerAccount ? 
						<div id="solletAccount">
							<p> 
								<img className="avatar" src={"https://robohash.org/"+this.state.payerAccount.toBase58()+"?size=64x64"} />
									{this.state.payerAccount.toBase58()}
								<br/>	{this.state.payerAccountBalance} SOL 
								<br/>{this.state.providerUrl} 
							</p>
						</div>
						: 
						<Button id="connectWalletButton" size="sm" onClick={this.walletAdapter}>CONNECT WALLET</Button> 
					}
				</div>
				<ListView 
					addContact={this.addContact} 
					contacts={this.state.contacts} 
					cancelContactForm={this.cancelContactForm} 
					currentContact={this.state.currentContact}
					removeContact={this.removeContact}
					setCurrentContact={this.setCurrentContact}
					showContactForm_state={this.state.showContactForm} 
					showContactForm={this.showContactForm}
				/>
			</Col>
			<Col sm={10} md={9} id="col-sm-9">
				<div className="topBar">
					<Row>
						<Col sm={3} md={2}>
							{this.state.currentContact.pubKey ? <img src={"https://robohash.org/"+this.state.currentContact.pubKey+"?size=64x64"} /> : null }
						</Col>
						<Col sm={9} md={10}>
						    {
								this.state.currentContact.channel ?
								<div>
									channel: <a href={'https://explorer.solana.com/address/'+this.state.currentContact.channel+'?cluster=testnet'} target="_blank">{this.state.currentContact.channel}</a>
									<br/>
									newtwork:  <a href={'https://explorer.solana.com/address/'+this.state.currentContact.programId+'?cluster=testnet'} target="_blank">{this.state.currentContact.programId} </a>
								</div>
								:null
							}

						  {
							  (this.state.siteKeys && this.state.siteKeys.publicKey) ? 
							  <div>
								<Button size="sm" onClick={this.broadcastPresence}>Broadcast Presence</Button>
								<Button size="sm" variant="danger" onClick={this.removeChatAccount}>Dispose Chat Keys</Button>
							   </div>: 
							   <Button onClick={this.createLocalChatAccount}>Create Chat Keys</Button> 
						   }
						</Col>
					</Row>		
				</div>
				<Row> 
					<div id="chat"> 
											
					</div>
				</Row>
				<div id="charCount">#{this.state.characterCount}</div>
				<Row id="chatHolder">
					<InputGroup className="mb-3">
						<FormControl
						  placeholder="Type a message"
						  aria-label="new_message"
						  aria-describedby="new_message"
						  id="newMessage"
						  onKeyUp={this.messageKeyUp}
						/>
						<InputGroup.Append>
						  <Button onClick={this.sendMessage}> SEND </Button>
						</InputGroup.Append>
					</InputGroup>						
				</Row>
			</Col>
		</Row>
		<Row id="logRow">
			<Col sm="12">
				<p>Logs</p>
				<textarea id="logs"></textarea>
			</Col>
		</Row>
		<Row>
			<Col sm={12}>
				<div id="extras">
				{ 
					this.state.localPayerAccount ?
					<div>
						<p> {this.state.localPayerAccount.publicKey.toBase58()}  {this.state.localPayerBalance / LAMPORTS_PER_SOL} </p>
						<ButtonGroup> 
							<Button variant="warning" onClick={this.loadProgram}>Deploy Chat</Button>
							<Button variant="danger" onClick={()=>this.importKey()}>Import New Private Key</Button>
							<Button onClick={this.createRoom}> Launch a new room </Button>
						</ButtonGroup>
					</div>
					:<Button variant="danger" onClick={()=>{this.importKey()}}>Import Private Key </Button>
				}
				</div>
			</Col>
		</Row>
		</div>);
	}
}


function ListView(props){
	return(<div>
		<ListGroup className="contactCol">
			{
				Object.keys(props.contacts).length > 0 && Object.keys(props.contacts).map((item,ind)=>(
					<ListGroup.Item key={ind} onClick={()=>{props.setCurrentContact(props.contacts[item])}} style={{background: props.currentContact.pubKey === props.contacts[item].pubKey ? "#d6ebce96" : "" }}>
						<Row>
							<Col sm={2} md={3} lg={2}>
								<img className="contactImg" src={"https://robohash.org/"+props.contacts[item].pubKey+"?size=64x64"} />
							</Col>
							<Col sm={10} md={9} lg={10}>
								<p className="contactTime">
									{timeAgo.format(new Date(props.contacts[item].time),'round')}
								</p>
								<p className="contactInfo">
									{props.contacts[item].publicKey}
									<br/>
									{props.contacts[item].chatPublicKey}
									<br/>
									{props.contacts[item].message}
								</p>
							</Col>
							<Button variant="default" size="sm" onClick={()=>props.removeContact(item)}>❌</Button>
						</Row>	
					</ListGroup.Item>
				))
			}
		</ListGroup>
		<div id="addContact">
			{
				props.showContactForm_state ?
				<Button variant="danger" block onClick={props.cancelContactForm}>CANCEL</Button>		
				: <Button block onClick={props.showContactForm}>ADD CONTACT</Button>		
			}
		</div>	
		{
			props.showContactForm_state ?
			<div id="addContactForm">
				<InputGroup className="mb-3">
					<FormControl
					  placeholder="Solana Public Key"
					  aria-label="contact_publickey"
					  aria-describedby="contact_publickey"
					  id="new_contact_key"
					/>
					<FormControl
					  placeholder="Chat Public Key"
					  aria-label="chat_publickey"
					  aria-describedby="chat_publickey"
					  id="new_chat_key"
					/>
					<InputGroup.Append>
					  <Button variant="primary" onClick={props.addContact}>add</Button>
					  <Button variant="danger" onClick={props.cancelContactForm}>cancel</Button>
					</InputGroup.Append>
				</InputGroup>	
			</div>
			: null
		}
	</div>)
}
	
export default App;
