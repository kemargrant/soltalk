import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
//ETC
import QRCode from 'qrcode'
// Time Ago English
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
//Crypto
import bs58 from 'bs58';
import nacl from 'tweetnacl';
//Bootstrap imports
import { 
	Badge,Button,ButtonGroup,Col,
	FormControl,ListGroup,
	InputGroup,
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
//Components
import { Recorder } from './Components/Recorder';

var socketRoot;
var urlRoot;
var Intervals = []
var defaultProgram;
var defaultChannel;
var FILES = {}

TimeAgo.addLocale(en)
// Date formatter.
const timeAgo = new TimeAgo('en-US')

if(window.location.href.search("localhost") > -1){
	urlRoot = "https://testnet.solana.com/";
	socketRoot = "ws://testnet.solana.com:8900";
	defaultProgram = "JB2LCd9oV7xNemBSV8dJu6gkrpWQSrDPcfHUQAQnXRZu";
	defaultChannel = "BoSJNDkt37kxQthSgvMqCER1dMzyqEUS34Kkp2YazEiq";	
	console.log("Running Local");
}
else{
	urlRoot = "https://testnet.solana.com/";
	socketRoot = "wss://testnet.solana.com";
	defaultProgram = "JB2LCd9oV7xNemBSV8dJu6gkrpWQSrDPcfHUQAQnXRZu";
	defaultChannel = "BoSJNDkt37kxQthSgvMqCER1dMzyqEUS34Kkp2YazEiq";
	console.log("Running Production")	
	//console.log = function(){}
	//console.warn = function(){}

}

///////////////////////////

/**
* Convert string to Uint8Array
* @method stringToBytes
* @param {String} String to convert
* @return {Uint8Array} Bytes representing the input string
*/
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

/**
* Connect to Solana network cluster
* @method establishConnection
* @return {null}
*/
async function establishConnection(): Promise<void> {
  connection = new Connection(urlRoot, 'recent');
  const version = await connection.getVersion();
  console.log('Connection to cluster established:', urlRoot, version);
  return;
}

/**
* Add contact to localStorage "contacts" object
* @method addContact
* @param {String} Solana public key
* @param {String} RSA public key
* @return {Object} Contacts {publicKey:{publicKey,channel,chatPublicKey,programId,message,time}...}
*/
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
		message:0,
		time:new Date().getTime()
	}
	window.localStorage.setItem("contacts",JSON.stringify(contacts));	
	return contacts;
}

/**
* Use window.crypto.subtle to decrypt an encrypted message
* @method decryptMessage
* @param {String} window.crypto.subtle RSA private key
* @param {String / Uint8Array } Encrypted messagge
* @return {Promise} Should resolve to an ArrayBuffer
*/
function decryptMessage(rsaPrivateKey,encryptedMessage) {
	if(typeof encryptedMessage !== "object"){encryptedMessage = Buffer.from(encryptedMessage);}
	return window.crypto.subtle.decrypt(
		{name: "RSA-OAEP"},
		rsaPrivateKey,
		encryptedMessage
	);
}

/**
* Use window.crypto.subtle to encrypt a message
* @method encryptMessage
* @param {String} window.crypto.subtle RSA public key
* @param {String / Uint8Array } Message
* @return {Promise} Should resolve to an ArrayBuffer
*/
function encryptMessage(rsaPublicKey,message) {
	if(typeof message === "string"){message = Buffer.from(message);}
	return window.crypto.subtle.encrypt(
		{name: "RSA-OAEP"},
		rsaPublicKey,
		message
	);
}

/**
* Use window.crypto.subtle to encrypt a message
* @method generateRSAKeyPair
* @return {Promise} Should resolve to a window.crypto.subtle RSA key pair
*/
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


/**
* Retrieve Contacts object from localStorage
* @method getContacts
* @param {Boolean} Clear unread messages ?
* @return {Object} Contacts {publicKey:{publicKey,channel,chatPublicKey,programId,message,time}...}
*/
function getContacts(clearUnread){
	let contacts = window.localStorage.getItem("contacts");	
	contacts = contacts ? JSON.parse(contacts) : {} ;
	if( Object.keys(contacts).length < 1){
		//Tom 
		//contacts = addContact("CRBzvyRxKqBEfEinhp89kxykYHKyek5D9Yh5rh3kxzrC","");		
	}
	if(clearUnread){
		Object.keys(contacts).map((item)=>{
			return contacts[item].message =0;
		});
		window.localStorage.setItem("contacts",JSON.stringify(contacts));	
	}
	return contacts;
}

/**
* Retrieve window.crypto.subtle RSA keys from localStorage
* @method getRSAKeys
* @return {Promise} Should resolve to window.crypto.subtle key pair
*/
async function getRSAKeys(){
	if(!window.crypto.subtle){return {}}
	let rsaKeyPair = window.localStorage.getItem("rsaKeys");	
	if(rsaKeyPair){
		rsaKeyPair = JSON.parse(rsaKeyPair);
		rsaKeyPair.publicKey = await importPublicKey(rsaKeyPair.publicKey);
		rsaKeyPair.privateKey = await importPrivateKey(rsaKeyPair.privateKey);
	}
	else{rsaKeyPair = {}}
	return rsaKeyPair;
}

/**
* Get URL to transaction on explorer.solana.com
* @method getTransactionURL
* @param {String} Transaction ID
* @return {String} Transaction URL
*/
function getTransactionURL(txid){
	let network = urlRoot.split("//")[1].split(".")[0];
	return `https://explorer.solana.com/tx/${txid}?cluster=${network}`
}

/**
* Convert JWK to window.crypto.subtle private key
* @method importPrivateKey
* @param {Object} JSON Web Private Key
* @return {Promise} Should resolve to window.crypto.subtle private key
*/
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

/**
* Convert JWK to window.crypto.subtle public key
* @method importPublicKey
* @param {Object} JSON Web Public Key
* @return {Promise} Should resolve to window.crypto.subtle public key
*/
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

/**
* Sign a message sting locally
* @method localSign
* @param {String} Message to sign
* @return {Uint8Array} Return Uint8Array of the signature
*/
function localSign(message,Account){
	message = Buffer.from(message);
	let privateKey = new Uint8Array(Account.secretKey);
	let signature = nacl.sign.detached(message,privateKey);
	return new Uint8Array(signature);
}

/**
* Show notifiation message
* @method notify
* @param {String} Notification message
* @return {null} 
*/
function notify(message){
	alert(message);
	return;
}

/**
* Pad string with spaces to fill 1028 bytes
* @method padText
* @param {String} String to pad
* @return {Uint8Array} 
*/
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

/**
* Pause function execution
* @method sleep
* @param {Number} Time in ms to sleep
* @return {Promise} Resolve to undefined
*/
async function sleep(ms){
	return await new Promise((resolve,reject)=>{ return setTimeout(resolve,ms) });
}

/**
* Upadate localStorage contacts object
* @method updateContacts
* @param {Object} Contacts {publicKey:{publicKey,channel,chatPublicKey,programId,message,time}...}
* @return {null} 
*/
function updateContacts(contactsObject){
	window.localStorage.setItem("contacts",JSON.stringify(contactsObject));	
	return;
}

////////////////////////

class App extends React.Component{ 
	constructor(props){
		super(props);
		this.state = {
			autoSaveHistory:window.localStorage.getItem("autoSaveHistory") ? window.localStorage.getItem("autoSaveHistory") : "",
			avatarStyle: window.localStorage.getItem("avatarStyle") ? window.localStorage.getItem("avatarStyle") : "",
			characterCount:880-264,
			currentContact:{},
			contacts:[],
			connected:[],
			loading:false,
			loadingMessage:"",
			loadingValue:0,
			localPayerAccount:false,
			localPayerBalance:0,
			MESSAGE_HISTORY:window.localStorage.getItem("message_history") ? JSON.parse(window.localStorage.getItem("message_history")) : {},
			payerAccount:false,
			payerAccountBalance:0,
			providerUrl:'https://www.sollet.io/#origin='+window.location.origin+'&network=testnet',
			rsaKeyPair:false,
			showSolanaQR:false,
			showContactForm:false,
			solanaQRURL:"",
			wallet:false,
			ws:null,
			viewContacts:true,
			viewStyle: window.localStorage.getItem("viewStyle") ? window.localStorage.getItem("viewStyle") : "",			
		}
		
		this.addContact = this.addContact.bind(this);
		this.appendChat = this.appendChat.bind(this);
		this.appendAudio = this.appendAudio.bind(this);
		this.appendImage = this.appendImage.bind(this);

		this.badgeContact = this.badgeContact.bind(this);
		this.broadcastPresence = this.broadcastPresence.bind(this);
		
		this.cancelContactForm = this.cancelContactForm.bind(this);
		this.checkBroadcast = this.checkBroadcast.bind(this);
		this.connectWallet = this.connectWallet.bind(this);		
		this.constructAndSendTransaction = this.constructAndSendTransaction.bind(this);

		this.createRSAKeyPair = this.createRSAKeyPair.bind(this);
		
		this.decryptData = this.decryptData.bind(this);
		this.deleteMessageHistory = this.deleteMessageHistory.bind(this);
		this.disconnectWebSocket = this.disconnectWebSocket.bind(this);
		
		this.encryptFile = this.encryptFile.bind(this);
		this.encryptMessage = this.encryptMessage.bind(this);
		this.exportContacts = this.exportContacts.bind(this);
		this.exportPrivateKey = this.exportPrivateKey.bind(this);
		this.exportRSAKeys = this.exportRSAKeys.bind(this);
		
		this.generateQRCode = this.generateQRCode.bind(this);
		this.getContacts = this.getContacts.bind(this);
		this.getHistory = this.getHistory.bind(this);
		this.getLocalAccount = this.getLocalAccount.bind(this);
		
		this.importKey = this.importKey.bind(this);
		this.importRSAKeys_JSON = this.importRSAKeys_JSON.bind(this);
		
		this.loadProgram = this.loadProgram.bind(this);
		this.loadProgramControlledAccount = this.loadProgramControlledAccount.bind(this);

		this.parseAccountData = this.parseAccountData.bind(this);
		this.processFile = this.processFile.bind(this);
		this.promptContactAddition = this.promptContactAddition.bind(this);
		
		this.messageKeyUp = this.messageKeyUp.bind(this);
		
		this.removeContact = this.removeContact.bind(this);
		this.removeImportedAccount = this.removeImportedAccount.bind(this);		
		this.removeRSAKeys = this.removeRSAKeys.bind(this);
		this.renderDesktop = this.renderDesktop.bind(this);

		this.saveMessageHistory = this.saveMessageHistory.bind(this);
		this.sendFile = this.sendFile.bind(this);
		this.sendMessage = this.sendMessage.bind(this);
		this.setCurrentContact = this.setCurrentContact.bind(this);
		this.showContactForm = this.showContactForm.bind(this);
		this.subscribe = this.subscribe.bind(this);
		
		this.toggleShowSolanaQR = this.toggleShowSolanaQR.bind(this);
		this.toggleContactsView = this.toggleContactsView.bind(this);
		
		this.writeLog= this.writeLog.bind(this);
		
		this.uploadAudioFile = this.uploadAudioFile.bind(this);	
		this.updateAvatarStyle = this.updateAvatarStyle.bind(this);	
		this.updateAutoSaveHistory = this.updateAutoSaveHistory.bind(this);
		this.updateViewStyle = this.updateViewStyle.bind(this);			
		this.uploadImageFile = this.uploadImageFile.bind(this);
		this.unsubscribe = this.subscribe.bind(this);
		this.updateCharacterCount = this.updateCharacterCount.bind(this);
		this.updateInputBox = this.updateInputBox.bind(this);
	}
	
	/**
	* Add contact from input form or input parameters
	* @method addContact
	* @param {String} Solana public key default null
	* @param {String} RSA public key default null
	* @return {Null}
	*/
	addContact(solanaPublicKey=null,rsaPublicKey=null){
		if(!solanaPublicKey && !rsaPublicKey){
			//Add contact from form
			let solanaPublicKey = document.getElementById("new_contact_key");
			let rsaPublicKey = document.getElementById("new_chat_key");
			if(solanaPublicKey && solanaPublicKey.length === 44){
				addContact(solanaPublicKey.value,rsaPublicKey.value);
				this.cancelContactForm();
			}
		}
		else{
			addContact(solanaPublicKey,rsaPublicKey)
		}
		this.getContacts();
		return;
	}
	
	/**
	* Add audio to chat interface
	* @method appendAudio
	* @param {String} Audio objectURL src
	* @param {String} Solana public key of contact ?
	* @return {Null}
	*/
	appendAudio(audio_src,solanaPublicKey){
		let message_history = this.state.MESSAGE_HISTORY;
		if(!message_history[solanaPublicKey]){
			message_history[solanaPublicKey] = []
		}
		message_history[solanaPublicKey].push({
			audio_src,
			time:new Date().getTime(),			
		});	
		this.setState({MESSAGE_HISTORY:message_history},this.saveMessageHistory);	
		return;			
	}
	
	/**
	* Add message to chat interface
	* @method appendChat
	* @param {String} Message
	* @param {String} Transaction ID
	* @param {String} Solana public key
	* @return {Null}
	*/
	appendChat(message,txid,solanaPublicKey){
		let message_history = this.state.MESSAGE_HISTORY;
		if(!message_history[solanaPublicKey]){
			message_history[solanaPublicKey] = []
		}
		message_history[solanaPublicKey].push({
			message,
			time:new Date().getTime(),
			txid,
			
		});
		if(solanaPublicKey !== this.state.currentContact.publicKey){
			let contacts = this.state.contacts;
			if(contacts[solanaPublicKey]){
				contacts[solanaPublicKey].message += 1;
			}
			else{
				contacts[solanaPublicKey] = {
					publicKey:solanaPublicKey,
					channel:defaultChannel,
					chatPublicKey:"rsa pub key-missing",
					programId:defaultProgram,
					message:1,
					time:new Date().getTime()
				}
			}
			updateContacts(contacts);
		}
		this.setState({MESSAGE_HISTORY:message_history},this.saveMessageHistory);
		let chat;
		if(this.state.viewStyle === "mobile"){
			chat = document.getElementsByClassName("mobileChatHolder");
			if(chat){chat = chat[0]}
		}
		else{
			chat = document.getElementById("chat");
		}
		if(chat){chat.scrollTo(0,chat.scrollHeight);}
		return;
	}
		
	/**
	* Add image to chat interface
	* @method appendImage
	* @param {String} Image objectURL src
	* @param {String} Solana public key of contact ?
	* @return {Null}
	*/
	appendImage(img_src,solanaPublicKey){
		let message_history = this.state.MESSAGE_HISTORY;		
		if(!message_history[solanaPublicKey]){
			message_history[solanaPublicKey] = []
		}
		message_history[solanaPublicKey].push({
			img_src,
			time:new Date().getTime(),			
		});	
		this.setState({MESSAGE_HISTORY:message_history},this.saveMessageHistory);	
		return;			
	}
		
	/**
	* Update message field of contact
	* @method badgeContact
	* @param {String} Solana base58 public key
	* @return {Null}
	*/
	badgeContact(solanaPublicKey){
		let contacts = this.state.contacts;
		if( this.state.currentContact.publicKey !== solanaPublicKey && contacts[solanaPublicKey]){
			contacts[solanaPublicKey].message++;
		}
		updateContacts(contacts);
		this.setState(contacts);
		return;
	}
			
	/**
	* Send a presence message
	* @method broadcastPresence
	* @return {Promise} Should resolve to a confirmed transaction object {context:{slot},value:{err}}
	*/	
	async broadcastPresence(){
		if(!this.state.wallet && !this.state.localPayerAccount){
			await this.connectWallet();
		}
		let rsaPublicKey_JWK = await crypto.subtle.exportKey("jwk",this.state.rsaKeyPair.publicKey);
		let transaction = {
			addSignature:function(key,signature){
				this.signature = signature;
				this.key = key;
			},
			key:false,
			message:"",
			serializeMessage:function(){
				return Buffer.from(this.message);
			},
			signature:false,
		}
		if(this.state.payerAccount){
			transaction.message = this.state.payerAccount.toBase58()+" "+ rsaPublicKey_JWK.n;
			await this.state.wallet.signTransaction(transaction);
		}
		else{
			transaction.message = this.state.localPayerAccount.publicKey.toBase58()+" "+ rsaPublicKey_JWK.n;
			transaction.signature = localSign(transaction.message,this.state.localPayerAccount); 
		}
		let presence = transaction.message+" "+transaction.signature.join(",");
		return this.constructAndSendTransaction(presence,true);
	}
	
	/**
	* Hide form to add a new contact
	* @method cancelContactForm
	* @return {Null}
	*/	
	cancelContactForm(){
		this.setState({showContactForm:false});
		return;
	}
	
	/**
	* Check if message is a valid broadcast message
	* @method checkBroadcast
	* @param {String} Message
	* @return {Boolean}
	*/	
	checkBroadcast(message){
		let isBroadcast = false;
		try{
			message = message.split(" ");
			let valid;
			let str = message[0] + " " + message[1];
			let sig = Buffer.from(message[2].split(","));
			valid = nacl.sign.detached.verify(Buffer.from(str),sig,new PublicKey(message[0]).toBuffer());
			isBroadcast = valid;
			if(valid){
				this.promptContactAddition(message[0],message[1]);
			}
		}
		catch(e){
			console.log(e);
		}
		return isBroadcast;
	}
	
	/**
	* Standard react component
	*/		
	async componentDidMount(){
		establishConnection().catch(console.warn);;	
		let contacts = await this.getContacts(true);
		this.subscribe(contacts);
		//Set current contact
		if(Object.keys(contacts).length > 0){
			this.setCurrentContact( contacts[ Object.keys(contacts)[0] ] );
		}
		//Setup rsa keys
		let rsaKeyPair = await getRSAKeys();
		if(Object.keys(rsaKeyPair).length > 1){
			this.setState({rsaKeyPair});
		}
		else{
			//auto setup the rsa keys for the user
			this.createRSAKeyPair().catch(console.warn);
		}
		//Sign in local user
		if(this.getLocalAccount()){
			this.importKey(this.getLocalAccount());
		}
	}
	
	/**
	* Connect to Solana wallet using sollet wallet adapter
	* @method connectWallet
	* @return {Promise} Resolve to boolean
	*/	
	connectWallet(){
		return new Promise((resolve,reject)=>{
			let network = this.state.providerUrl.split("=");
			network = network[network.length - 1];
			let connection = new Connection(clusterApiUrl(network));
			let wallet = new Wallet(this.state.providerUrl);
			wallet.on('connect', async (publicKey) => {
				console.warn('Connected to sollet.io:' + publicKey.toBase58(),"on",network);
				//Set qr code
				let solanaQRURL = await this.generateQRCode(publicKey.toBase58());
				if(this.state.rsaKeyPair){
					solanaQRURL += " "+this.state.rsaKeyPair.publicKey.n;
				}
				//
				return this.setState({wallet,connection,payerAccount:publicKey,solanaQRURL},()=>{
					this.getBalance();
					if(!this.state.ws){this.subscribe();}
					return resolve(true);
				});
			});
			wallet.on('disconnect', () => {
				console.warn('Wallet Disconnected');
				this.setState({wallet:false,payerAccount:false});
			});
			wallet.connect();
		})
	}
	
	/**
	* Construct and send transaction to the network
	* @method constructAndSendFile
	* @param {Array} Array of encrypted Uint8Arrays
	* @return {Promise} Should resolve to an array of confirmed transactions object [ {context:{slot},value:{err}}, ... ]
	*/	
	async constructAndSendFile(encryptedBytesArray){
		if(!encryptedBytesArray || encryptedBytesArray.length < 1){return notify("Unable to send blank file");}
		let programId = this.state.currentContact.programId ? this.state.currentContact.programId : defaultProgram ;
		programId = new PublicKey(programId);
		let transactions = [];
		this.setState({loading:true,loadingMessage:"Sending File"});
		for(let i = 0;i < encryptedBytesArray.length; i++){
			if(this.state.payerAccount){
				let instruction = new TransactionInstruction({
					keys: [
						{pubkey:this.state.currentContact.channel ? this.state.currentContact.channel : defaultChannel, isSigner: false, isWritable: true},
						{pubkey:this.state.payerAccount, isSigner: true, isWritable: false}
					],
					programId,
					data: encryptedBytesArray[i]
				});
				let _transaction =  new Transaction().add(instruction);
				let { blockhash } = await this.state.connection.getRecentBlockhash();
				_transaction.recentBlockhash = blockhash;
				_transaction.setSigners(this.state.payerAccount);
				let signed = await this.state.wallet.signTransaction(_transaction);
				let txid = await this.state.connection.sendRawTransaction(signed.serialize());
				transactions.push(this.state.connection.confirmTransaction(txid));
			}
			else{
				let instruction = new TransactionInstruction({
					keys: [
						{pubkey:this.state.currentContact.channel ? new PublicKey(this.state.currentContact.channel) : new PublicKey(defaultChannel), isSigner: false, isWritable: true},
						{pubkey:this.state.localPayerAccount.publicKey , isSigner: true, isWritable: false}
					],
					programId,
					data: encryptedBytesArray[i]
				});
				let _transaction =  new Transaction().add(instruction);	
				let { blockhash } = await connection.getRecentBlockhash();
				_transaction.recentBlockhash = blockhash;				
				_transaction.sign(this.state.localPayerAccount);
				let tx = await sendAndConfirmTransaction(
					'',
					connection,
					_transaction,
					this.state.localPayerAccount,
				);
				transactions.push(tx);
				this.setState({loadingValue:(100*transactions.length)/encryptedBytesArray.length});
				sleep(400);
			}		
		}
		this.setState({loading:false,loadingMessage:""});
		return transactions;	
	}	
		
	/**
	* Construct and send transaction to the network
	* @method constructAndSendTransaction
	* @param {String} Message to send
	* @param {Boolean} Is this a broadcast message?
	* @return {Promise} Should resolve to a confirmed transaction object {context:{slot},value:{err}}
	*/	
	async constructAndSendTransaction(message,isBroadcast=false){
		if(!message || message.length < 1){return notify("Unable to send blank message");}
		let programId = this.state.currentContact.programId ? this.state.currentContact.programId : defaultProgram ;
		programId = new PublicKey(programId);
		let buffer = isBroadcast ? padText(message) : await this.encryptMessage(message);
		let txid;
		if(this.state.payerAccount){	
			let instruction = new TransactionInstruction({
				keys: [
					{pubkey:this.state.currentContact.channel ? this.state.currentContact.channel : defaultChannel, isSigner: false, isWritable: true},
					{pubkey:this.state.payerAccount, isSigner: true, isWritable: false}
				],
				programId,
				data: buffer
			});
			let _transaction =  new Transaction().add(instruction);
			let { blockhash } = await this.state.connection.getRecentBlockhash();
			_transaction.recentBlockhash = blockhash;		
			_transaction.setSigners(this.state.payerAccount);
			let signed = await this.state.wallet.signTransaction(_transaction);
			let tx = await this.state.connection.sendRawTransaction(signed.serialize());
			if(!isBroadcast){this.updateInputBox(message,tx);}
			txid = this.state.connection.confirmTransaction(tx);	
		}
		else{
			let instruction = new TransactionInstruction({
				keys: [
					{pubkey:this.state.currentContact.channel ? new PublicKey(this.state.currentContact.channel) : new PublicKey(defaultChannel), isSigner: false, isWritable: true},
					{pubkey:this.state.localPayerAccount.publicKey , isSigner: true, isWritable: false}
				],
				programId,
				data: buffer
			});
			let _transaction =  new Transaction().add(instruction);	
			let { blockhash } = await connection.getRecentBlockhash();
			_transaction.recentBlockhash = blockhash;				
			_transaction.sign(this.state.localPayerAccount);
			txid = await sendAndConfirmTransaction(
				'',
				connection,
				_transaction,
				this.state.localPayerAccount,
			);
			if(!isBroadcast){ this.updateInputBox(message,txid);}
		}	
		return txid;
	}	
	
	/**
	* Create local RSA key pair
	* @method createRSAKeyPair
	* @return {null}
	*/	
	async createRSAKeyPair(){
		if(!this.state.rsaKeyPair){
			let rsaKeyPair = await generateRSAKeyPair();
			let exportedKeys= {
				publicKey:await crypto.subtle.exportKey("jwk",rsaKeyPair.publicKey),
				privateKey:await crypto.subtle.exportKey("jwk",rsaKeyPair.privateKey)
			}
			this.setState({rsaKeyPair});
			window.localStorage.setItem("rsaKeys",JSON.stringify(exportedKeys));
		}
		return;
	}
	
	/**
	* Decrypt an encrypted data field
	* @method decryptData
	* @return {Promise} Should resolve to message object {t,u,us}
	*/	
	async decryptData(data){
		try{
			let p1 = stringToBytes(data.slice(0,512));
			let p2 = stringToBytes(data.slice(512,1024));
			let decoder = new TextDecoder(); 
			let d1 = await decryptMessage(this.state.rsaKeyPair.privateKey,Buffer.from(p1));
			let d2 = await decryptMessage(this.state.rsaKeyPair.privateKey,Buffer.from(p2));
			let txt1 = decoder.decode( d1 );
			let txt2 = decoder.decode( d2 );
			let packet = JSON.parse(txt1+txt2);
			console.log("json_message:",packet);
			return packet;
		}
		catch(e){
			console.log(e);
			return {}
		}
	}
	
	/**
	* Delete message history from localstorage on confirmation from user
	* @method deleteMessageHistory
	* @return {Null}
	*/	
	deleteMessageHistory(){
		if(window.confirm("Delete message history?")){
			window.localStorage.removeItem("message_history");
			this.setState({MESSAGE_HISTORY:{}});
		}
		return;
	}	
	
	/**
	* Disconnect from RPC websocket endpoint
	* @method disconnectWebSocket
	* @return {null}
	*/		
	disconnectWebSocket(){
		this.state.ws.close();
		this.setState({ws:false,connected:[]});
		return;
	}
	
	/**
	* Transform a text message into an encrypted byte array
	* @method encryptFile
	* @param {ArrayBuffer} ArrayBuffer of file
	* @param {String} File name
	* @param {String} File type  mobile
	* @return {Promise} Should resolve to multiple encrypted Uint8Array(1028). // [512,512,4]
	*/		
	async encryptFile(file,name){
		try{
			let packet = {
				f:0,
				p:"",
				c:"",
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
			file = new Uint8Array(file).toString();
			let extension = name.split(".");
			extension = extension.length > 0 ? extension[extension.length - 1] : "";
			let standardSize = Math.floor((880 - 275 - 7)/1.02); //598
			let packets = []
			let totalPieces = 0;
			for (let i = 0; i*standardSize < file.length; i++){
				let obj = {}
				obj.u = Math.random().toFixed(6).slice(2);
				obj.p = i+1;
				if(i === 0){
					obj.e = extension;
				}
				if(i*standardSize+standardSize < file.length){
					obj.f = file.slice(i*standardSize,i*standardSize+standardSize);
				}
				else{
					obj.f = file.slice(i*standardSize);
				}
				packets.push(obj);
				totalPieces++;
			}
			if(!window.confirm("Sign and send "+packets.length+" transactions?")){return false};
			//Sign message (Overhead)
			for(let i = 0;i < packets.length;i++){
				faux_transaction.message = packets[i].u;
				if(this.state.payerAccount){
					await this.state.wallet.signTransaction(faux_transaction);
					packets[i].us = new Uint8Array(faux_transaction.signature).toString();
				}
				else{
					packets[i].us = localSign(packets[i].u,this.state.localPayerAccount).toString();
				}
				packets[i].c = totalPieces;
				if(Buffer.from(JSON.stringify(packets[i])).length > 880){
					//TODO: Recurse and reduce standardSize variable
					return notify("Unable to send file");
				}				
			}
			let encryptedBytesArray = [];
			let encryptedBytes;
			let enc1;
			let enc2;
			let msg;
			let jwk = {
				alg: "RSA-OAEP-256",
				e: "AQAB",
				ext: true,
				key_ops: ["encrypt"],
				kty: "RSA",
				n:this.state.currentContact.chatPublicKey
			}
			//The public key of the recipient
			let publicContactKey = await importPublicKey(jwk);
			for(let j =0;j < packets.length;j++){
				msg = JSON.stringify(packets[j]);
				enc1 = await encryptMessage(publicContactKey,msg.slice(0,440));
				enc2 = await encryptMessage(publicContactKey,msg.slice(440,880));
				encryptedBytes = new Uint8Array(1028);
				encryptedBytes.set(new Uint8Array(enc1));
				encryptedBytes.set(new Uint8Array(enc2),enc2.byteLength);
				encryptedBytesArray.push(encryptedBytes);
			}
			return encryptedBytesArray;
		}
		catch(e){
			console.log(e);
			return null;
		}
	}
	
	/**
	* Transform a text message into an encrypted byte array
	* @method encryptMessage
	* @param {String} Text message
	* @return {Promise} Should resolve to an encrypted Uint8Array(1028). // [512,512,4]
	*/		
	async encryptMessage(msg){
		try{
			if(msg.length > 1028){
				return notify("Message size violation");
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
			if(this.state.payerAccount){
				await this.state.wallet.signTransaction(faux_transaction);
				packet.us = new Uint8Array(faux_transaction.signature).toString();
			}
			else{
				packet.us = localSign(packet.u,this.state.localPayerAccount).toString();
			}
			//pad message
			while(Buffer.from(JSON.stringify(packet)).length < 880){
				packet.t += " ";
			}
			msg = JSON.stringify(packet);
			// 
			let jwk = {
				alg: "RSA-OAEP-256",
				e: "AQAB",
				ext: true,
				key_ops: ["encrypt"],
				kty: "RSA",
				n:this.state.currentContact.chatPublicKey
			}
			//The public key of the recipient
			let publicContactKey = await importPublicKey(jwk);
			let enc1 = await encryptMessage(publicContactKey,msg.slice(0,440));
			let enc2 = await encryptMessage(publicContactKey,msg.slice(440,880));
			let encryptedBytes = new Uint8Array(1028);
			encryptedBytes.set(new Uint8Array(enc1));
			encryptedBytes.set(new Uint8Array(enc2),enc2.byteLength);
			return encryptedBytes;
		}
		catch(e){
			console.log(e);
			return null;
		}
		
	}
	
	
	/**
	* Export user contacts
	* @method exportContacts
	* @return {null} 
	*/	
	exportContacts() {
		let contacts = window.localStorage.getItem("contacts");
		this.exportFile("contacts.json",contacts);
		return;
	}	
	
	/**
	* Download a file to the browser
	* @method exportFile
	* @param {String} Filename
	* @param {Object} JSON object to export
	* @return {null} 
	*/	
	exportFile(filename, text) {
		let element = document.createElement('a');
		element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
		element.setAttribute('download', filename);
		element.style.display = 'none';
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
		return;
	}	
	
	/**
	* Export the private key of a local user
	* @method exportPrivateKey
	* @return {null} 
	*/	
	exportPrivateKey() {
		if(!this.state.localPayerAccount){return}
		let pk = this.state.localPayerAccount._keypair.secretKey;
		pk = JSON.stringify({key:"["+new Array(pk).toString()+"]"});
		this.exportFile("secret_"+new Date().getTime()+".json",pk);
		return;
	}	
	
	/**
	* Export the RSA keys of the user
	* @method exportRSAKeys
	* @return {null} 
	*/	
	exportRSAKeys() {
		if(!this.state.rsaKeyPair){return}
		let rsaKeyPair = window.localStorage.getItem("rsaKeys");
		this.exportFile("rsaKeys.json",rsaKeyPair);
		return;
	}			
	
	/**
	* Generate QR Code dataURL
	* @method generateQRCode
	* @param {String} Input string
	* @return {String} Image DataURL 
	*/	
	async generateQRCode(input_text){
		return await QRCode.toDataURL(input_text,{width:1280});
	}
	
	/**
	* Update the balance of the connected sollet wallet
	* @method getBalance
	* @return {null} 
	*/			
	async getBalance(){
		let balance = await connection.getBalance(this.state.payerAccount);
		this.setState({payerAccountBalance:balance / LAMPORTS_PER_SOL});
		return;
	}
	
	/**
	* Update and retrieve contacts store in localStorage
	* @method getContacts
	* @param {Boolean} Clear unread messages ?
	* @return {Promise} Should resolve Contacts object
	*/
	getContacts(clearUnread){
		return new Promise((resolve,reject)=>{
			let contacts = getContacts(clearUnread);
			return this.setState({contacts},()=>{return resolve(contacts);});
		})
	}

	/**
	* Get Solana private key from localStorage
	* @method getLocalAccount
	* @return {String} Return base64 Solana private key
	*/
	getLocalAccount(){
		let localAccount = window.localStorage.getItem("myAccount");
		return localAccount;
	}
	
	/**
	* Read the history of the chat and recreate conversations
	* @method getHistory
	* @return {null}
	*/
	getHistory(){
		let getSignatures = {
			"jsonrpc": "2.0",
			"id": 1,
			"method": "getConfirmedSignaturesForAddress2",
			"params": [
				defaultChannel,
			]
		}
		let getTransactions = {
			"jsonrpc": "2.0",
			"id": 1,
			"method": "getConfirmedTransaction",
			"params": [null,"base64"]
		}
		
		requestIdleCallback(()=>{
			return window.fetch("https://testnet.solana.com/", {
				"headers": {"content-type": "application/json"},
				"body":JSON.stringify(getSignatures),
				"method": "POST",
			})
			.then((r)=>{return r.json();})
			.then(async(resp)=>{
				if(resp && resp.result){
					for(let i = 0;i < resp.result.length;i++){
						getTransactions.params[0] = resp.result[i].signature;
						await sleep(50);
						console.log(i,resp.result.length,resp.result[i].signature);
						await window.fetch("https://testnet.solana.com/", {
							"headers": {"content-type": "application/json"},
							"body":JSON.stringify(getTransactions),
							"method": "POST",
						})
						.then((r)=>{return r.json();})
						.then((json)=>{
							if(json && json.result){
								let data = json.result.transaction[0];
								data = atob(data)
								return requestAnimationFrame(()=>{this.parseAccountData(data.slice(data.length-1028));})
							}
						})
						.catch(console.warn);
					}
				}
			})
		})
	}
	
	/**
	* Import user Solana private key and save to localStorage
	* @method importKey
	* @param {String} base64 Solana private key
	* @return {null}
	*/	
	async importKey(localAccount){
		let privateKey;
		if(localAccount){
			privateKey = localAccount;
		}
		else{
			privateKey = window.prompt("Import Private Key (base64 string/raw array)?");
		}
		if(!privateKey){return}
		privateKey = privateKey.trim();
		let bytes;
		if(privateKey.split(",").length > 62){
			privateKey = privateKey.slice(1,privateKey.length-1).split(",");
			bytes = new Uint8Array(privateKey);	
			privateKey = Buffer.from(privateKey).toString("base64");
		}
		else { 
			bytes = stringToBytes(privateKey);
		}
		let localPayerAccount = new Account(bytes);
		localPayerAccount.publicKey.toBase58 = function(){
			return bs58.encode(localPayerAccount.publicKey);
		}	
		//Set qr code
		let solanaQRURL = await this.generateQRCode(localPayerAccount.publicKey.toBase58());
		if(this.state.rsaKeyPair){
			solanaQRURL = await this.generateQRCode(localPayerAccount.publicKey.toBase58()+" "+ JSON.parse(window.localStorage.getItem("rsaKeys")).publicKey.n);
		}
		//
		console.log("local account imported:",localPayerAccount.publicKey.toBase58());
		let localPayerBalance = await connection.getBalance(localPayerAccount.publicKey);
		localPayerBalance = localPayerBalance / LAMPORTS_PER_SOL;
		this.setState({localPayerAccount,localPayerBalance,solanaQRURL});
		window.localStorage.setItem("myAccount",privateKey);
		return;		
	}
	
	/**
	* Import previously exported RSA keys
	* @method importRSAKeys_JSON
	* @return {null}
	*/	
	async importRSAKeys_JSON(){
		let input = document.createElement("input");
		input.setAttribute("type","file");
		input.setAttribute("accept","text/json");
		input.click();
		input.onchange = ()=>{
			let pageReader = new FileReader();
			pageReader.onload = async()=>{
				let keys_json = atob(pageReader.result.split("base64,")[1]);
				window.localStorage.setItem("rsaKeys",keys_json);
				let rsaKeyPair = await getRSAKeys();
				if(Object.keys(rsaKeyPair).length > 1){
					this.setState({rsaKeyPair});
				}
			};     
			pageReader.readAsDataURL(input.files[0]);	
		}
		return;
	}
		
	/**
	* Load a new program onto the network
	* @method loadProgram
	* @return {Promise} Should resolve to object {ProgramID,succ}
	*/
	async loadProgram(){
		let program = await fetch("/program.so").then(r=>r.blob());
		let buffer = await program.arrayBuffer();	
		let programAccount = new Account();
		let programId = programAccount.publicKey;
		let loaded = await BpfLoader.load(
			connection,
			this.state.localPayerAccount,
			programAccount,
			Buffer.from(buffer),
			BPF_LOADER_DEPRECATED_PROGRAM_ID,
		);
		let info = {succ:loaded,ProgramID:programId.toBase58()};
		console.log(info);
		if(info.succ){this.setState({latestProgram:info.ProgramID})};
		return info;
	}

	/**
	* Create an account controlled by a user prompted program
	* @method loadProgramControlledAccount
	* @return {Promise} Should resolve to base58 public key of the new Account
	*/	
	async loadProgramControlledAccount(){
		let chatRoomAccount = new Account();
		let chatRoomPubkey = chatRoomAccount.publicKey;
		let lamports = await connection.getMinimumBalanceForRentExemption(1028);
		console.log("Mininum lamports for rent free account:",lamports / LAMPORTS_PER_SOL);
		let ppid = window.prompt("Program Address")
		if(!ppid){return}
		let programId = new PublicKey(ppid.trim());
		let instruction = SystemProgram.createAccount({
			fromPubkey: this.state.localPayerAccount.publicKey,
			newAccountPubkey:chatRoomAccount.publicKey,
			lamports,
			space:1028,
			programId,
		});
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
			console.error(e);
			return null;
		}
		let publicKey = chatRoomPubkey.toBase58();
		this.setState({latestAccount:publicKey});
		console.log("Account:",publicKey,"created");
	    return publicKey ;
	}

	/**
	* Send message or update the characters user can input
	* @method messageKeyUp
	* @param {evt} KeyUp event
	* @return {Null}
	*/
	messageKeyUp(evt){
		this.updateCharacterCount();
		if(evt.keyCode === 13){
			evt.currentTarget.disabled = true;
			this.sendMessage();
		}
		return;
	}
	
	/**
	* Parse Solana Account data field
	* @method parseAccountData
	* @param {String} base64 Account data
	* @return {Null}
	*/
	async parseAccountData(data){
		try{
			data = atob(data);
			if(this.checkBroadcast(data)){return};
		}
		catch(e){
			console.log(e);
		}
		let packet = await this.decryptData(data);
		if(packet && (packet.t || packet.f)){
			let string = packet.t ? packet.t.trim() : "";
			//Verify Message
			let contacts = Object.keys(this.state.contacts);
			let solanaPublicKey;
			let sender;
			let uuid = Buffer.from(packet.u);
			let uuid_signature = Buffer.from(packet.us.split(","));
			let valid;
			for(let i = 0;i < contacts.length;i++){
				try{solanaPublicKey = new PublicKey( contacts[i] );}catch(e){continue;}
				valid = nacl.sign.detached.verify(uuid,uuid_signature,solanaPublicKey.toBuffer());
				if(valid){
					sender = contacts[i] ;
					this.badgeContact(sender);
					break;
				}
			}
			if(packet.t && !sender){
				sender = "unknown";
			}
			if(packet.t){
				this.appendChat(string,null,sender);
			}
			else if(packet.f){
				this.processFile(packet,sender);
			}
		}
		return;
	}

	/**
	* Process a file segment
	* @method processFile
	* @param {Object} Part of file packet {f,u,us,c,p}
	* @param {String} Solana base58 public key
	* @return {Null}
	*/
	processFile(packet,solanaPublicKey){
		console.log("Process File from:",solanaPublicKey);
		if(!solanaPublicKey){return console.log("Sender not in known contacts");}
		if(!FILES[solanaPublicKey]){
			FILES[solanaPublicKey] = {}
		}
		FILES[solanaPublicKey][packet.p] = packet
		let parts = Object.keys( FILES[solanaPublicKey] ).length;
		let rawFile = "";
		let blob;
		let objectURL;
		let fileType = {
			"jpg":"image/jpeg",
			"png":"image/png",
			"ogg":"audio/ogg"
		}
		//Check if we have the complete file
		if(packet.c === parts){
			//Assemble the file
			for(let i =0;i < parts;i++){
				rawFile += FILES[solanaPublicKey][i+1].f;
			}
			rawFile = Buffer.from(rawFile.split(","));
			blob = new Blob([ rawFile ], {type : fileType[  FILES[solanaPublicKey][1].e ]});
			objectURL = URL.createObjectURL(blob);
		}
		else{
			return;
		}
		if(FILES[solanaPublicKey][1].e !== "ogg")	{	
			this.appendImage(objectURL,solanaPublicKey);
		}
		else{
			this.appendAudio(objectURL,solanaPublicKey);
		}
		delete FILES[solanaPublicKey];
		return;
	}	
	
	
	/**
	* Prompt user to add a new contact
	* @method promptContactAddition
	* @param {String} Solana public key
	* @param {String} RSA public key
	* @return {Null}
	*/	
	promptContactAddition(solanaPublicKey,rsaPublicKey){
		let contactsList = Object.keys(this.state.contacts);
		let contacts = this.state.contacts;
		if( contactsList.indexOf(solanaPublicKey) > -1 ){
			console.log("Valid Broadcast from:",solanaPublicKey);
			if(window.confirm("Update contact: " +solanaPublicKey+ " chat public key?")){
				contacts[solanaPublicKey].chatPublicKey = rsaPublicKey;
				updateContacts(contacts);
				this.getContacts();
			}
		}
		else if( this.state.payerAccount && (solanaPublicKey !== this.state.payerAccount.toBase58()) ){
			if(window.confirm("Add new contact:"+ solanaPublicKey)){
				this.addContact(solanaPublicKey,rsaPublicKey);
				this.getContacts();
			}
		}
		else if( this.state.localPayerAccount && (solanaPublicKey !== this.state.localPayerAccount.publicKey.toBase58()) ){
			if(window.confirm("Add new contact:"+ solanaPublicKey)){
				this.addContact(solanaPublicKey,rsaPublicKey);
				this.getContacts();
			}
		}
		else if( !this.state.payerAccount && !this.state.localPayerAccount){
			if(window.confirm("Add new contact:"+ solanaPublicKey)){
				this.addContact(solanaPublicKey,rsaPublicKey);
				this.getContacts();
			}
		}
		return;
	}	
	
	/**
	* Remove contact from contacts list on user confirmation
	* @method removeContact
	* @param {String} Solana public key
	* @return {null}
	*/	
	removeContact(solanaPublicKey){
		if(window.confirm("Remove Contact:"+solanaPublicKey+"?")){
			let contacts = this.state.contacts;
			delete contacts[solanaPublicKey];
			updateContacts(contacts);
			this.setState({contacts});
		}	
	}	
	
	/**
	* Remove imported Solana Account
	* @method removeImportedAccount
	* @return {Null}
	*/	
	removeImportedAccount(){
		if(!window.confirm("Remove Imported Solana Account?")){return;}
		window.localStorage.removeItem("myAccount");
		this.setState({localPayerAccount:false,localPayerBalance:0});
		return;
	}
	
	/**
	* Delete RSA keys from localStorage upon user confirmation
	* @method removeRSAKeys
	* @return {Null}
	*/	
	removeRSAKeys(){
		if(!window.confirm("Clear local chat account keys?")){return;}
		window.localStorage.removeItem("rsaKeys");
		this.setState({rsaKeyPair:false});
		return;
	}


	/**
	* Save message history in localstorage
	* @method saveMessageHistory
	* @return {Null}
	*/	
	saveMessageHistory(){
		if(this.state.autoSaveHistory){
			window.localStorage.setItem("message_history",JSON.stringify(this.state.MESSAGE_HISTORY));
		}
		return;
	}

	/**
	* Send encrypted file to the network
	* @method sendFile
	* @param {Array} Array of encrypted Uint8Arrays
	* @return {Promise} Should resolve to an array of confirmed transactions object [ {context:{slot},value:{err}}, ... ]
	*/	
	async sendFile(encryptedBytesArray){	
		if(!this.state.connection && !this.state.localPayerAccount){
			await this.connectWallet();
		} 
		if(!this.state.ws){
			return notify("Please subscribe to a chat first");
		}
		return this.constructAndSendFile(encryptedBytesArray)
		.then((transactions)=>{
			console.log("transaction",transactions);
			return transactions;
		})
		.catch((e)=>{
			notify("Error sending file");
			console.warn("Error sending file:",e);
			this.setState({loadingValue:0});
		});
	}

	/**
	* Send encrypted message to the network
	* @method sendMessage
	* @return {null}
	*/	
	async sendMessage(){	
		let message = document.getElementById("newMessage");	
		this.setState({loading:true});
		if(!this.state.connection && !this.state.localPayerAccount){
			message.disabled = false;
			await this.connectWallet();
		} 
		if(!this.state.ws){
			message.disabled = false;
			return notify("Please subscribe to a chat first");
		}
		this.constructAndSendTransaction(message.value)
		.then((transaction)=>{
			console.log("transaction",transaction);
			if(transaction && transaction.context){
				let msg = document.getElementById(transaction.context.slot);
				if(msg){
					msg.setAttribute("class","msgSelf");
				}
				else{
					console.log("Unable to confirm message");
				}
			}
		})
		.catch((e)=>{
			console.warn("Error sending message:",e);			
			notify("Error sending message")
		})
		.finally(()=>{
			this.setState({loading:false});
			if(message.disabled){message.disabled = false;}
			this.updateCharacterCount();
		});
	}
	
	/**
	* Set the 'currentContact' state
	* @method setCurrentContact (contact object)
	* @return {Null}
	*/	
	setCurrentContact(contact){
		if(!contact){return;}
		let contacts = this.state.contacts;
		if(contacts[contact.publicKey]){
			contacts[contact.publicKey].message = 0;
			updateContacts(contacts);
			this.setState({currentContact:contact,contacts});
		}
		return;
	}
	
	/**
	* Show form to add a new contact
	* @method showContactForm
	* @return {Null}
	*/	
	showContactForm(){
		this.setState({showContactForm:true});
		return;
	}
	
	/**
	* Connect to rpc websocket endpoint and monitor Account data
	* @method subscribe
   *  @param {Object} Contact object
	* @return {Null}
	*/	
	subscribe(contacts){
		const attachChannels = (_ws)=>{
			let uniqueChannels = this.state.connected.slice(0);
			let message = {
				"jsonrpc":"2.0", 
				"id":0, 
				"method":"accountSubscribe",
				"params":[]
			}
			if(Object.keys(contacts).length < 1){
				//Auto subscribe to base channel
				uniqueChannels.push(defaultChannel);
				message.id = uniqueChannels.length;
				message.params = [defaultChannel,{"encoding":"jsonParsed"} ]; 
				_ws.send(JSON.stringify(message));
			}
			else{
				Object.keys(contacts).map(async(key)=>{
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
			console.log("Subscribed to Accounts::",uniqueChannels);		
			return;
		}	
		const onOpen = (obj)=>{
			console.log("Websocket open",obj);
			let ws = obj.target;
			this.setState({ws},this.getBlockHash);
			let heartbeat = setInterval( ()=>ws.send(JSON.stringify({"jsonrpc":"2.0","method":"ping","params":null})),4998);
			Intervals.push(heartbeat);
			attachChannels(ws);
		}
		const onMessage = (evt)=> {
			try{
				console.log("socket Message:",evt.data);
				this.writeLog(evt.data);
				let account = JSON.parse(evt.data);
				if(account.params){
					let accountData = account.params.result.value.data;
					this.parseAccountData(accountData[0]);
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
		websocket.onerror = onError;
		return;	
	}	
	
	/**
	* Toggle between settings and viewing contacts
	* @method showSolanaQR
	* @return {Null}
	*/			
	async toggleShowSolanaQR(){
		this.setState({showSolanaQR:!this.state.showSolanaQR});
		return;
	}		
	
	/**
	* Toggle between settings and viewing contacts
	* @method toggleContactsView
	* @return {Null}
	*/			
	toggleContactsView(){
		this.setState({viewContacts:!this.state.viewContacts});
		return;
	}	
		
	/**
	* Add log message to text element
	* @method writeLog
	* @param {String} Message to log
	* @return {Null}
	*/	
	writeLog(log){
		if(document.getElementById("logs")){
			document.getElementById("logs").value = log;
		}
		return;
	}
	
	/**
	* Update the auto save message history
	* @method updateAutoSaveHistory
	* @return {Null}
	*/	
	updateAutoSaveHistory(){
		window.localStorage.setItem("autoSaveHistory",!this.state.autoSaveHistory);
		this.setState({autoSaveHistory:!this.state.autoSaveHistory});
		return;		
	}
	
	/**
	* Update the style of the avatar
	* @method updateAvatarStyle
	* @return {Null}
	*/	
	updateAvatarStyle(){
		let newStyle = ""
		if(this.state.avatarStyle === "&set=set4"){ newStyle = "";}
		else{newStyle = "&set=set4";}
		window.localStorage.setItem("avatarStyle",newStyle);
		this.setState({avatarStyle:newStyle});
		return;
	}		
	
	/**
	* Update the # of characters the user can send
	* @method updateCharacterCount
	* @return {Null}
	*/
	updateCharacterCount(){
		let message = document.getElementById("newMessage");
		let count = message.value ? message.value.length : 0;
		let remaining = 880 -264 - count;
		if (remaining < 0){
			message.value = message.value.slice(0,880-264);
			remaining = 0;
		}
		this.setState({characterCount:remaining});
		return;
	}
	
	/**
   * Clear the user input form
   * @method updateInputBox
   * @param {String} User text message
   * @param {String} Transaction ID
   * @return {Null}
   */	
	updateInputBox(message,txid){
		this.appendChat(message,txid,this.state.currentContact.publicKey);
		let input = document.getElementById("newMessage");
		input.disabled = false;
		input.value = "";
		this.updateCharacterCount();
	}	
	
	/**
	* Update the view style of the site
	* @method updateViewStyle
	* @return {Null}
	*/	
	updateViewStyle(){
		let newStyle = ""
		if(this.state.viewStyle === "mobile"){ newStyle = "desktop";}
		else{newStyle = "mobile";}
		window.localStorage.setItem("viewStyle",newStyle);
		this.setState({viewStyle:newStyle});
		return;
	}		
	
	/**
   * Upload audio file to network
   * @method updateInputBox
   * @param {Blob} Audio blob
   * @param {String} File name
   * @return {Null}
   */	
	async uploadAudioFile(blob,fileName){
		let arrayBuffer = await blob.arrayBuffer();
		let encryptedBytesArray = await this.encryptFile(arrayBuffer,fileName);
		if(encryptedBytesArray){
			this.sendFile(encryptedBytesArray).then(()=>{
				let objectURL = URL.createObjectURL(blob);
				this.appendAudio(objectURL,this.state.currentContact.publicKey);
			});
		}			
	}	
	
	/**
	* Upload and send a local image file to peer
	* @method uploadImagFile
	* @param {Event} 
	* @return {null} 
	*/
	uploadImageFile(){
		let input = document.createElement("input");
		input.setAttribute("type","file");
		input.setAttribute("accept","image/png, image/jpeg");
		input.click();
		input.onchange = ()=>{
			let imageSRC = null;
			let pageReader = new FileReader();
			let bufferReader = new FileReader();		
			pageReader.onload = function(){
				let dataURL = pageReader.result;
				imageSRC = dataURL;
			}; 
			bufferReader.onload = async ()=>{
				let encryptedBytesArray = await this.encryptFile(bufferReader.result,input.files[0].name);
				if(encryptedBytesArray){
					this.sendFile(encryptedBytesArray).then(()=>{
						this.appendImage(imageSRC,this.state.currentContact.publicKey);
					});
				}
			};      
			pageReader.readAsDataURL(input.files[0]);	
			bufferReader.readAsArrayBuffer(input.files[0]);
		}
		return;
	}		
	
	/**
   * Unsubscribe from updates to a Solana Account
   * @method unsubscribe
   * @param {Number} ID of Account to unsubscribe. Default 1
   * @return {Null}
   */
	unsubscribe(id=1){
		let rpcMessage = {"jsonrpc":"2.0", "id":id, "method":"accountUnsubscribe", "params":[0]}
		this.state.ws.send(JSON.stringify(rpcMessage));
		return;
	}	
		
	renderDesktop(){
		return(
		<div className="App">
		{ this.state.loading ? <ProgressBar id="progressBar" striped animated now={this.state.loadingValue} label={this.state.loadingMessage}/> : null }
		<Row className="grid topBar">
			<Col sm={3} md={2} className="connectButtons">
				{
					(!this.state.payerAccount && !this.state.localPayerAccount) ?
					<ButtonGroup>
						<Button size="sm" onClick={this.connectWallet}>connect wallet</Button> 
						<Button variant="danger" size="sm" onClick={()=>{this.importKey()}}> import key </Button>
					</ButtonGroup>
					:null
				}
				{ 
					this.state.payerAccount? 
					<div id="solletAccount">
						<p> 
							<img alt="accountImg" className="avatar" src={"https://robohash.org/"+this.state.payerAccount.toBase58()+"?size=128x128"} />
						</p>
					</div>
					:null
				}
				{
					this.state.localPayerAccount ?
					<div id="solletAccount">
						<p> 
							<img alt="accountImg" className="avatar" src={"https://robohash.org/"+this.state.localPayerAccount.publicKey.toBase58()+"?size=128x128"} />
						</p>				
					</div>
					:null
				}
				<Button size="sm" variant="default" onClick={this.toggleContactsView}>{this.state.viewContacts ?  "⚙️ settings":"🧑‍ contacts"}</Button>
			</Col>
			<Col sm={6} md={8}>
			<div>
				{ 
					this.state.payerAccount? 
					<div id="solletAccount">
						<p> 
							<b>Address:</b>{this.state.payerAccount.toBase58()}
							<br/><b>SOL</b>:{this.state.payerAccountBalance} 
							<br/>{this.state.providerUrl} 
						</p>
					</div>
					:null
				}
				{
					this.state.localPayerAccount ?
					<div id="importedAccount">
						<p> 
							<b>Address:</b>{this.state.localPayerAccount.publicKey.toBase58()}  
							<br/><b>SOL</b>:{this.state.localPayerBalance}
						</p>				
					</div>
					:null
				}
				{
				  (this.state.rsaKeyPair && this.state.rsaKeyPair.publicKey && ( this.state.localPayerAccount || this.state.payerAccount ) ) ? 
					<Button size="sm" onClick={this.broadcastPresence}>Broadcast Presence</Button>
					:null
				}
				{
				  (!this.state.rsaKeyPair && ( this.state.localPayerAccount || this.state.payerAccount ) ) ? 
					<Button size="sm" onClick={this.createRSAKeyPair}>Create RSA key pair</Button> 
					:null
				}								
			</div>
			</Col>
			<Col sm={3} md={2}>
				{
					this.state.currentContact.publicKey ? 
					<p>
						{this.state.currentContact.publicKey.slice(0,5)+"..."} <img alt="contactImg" src={"https://robohash.org/"+this.state.currentContact.publicKey+"?size=100x100"} /> 
					</p>
					
				: null 
				}
			</Col>
		</Row>
		<Row>
			<Col sm={3} md={2} className="contactColHolder">
			{
				this.state.viewContacts ?
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
				:
				<Settings 
					currentContact={this.state.currentContact}
					localPayerAccount={this.state.localPayerAccount}
					removeImportedAccount={this.removeImportedAccount}
					removeRSAKeys={this.removeRSAKeys}
					viewStyle={this.state.viewStyle}
					updateViewStyle={this.updateViewStyle}
				/>
			}
			</Col>
			<Col sm={8} md={10} id="col-sm-9">
				<Row> 
					<div id="chat"> 						
						{
							this.state.MESSAGE_HISTORY[this.state.currentContact.publicKey] && this.state.MESSAGE_HISTORY[this.state.currentContact.publicKey].map((info,ind)=>(
								<div key={ind} className={info.txid ? "msgSelf" : "msgContact"}>
									<p className="fromStamp"> {timeAgo.format(new Date(info.time),'round')} </p>
									
									{ info.message ? <p className="fromMessage">{info.message.trim()}</p> : null }
									
									{ info.img_src ? <img alt="img" src={info.img_src} /> : null }
									
									{ info.audio_src ? <audio alt="img" src={info.audio_src} controls /> : null }
									
									{
										info.txid ? 
										<div><br/> <a href={getTransactionURL(info.txid)} target='_blank' rel="noopener noreferrer"> {info.txid.slice(0,10)} </a></div>
										:null
									}
								</div>
							))
						}	
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
						  <Button onClick={this.uploadImageFile}>Send Image</Button>					  
						  <Recorder uploadAudioFile={this.uploadAudioFile}/>
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
						<p> 
							LocalAccount: <b>{this.state.localPayerAccount.publicKey.toBase58()}</b>  
							<br/>balance:<b>{this.state.localPayerBalance}</b>
							<br/> Program: {this.state.latestProgram ? this.state.latestProgram : null}
							<br/> Account: {this.state.latestAccount ? this.state.latestAccount : null}		
						</p>				
						<ButtonGroup> 
							<Button variant="warning" onClick={this.loadProgram}>Deploy Chat</Button>
							<Button variant="danger" onClick={()=>this.importKey()}>Import New Private Key</Button>
							<Button onClick={this.loadProgramControlledAccount}> Launch a new room </Button>
						</ButtonGroup>
					</div>
					:<Button variant="danger" onClick={()=>{this.importKey()}}>Import Private Key </Button>
				}
				</div>
			</Col>
		</Row>
		</div>);
	}

	render(){
		if(this.state.viewStyle !== "mobile"){
			return this.renderDesktop();
		}
		return this.renderDesktop();
	}
}


function ListView(props){
	return(<div>
		<ListGroup className="contactCol">
			{
				Object.keys(props.contacts).length > 0 && Object.keys(props.contacts).map((item,ind)=>(
					<ListGroup.Item key={ind} onClick={()=>{props.setCurrentContact(props.contacts[item])}} style={{background: props.currentContact.publicKey === props.contacts[item].publicKey ? "#d6ebce96" : "" }}>
						<Row>
							<Col sm={2} md={3} lg={2}>							
								<img alt="contactImg" className="contactImg" src={"https://robohash.org/"+props.contacts[item].publicKey+"?size=256x256"} />
								<br/>
								<Button variant="danger" size="sm" onClick={()=>{props.removeContact(item); }}> remove </Button>
							</Col>
							<Col sm={10} md={9} lg={10}>
								<p className="contactTime">
									{timeAgo.format(new Date(props.contacts[item].time),'round')}
								</p>
																{
									props.contacts[item].message > 0 ?   <Badge variant="info"> {props.contacts[item].message} </Badge>:null
								}
								<p className="contactInfo">
									{props.contacts[item].publicKey}
									<br/>
									{props.contacts[item].chatPublicKey}
								</p>
							</Col>
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
		
function Settings(props){
	return(<div className="settingsPanel">
	<ul>
			{
				props.currentContact.channel ?
				<li>
					channel: <a rel="noopener noreferrer" href={'https://explorer.solana.com/address/'+props.currentContact.channel+'?cluster=testnet'} target="_blank">{props.currentContact.channel}</a>   
					<br/>newtwork:  <a rel="noopener noreferrer" href={'https://explorer.solana.com/address/'+props.currentContact.programId+'?cluster=testnet'} target="_blank">{props.currentContact.programId} </a>
				</li>
				:null
			}
		<li>
			<Button size="sm" variant="danger" onClick={props.removeRSAKeys}>Dispose Chat Keys</Button>
		</li>
		{
			props.localPayerAccount ?
			<li>
			<br/>
			 <Button size="sm" variant="danger" onClick={props.removeImportedAccount}> Remove Imported Account</Button>
			</li>
			  : null
		}
	</ul>
	</div>)
}		
		
export default App;
