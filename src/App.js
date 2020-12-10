import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
//ETC
import QRCode from 'qrcode'
// Time Ago English
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
//Crypto
import nacl from 'tweetnacl';
//Bootstrap
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'

//Material UI Bootstrap imports
import Badge from '@material-ui/core/Badge';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CardMedia from '@material-ui/core/CardMedia';

import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Divider from '@material-ui/core/Divider';

import InputBase from '@material-ui/core/InputBase';

import LinearProgress from '@material-ui/core/LinearProgress';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';

import MuiAlert from '@material-ui/lab/Alert';

import Paper from '@material-ui/core/Paper';

import Snackbar from '@material-ui/core/Snackbar';
import Switch from '@material-ui/core/Switch';

import TextField from '@material-ui/core/TextField';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';

//Icons
import CancelIcon from '@material-ui/icons/Cancel';
import ChatIcon from '@material-ui/icons/Chat';
import DeleteIcon from '@material-ui/icons/Delete';
import FastForwardIcon from '@material-ui/icons/FastForward';
import FastRewindIcon from '@material-ui/icons/FastRewind';
import GamesIcon from '@material-ui/icons/Games';
import MailIcon from '@material-ui/icons/Mail';
import NotesIcon from '@material-ui/icons/Notes';
import PhotoCameraIcon from '@material-ui/icons/PhotoCamera';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import RecordVoiceOverIcon from '@material-ui/icons/RecordVoiceOver';
import SettingsIcon from '@material-ui/icons/Settings';
import SupervisorAccountIcon from '@material-ui/icons/SupervisorAccount';

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
import { ScanQR } from './Components/ScanQR';
import { Stage } from './Components/Stage';
import { SecureWallet } from './Components/SecureWallet';


var Intervals = []
var defaultProgram;
var defaultChannel;

var GAME_ID = "";
var GAME_ACCOUNT = "";  

var FILES = {};
var AccountDataQue = [];

TimeAgo.addLocale(en)
// Date formatter.
const timeAgo = new TimeAgo('en-US')

if(window.location.href.search("localhost") > -1){	
	console.log("Running Local");
}
else{	
	console.log("Running Production")	
	console.log = function(){}
	console.warn = function(){}
}
const Sol_Talk = {
	"api.mainnet-beta":{defaultProgram:"8pXDrcpHJuYk4niJMRTiYv5dVbCZN15xTzFcAnqHTvsx",defaultChannel:"FjR5e2EFZ1dFEQ74JtFNvAgXhXLueCg6J2QEQsgwvbSg"},
	"testnet":{defaultProgram:"JB2LCd9oV7xNemBSV8dJu6gkrpWQSrDPcfHUQAQnXRZu",defaultChannel:"BoSJNDkt37kxQthSgvMqCER1dMzyqEUS34Kkp2YazEiq"}
}

const Sol_Survivor= {
	"api.mainnet-beta":{id:"CBGDAKpEaCSJWcnfE2kw3XkWKaeUEUpwZt63L7pMfHJ4",account:"9sBJoSrsJhHmLqXcPV8J7haaWQAvJuSHVSdd3CJcJ14M"},
	"testnet":{id:"D6sPuWypcX7MiQsDesUKtMUvBznknJd3f7bBh6qaqG3p",account:"24zUvBhv981ur8kedCbUimhj8araq73RDMBLU49ENxtH"}
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
async function establishConnection(network): Promise<void> {
	let urlRoot;
	if(network === "testnet"){
		urlRoot = "https://testnet.solana.com/";
	}
	else if(network === "api.mainnet-beta"){
		//urlRoot = "https://api.mainnet-beta.solana.com/";
		urlRoot = "https://solana-api.projectserum.com";
	}	
	else if(network === "localhost"){
		urlRoot = "http://localhost:8899";
	}
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
* Checkpoint current position in stream
* @method checkpoint
* @param {Number} Slot number
* @return {Number} Return recent slot number
*/
function checkpoint(slot){
	if(Number(slot)){
		console.log("check pointing",slot);
		window.localStorage.setItem("checkpoint",slot);
	}
	let currentSlot = window.localStorage.getItem("checkpoint") ? Number(window.localStorage.getItem("checkpoint")) : 0;
	return currentSlot;
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
* Create a contact object
* @method formatContact
* @param {String} Solana public key
* @param {String} RSA public key
* @return {Object} Contact object
*/
function formatContact(solanaPublicKey,rsaPublicKey){
	let obj = {
		publicKey:solanaPublicKey,
		channel:defaultChannel,
		chatPublicKey:rsaPublicKey,
		programId:defaultProgram,
		message:0,
		time:new Date().getTime()
	}
	return obj;
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
* Save transaction in local storage
* @method saveTransaction
* @param {String} TransactionId
* @param {String} Network
* @return {Promise} 
*/
function saveTransaction(txid,network,type){
	return new Promise((resolve,reject)=>{
		let txhistory = localStorage.getItem("transactionHistory") ? JSON.parse(localStorage.getItem("transactionHistory")) : [];
		txhistory.push({ 
			link:`https://explorer.solana.com/tx/${txid}?cluster=${network}`,
			date: new Date().getTime(),
			txid,
			type
		})
		localStorage.setItem("transactionHistory",JSON.stringify(txhistory),resolve);
		return;
	});
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
			autoSaveHistory:window.localStorage.getItem("autoSaveHistory") ? JSON.parse(window.localStorage.getItem("autoSaveHistory")) : "",
			autoSign:window.localStorage.getItem("autoSign") ? JSON.parse(window.localStorage.getItem("autoSign")) : "",
			avatarStyle: window.localStorage.getItem("avatarStyle") ? window.localStorage.getItem("avatarStyle") : "",
			characterCount:880-264,
			currentContact:{},
			contacts:[],
			connected:[],
			defaultNetwork:"api.mainnet-beta",
			GAME_ACCOUNT,
			GAME_ID,			
			loading:false,
			loadingMessage:"",
			loadingValue:0,
			localPayerAccount:false,
			localPayerBalance:0,
			MESSAGE_HISTORY:window.localStorage.getItem("message_history") ? JSON.parse(window.localStorage.getItem("message_history")) : {},
			notificationMessage:"",
			notificationOpen:false,
			notificationSeverity:"info",
			payerAccount:false,
			payerAccountBalance:0,
			playGame:false,
			potentialContacts:[],
			providerUrl:"",
			recentContacts:[],
			rsaKeyPair:false,
			showBalanceChange:false,
			showSolanaQR:false,
			showContactForm:false,
			solanaQRURL:"",
			syncingHistory:false,
			survivorHelpOpen:false,
			transactionSignature:false,
			wallet:false,
			ws:null,
			viewContacts:false,
			viewSettings:false,
			viewTransactions:false,
			viewChat:true,
			viewStyle: window.localStorage.getItem("viewStyle") ? window.localStorage.getItem("viewStyle") : "",			
		}
		
		this.addContact = this.addContact.bind(this);
		this.appendChat = this.appendChat.bind(this);
		this.appendAudio = this.appendAudio.bind(this);
		this.appendImage = this.appendImage.bind(this);

		this.broadcastPresence = this.broadcastPresence.bind(this);
		
		this.cancelContactForm = this.cancelContactForm.bind(this);
		this.changeNetwork = this.changeNetwork.bind(this);
		this.checkBroadcast = this.checkBroadcast.bind(this);
		this.closeNotification = this.closeNotification.bind(this);		
		this.connectWallet = this.connectWallet.bind(this);		
		this.constructAndSendTransaction = this.constructAndSendTransaction.bind(this);
		this.copySolanaAddress = this.copySolanaAddress.bind(this);
		this.createRSAKeyPair = this.createRSAKeyPair.bind(this);
		this.createSolanaAccount = this.createSolanaAccount.bind(this);
		
		this.decryptData = this.decryptData.bind(this);
		this.deleteMessageHistory = this.deleteMessageHistory.bind(this);
		this.disconnectWebSocket = this.disconnectWebSocket.bind(this);
		
		this.encryptFile = this.encryptFile.bind(this);
		this.encryptMessage = this.encryptMessage.bind(this);
		this.exportContacts = this.exportContacts.bind(this);
		this.exportPrivateKey = this.exportPrivateKey.bind(this);
		this.exportRSAKeys = this.exportRSAKeys.bind(this);
		
		this.generateQRCode = this.generateQRCode.bind(this);
		this.getBalance = this.getBalance.bind(this);
		this.getContacts = this.getContacts.bind(this);
		this.getHistory = this.getHistory.bind(this);
		this.getLocalAccount = this.getLocalAccount.bind(this);
		
		this.importKey = this.importKey.bind(this);
		this.importRSAKeys_JSON = this.importRSAKeys_JSON.bind(this);
		
		this.loadProgram = this.loadProgram.bind(this);
		this.loadProgramControlledAccount = this.loadProgramControlledAccount.bind(this);
		this.localSign = this.localSign.bind(this);

		this.parseAccountData = this.parseAccountData.bind(this);
		this.processFile = this.processFile.bind(this);
		this.processQue = this.processQue.bind(this);
		this.promptContactAddition = this.promptContactAddition.bind(this);
		
		this.notify = this.notify.bind(this);
		
		this.messageKeyDown = this.messageKeyDown.bind(this);
		
		this.removeContact = this.removeContact.bind(this);
		this.removeImportedAccount = this.removeImportedAccount.bind(this);		
		this.removeRSAKeys = this.removeRSAKeys.bind(this);
		this.renderDesktop = this.renderDesktop.bind(this);

		this.saveMessageHistory = this.saveMessageHistory.bind(this);
		this.saveNewContact = this.saveNewContact.bind(this);	
		this.scrollToBottom = 	this.scrollToBottom.bind(this);
		this.sendFile = this.sendFile.bind(this);
		this.sendMessage = this.sendMessage.bind(this);
		this.sendSol = this.sendSol.bind(this);
		this.setCurrentContact = this.setCurrentContact.bind(this);
		this.setLoading = this.setLoading.bind(this);
		this.showContactForm = this.showContactForm.bind(this);
		this.subscribe = this.subscribe.bind(this);
		
		this.toggleContactsView = this.toggleContactsView.bind(this);
		this.toggleChatView = this.toggleChatView.bind(this);
		this.togglePlayGame = this.togglePlayGame.bind(this);
		this.toggleSettingsView = this.toggleSettingsView.bind(this);
		this.toggleShowSolanaQR = this.toggleShowSolanaQR.bind(this);
		this.toggleSurvivorHelpOpen = this.toggleSurvivorHelpOpen.bind(this);
		
		this.toggleTransactionView = this.toggleTransactionView.bind(this);

		this.writeLog= this.writeLog.bind(this);
		
		this.uploadAudioFile = this.uploadAudioFile.bind(this);	
		this.updateAvatarStyle = this.updateAvatarStyle.bind(this);	
		this.updateAutoSaveHistory = this.updateAutoSaveHistory.bind(this);
		this.updateAutoSign = this.updateAutoSign.bind(this);		
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
			if(solanaPublicKey && solanaPublicKey.value.length === 44){
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
		this.setState({MESSAGE_HISTORY:message_history},()=>{
			this.saveMessageHistory();
			this.scrollToBottom().catch(console.warn);
		});
		let input = document.getElementById("newMessage");
		if(input){input.focus();}
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
			transaction.signature =  await this.localSign(Buffer.from(transaction.serializeMessage()),this.state.localPayerAccount);
			if(!transaction.signature){
				return this.notify("Signing Error","error");
			}
		}
		let presence = transaction.message+" "+transaction.signature.join(",");
		setTimeout(this.getBalance,2000);
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
	* Change the default Solana network to connect to
	* @method changeNetwork
	* @param {String} Network to join
	* @return {Null}
	*/	
	changeNetwork(defaultNetwork){
		connection = null;
		if(this.state.ws){
			this.state.ws.close();
		}
		//Update sol-survivor addresses
		GAME_ACCOUNT = Sol_Survivor[defaultNetwork].account;
		GAME_ID = Sol_Survivor[defaultNetwork].id;
		//
		this.setState({
			defaultNetwork,
			GAME_ACCOUNT,
			GAME_ID,
			ws:false,
			connection:false,
			providerUrl:"https://www.sollet.io/#origin="+window.location.origin+"&network="+defaultNetwork.replace("api.mainnet-beta","mainnet")
		},async()=>{
			await establishConnection(defaultNetwork);
			let contacts = await this.getContacts(true);
			this.subscribe(contacts,defaultNetwork);
			if(this.state.payerAccount){
				await this.connectWallet();
			}
			else if(this.state.localPayerAccount){
				await setTimeout(this.getBalance,1000);
			}
			//Update sol-survior information
			let bc = new BroadcastChannel('game_channel');
			bc.postMessage(null);
		});
		return;
	}
	
	/**
	* Check if message is a valid broadcast message
	* @method checkBroadcast
	* @param {String} Message
	* @param {Boolean} Is a replay message 
	* @return {Boolean}
	*/	
	checkBroadcast(message,replay=false){
		let isBroadcast = false;
		try{
			message = message.split(" ");
			let valid;
			let str = message[0] + " " + message[1];
			let sig = Buffer.from(message[2].split(","));
			valid = nacl.sign.detached.verify(Buffer.from(str),sig,new PublicKey(message[0]).toBuffer());
			isBroadcast = valid;
			if(valid && !replay){
				this.promptContactAddition(message[0],message[1]);
			}
		}
		catch(e){
			console.log(e);
		}
		return isBroadcast;
	}
	
	/**
	* Close the notification 
	* @method closeNotification
	* @return {null}
	*/		
	closeNotification(){
		this.setState({notificationOpen:false});
		return;
	}		
	
	/**
	* Standard react component
	*/		
	async componentDidMount(){	
		GAME_ACCOUNT = Sol_Survivor[this.state.defaultNetwork].account;
		GAME_ID = Sol_Survivor[this.state.defaultNetwork].id;
		defaultProgram = Sol_Talk[this.state.defaultNetwork].defaultProgram;
		defaultChannel = Sol_Talk[this.state.defaultNetwork].defaultChannel;
		this.setState({
			providerUrl: "https://www.sollet.io/#origin="+window.location.origin+"&network="+this.state.defaultNetwork,
			GAME_ACCOUNT,
			GAME_ID,
		});
		establishConnection(this.state.defaultNetwork).catch(console.warn);;	
		let contacts = await this.getContacts(true);
		this.subscribe(contacts,this.state.defaultNetwork);
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
		if(window.location.pathname === "/sol-survivor"){
			this.togglePlayGame();
		}
		//sync previous messages
		this.setState({syncingHistory:true});
		this.getHistory()
		.catch(console.warn)
		.finally(this.processQue);
	}
	
	/**
	* Connect to Solana wallet using sollet wallet adapter
	* @method connectWallet
	* @return {Promise} Resolve to boolean
	*/	
	connectWallet(){
		return new Promise((resolve,reject)=>{
			let connection = new Connection(clusterApiUrl(this.state.defaultNetwork.replace("api.mainnet-beta","mainnet-beta")));			
			let wallet = new Wallet(this.state.providerUrl);
			wallet.on('connect', async (publicKey) => {
				console.warn('Connected to sollet.io:' + publicKey.toBase58(),"on",this.state.defaultNetwork);
				//Set qr code
				let solanaQRURL = await this.generateQRCode(publicKey.toBase58());
				if(this.state.rsaKeyPair && this.state.rsaKeyPair.publicKey && this.state.rsaKeyPair.publicKey.n){
					solanaQRURL += " "+this.state.rsaKeyPair.publicKey.n;
				}
				//
				return this.setState({wallet,connection,payerAccount:publicKey,solanaQRURL},()=>{
					this.getBalance().catch(console.warn);
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
		if(!encryptedBytesArray || encryptedBytesArray.length < 1){return this.notify("Unable to send blank file","error");}
		let programId = this.state.currentContact.programId ? this.state.currentContact.programId : defaultProgram ;
		programId = new PublicKey(programId);
		let transactions = [];
		this.setState({loading:true,loadingMessage:"Sending File"});
		let txid;
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
				txid = await this.state.connection.sendRawTransaction(signed.serialize());
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
				let { blockhash } = await connection.getRecentBlockhash();			
				let _transaction =  new Transaction({recentBlockhash:blockhash}).add(instruction);	
				_transaction.feePayer = this.state.localPayerAccount.publicKey;
				let signature = await this.localSign(Buffer.from(_transaction.serializeMessage()),this.state.localPayerAccount,_transaction);
				if(!signature){
					this.setState({loading:false});
					return this.notify("Signing Error","error");
				}
				_transaction.addSignature(this.state.localPayerAccount.publicKey,signature);
				txid = await sendAndConfirmTransaction(
					'',
					connection,
					_transaction,
					this.state.localPayerAccount,
				);
				transactions.push(txid);
				saveTransaction(txid,this.state.defaultNetwork,"sendFile").catch(console.warn);
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
		if(!message || message.length < 1){return this.notify("Unable to send blank message","error");}
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
					{pubkey: this.state.currentContact.channel ? new PublicKey(this.state.currentContact.channel) : new PublicKey(defaultChannel), isSigner: false, isWritable: true},
					{pubkey: this.state.localPayerAccount.publicKey, isSigner: true, isWritable: false}
				],
				programId,
				data: buffer
			});
			let { blockhash } = await connection.getRecentBlockhash();			
			let _transaction =  new Transaction({recentBlockhash:blockhash}).add(instruction);	
			_transaction.feePayer = this.state.localPayerAccount.publicKey;
			let signature = await this.localSign(Buffer.from(_transaction.serializeMessage()),this.state.localPayerAccount,_transaction);
			if(!signature){
				this.setState({loading:false});
				return this.notify("Signing Error","error");
			}
			_transaction.addSignature(this.state.localPayerAccount.publicKey,signature);
			txid = await sendAndConfirmTransaction(
				'',
				connection,
				_transaction,
				this.state.localPayerAccount,
			);
			if(!isBroadcast){ this.updateInputBox(message,txid);}
		}	
		saveTransaction(txid,this.state.defaultNetwork,"sendMessage").catch(console.warn);
		return txid;
	}	
	
	/**
	* Copy Solana Address to clipboard
	* @method copySolanaAddress
	* @return {null}
	*/	
	async copySolanaAddress(){
		let account = false;
		if(this.state.localPayerAccount){
			account = this.state.localPayerAccount.publicKey.toBase58();
		}
		else if(this.state.payerAccount){
			account = this.state.payerAccount.toBase58();
		}
		if(account){
			window.navigator.clipboard.writeText(account);
			this.notify("Address copied to clipboard","info")
		}
		return;
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
	* Create new Solana Account
	* @method createSolanaAccount
	* @return {null}
	*/	
	createSolanaAccount(){
		let localAccount = new Account();
		let b64 = Buffer(localAccount._keypair.secretKey).toString("base64");
		this.importKey(b64);
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
					packets[i].us = await this.localSign(packets[i].u,this.state.localPayerAccount);
					if(!packets[i].us){
						return this.notify("Signing Error","error");
					}
					packets[i].us = packets[i].us.toString();
				}
				packets[i].c = totalPieces;
				if(Buffer.from(JSON.stringify(packets[i])).length > 880){
					//TODO: Recurse and reduce standardSize variable
					return this.notify("Unable to send file","error");
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
				return this.notify("Message size violation","error");
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
			else if(this.state.localPayerAccount){
				packet.us = await this.localSign(packet.u,this.state.localPayerAccount);
				if(!packet.us){
					this.setState({loading:false});
					return this.notify("Signing Error","error");
				}
				packet.us = packet.us.toString();
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
		let balance = 0;
		let cBalance = 0;
		this.setState({showBalanceChange:true});
		if(this.state.payerAccount){
			cBalance = this.state.payerAccountBalance ? this.state.payerAccountBalance : 0;
			balance	= await connection.getBalance(this.state.payerAccount);
			if(balance >=0 ){ this.setState({payerAccountBalance:balance / LAMPORTS_PER_SOL});}
		}
		else if(this.state.localPayerAccount){
			cBalance = this.state.localPayerBalance? this.state.localPayerBalance : 0;
			balance = await connection.getBalance(this.state.localPayerAccount.publicKey);
			if(balance >= 0){
				balance = balance > -1 ? balance / LAMPORTS_PER_SOL : 0;
				this.setState({localPayerBalance:balance});
			}
		}
		cBalance = (balance - (cBalance*LAMPORTS_PER_SOL));
		let mq = document.getElementById("balanceChange");
		mq.innerHTML = "$" + cBalance;
		setTimeout(()=>{
			this.setState({showBalanceChange:false});
		},1500)
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
		return new Promise((resolve,reject)=>{
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
			let cursor = checkpoint();
			requestIdleCallback(()=>{
				return window.fetch("https://"+this.state.defaultNetwork+".solana.com/", {
					"headers": {"content-type": "application/json"},
					"body":JSON.stringify(getSignatures),
					"method": "POST",
				})
				.then((r)=>{return r.json();})
				.then(async(resp)=>{
				if(resp && resp.result){
					//reverse the list to get chronological order
					resp.result = resp.result.reverse();
					for(let i = 0;i < resp.result.length;i++){
						//skip old messages
						if(resp.result[i].slot <= cursor ){continue;}
						//
						getTransactions.params[0] = resp.result[i].signature;
						await sleep(50);
						console.log(i,resp.result.length,resp.result[i].signature);
						await window.fetch("https://"+this.state.defaultNetwork+".solana.com/", {
							"headers": {"content-type": "application/json"},
							"body":JSON.stringify(getTransactions),
							"method": "POST",
						})
						.then((r)=>{return r.json();})
						.then((json)=>{
							if(json && json.result){
								let data = json.result.transaction[0];
								data = atob(data);
								checkpoint(resp.result[i].slot);
								return requestAnimationFrame(()=>{this.parseAccountData(data.slice(data.length-1028),true);})
							}
						})
						.catch(console.warn);
					}
				}
			})
			})
			resolve();
		})
	}
	
	/**
	* Import user Solana private key and save to localStorage
	* @method importKey
	* @param {String} base64 Solana private key
	* @return {null}
	*/	
	async importKey(localAccount,secure=true){
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
		//Set qr code
		let solanaQRURL = localPayerAccount.publicKey.toBase58();
		if(window.localStorage.getItem("rsaKeys")){
			solanaQRURL += " "+ JSON.parse(window.localStorage.getItem("rsaKeys")).publicKey.n;
		}
		solanaQRURL= await this.generateQRCode(solanaQRURL);
		//
		console.log("local account imported:",localPayerAccount.publicKey.toBase58());
		this.setState({localPayerAccount,solanaQRURL},this.getBalance);
		if(!secure){window.localStorage.setItem("myAccount",privateKey);}
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
	* @param {Number} Contract to deploy
	* @return {Promise} Should resolve to object {ProgramID,succ}
	*/
	async loadProgram(type){
		let program;
		if( type === 0){
			program = await fetch("/program.so").then(r=>r.blob());
		}
		else{
			program = await fetch("/sssc.so").then(r=>r.blob());
		}
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
	* @param {Number} Contract to use as owner
	* @return {Promise} Should resolve to base58 public key of the new Account
	*/	
	async loadProgramControlledAccount(type){
		let chatRoomAccount = new Account();
		let chatRoomPubkey = chatRoomAccount.publicKey;
		let lamports;
		if(type === 0){
			 lamports = await connection.getMinimumBalanceForRentExemption(1028);
		}
		else{
			lamports = await connection.getMinimumBalanceForRentExemption(130);
		}
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
			this.notify("Error Creating Account","error");
			console.error(e);
			return null;
		}
		let publicKey = chatRoomPubkey.toBase58();
		this.setState({latestAccount:publicKey});
		console.log("Account:",publicKey,"created");
	    return publicKey ;
	}
	
	/**
	* Sign a message string locally
	* @method localSign
	* @param {String} Message to sign
	* @param {Object} Solana Account to sign transaction
	* @param {Object} Transaction
	* @return {Promise} Return promise Uint8Array of the signature
	*/
	localSign(message,Account,transaction=false){
		return new Promise((resolve,reject)=>{
			let msg = message;
			message = Buffer.from(message);
			let privateKey = new Uint8Array(Account.secretKey);
			let signature = nacl.sign.detached(message,privateKey);
			if(this.state.autoSign === true){
				return resolve( new Uint8Array(signature) );
			}
			let popChannel = new BroadcastChannel('tran_pop');
			let resolveSignature = (data) =>{
				this.setState({transactionSignature:false,resolveSignature:false},async()=>{
					if(data && data.tran_resp){
						if(data.autoSign === true){
							await this.updateAutoSign(true);
						}
						resolve(data.tran_sig);
						return;
					}
				})
			}
			this.setState({transactionSignature:signature,resolveSignature},()=>{
				if(transaction && transaction.feePayer){
					let tx = JSON.parse(JSON.stringify(transaction));
					tx.feePayer = transaction.feePayer.toBase58();
					tx.instructions[0].programId = transaction.instructions[0].programId.toBase58();
					for(let i = 0;i < tx.instructions[0].keys.length;i++){
						tx.instructions[0].keys[i].pubkey = transaction.instructions[0].keys[i].pubkey.toBase58();
					}
					tx.instructions[0].data = Buffer.from(transaction.instructions[0].data).toString("base64");
					popChannel.postMessage( {message,msg,signature,transaction:tx} )
				}
				else{
					popChannel.postMessage( {message,msg,signature,transaction} );
				}
				popChannel.onmessage = null;
				popChannel = null;
			});
		});
	}	

	/**
	* Send message or update the characters user can input
	* @method messageKeyDown
	* @param {evt} KeyDown event
	* @return {Null}
	*/
	messageKeyDown(evt){
		this.updateCharacterCount();
		if(evt.keyCode === 13){
			evt.currentTarget.disabled = true;
			this.sendMessage()
			.then(()=>{
				setTimeout(this.getBalance,2000);
			})
			.catch(console.warn);
		}
		return;
	}
	
	/**
	* Show notification snackbar
	* @method notify
	* @param {String} Message value
	* @param {String} Severity value
	* @return {null}
	*/
	notify(msg,notificationSeverity="info"){
		this.setState({notificationMessage:msg,notificationOpen:true,notificationSeverity});
		return;
	}
		
	/**
	* Parse Solana Account data field
	* @method parseAccountData
	* @param {String} base64 Account data
	* @param {Boolean} Is a replay message 
	* @return {Null}
	*/
	async parseAccountData(data,replay=false){
		try{
			data = atob(data);
			if(this.checkBroadcast(data,replay)){return};
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
	* Process account data que
	* @method processQue
	* @return {Promise}Resolve to undefined
	*/	
	async processQue(){
		let item;
		for(let i = 0;i < AccountDataQue.length;i++){
			try{
				item = AccountDataQue.pop();
				await this.parseAccountData(item.data);
				checkpoint(item.slot);
			}
			catch(e){
				console.log(e);
			}
		}
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
		let nc = false;
		if( contactsList.indexOf(solanaPublicKey) > -1 ){
			console.log("Valid Broadcast from:",solanaPublicKey);
			if(window.confirm("Update contact: " +solanaPublicKey+ " chat public key?")){
				contacts[solanaPublicKey].chatPublicKey = rsaPublicKey;
				updateContacts(contacts);
				this.getContacts();
			}
			return;
		}
		else if( this.state.payerAccount && (solanaPublicKey !== this.state.payerAccount.toBase58()) ){
			nc = formatContact(solanaPublicKey,rsaPublicKey);
		}
		else if( this.state.localPayerAccount && (solanaPublicKey !== this.state.localPayerAccount.publicKey.toBase58()) ){
			nc = (formatContact(solanaPublicKey,rsaPublicKey));
		}
		else if( !this.state.payerAccount && !this.state.localPayerAccount){
			nc = (formatContact(solanaPublicKey,rsaPublicKey));
		}
		if(nc){
			nc.unsaved = true;
			let potentialContacts = this.state.potentialContacts;
			potentialContacts.unshift(nc);
			this.setState({potentialContacts},this.getContacts);
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
		window.localStorage.removeItem("locked");
		sessionStorage.removeItem('locked');
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
	* Save a new contact
	* @method saveNewContact
	* @param {Object} Contact object
	* @return {Null}
	*/	
	saveNewContact(contact){
		let potentialContacts = [];
		let contacts = this.state.contacts;
		for(let i = 0;i < this.state.potentialContacts.length;i++){
			if(this.state.potentialContacts[i].publicKey !== contact.publicKey){potentialContacts.push(this.state.potentialContacts[i]);}
		}
		delete contact.unsaved;
		contacts[contact.publicKey] = contact;
		updateContacts(contacts);
		this.setState({potentialContacts},this.getContacts);
		return;
	}	
	
	/**
	* Scroll to bottom of the page
	* @method scrollToBottom
	* @return {Promise} Resolve to boolean
	*/	
	scrollToBottom(){
		return new Promise((resolve,reject)=>{
			let chat;
			if(this.state.viewStyle === "mobile"){
				chat = document.getElementsByClassName("mobileChatHolder");
				if(chat){chat = chat[0]}
			}
			else{
				chat = document.getElementById("chat");
			}
			if(chat){chat.scrollTo(0,chat.scrollHeight);}
			return resolve(true);
		});
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
			return this.notify("Please subscribe to a chat first","info");
		}
		return this.constructAndSendFile(encryptedBytesArray)
		.then((transactions)=>{
			console.log("transaction",transactions);
			return transactions;
		})
		.catch((e)=>{
			this.notify("Error sending file","error");
			console.warn("Error sending file:",e);
			this.setState({loadingValue:0,loading:false});
		});
	}

	/**
	* Send encrypted message to the network
	* @method sendMessage
	* @return {null}
	*/	
	async sendMessage(){	
		let message = document.getElementById("newMessage");	
		this.setState({loading:true,loadingMessage:"confirming transaction"});
		if(!this.state.connection && !this.state.localPayerAccount){
			message.disabled = false;
			await this.connectWallet();
		} 
		if(!this.state.ws){
			message.disabled = false;
			return this.notify("Please subscribe to a chat first","info");
		}
		this.constructAndSendTransaction(message.value)
		.then((transaction)=>{
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
			if(this.state.loading){
				this.setState({loading:false});		
			}
			this.notify("Error sending message","error")
		})
		.finally(()=>{
			this.setState({loading:false,loadingMessage:""});
			if(message.disabled){message.disabled = false;}
			this.updateCharacterCount();
		});
	}

	/**
	* Send Sol to a contact
	* @method sendSol 
	* @param {String} Solana Public address
	* @param {Number} Amount of Sol to send
	* @return {Promise} Resolve to the transaction id
	*/	
	async sendSol(solanaPublicKey,solAmount){
		let instruction = SystemProgram.transfer({
			fromPubkey: this.state.localPayerAccount.publicKey,
			toPubkey:new PublicKey(solanaPublicKey),
			lamports:Math.ceil(solAmount * LAMPORTS_PER_SOL),
		});
		let transaction = new Transaction().add(instruction);
		let txid;
		try{
			txid = await sendAndConfirmTransaction(
				'createAccount',
				connection,
				transaction,
				this.state.localPayerAccount,
			);
		}
		catch(e){
			this.notify("Error Sending Sol","error");
			console.error(e);
			return null;
		}
		this.notify(solAmount+" sent to "+solanaPublicKey +" "+txid,"info");
		return txid;
	}
	
	/**
	* Set the 'currentContact' state
	* @method setCurrentContact (contact object)
	* @return {Null}
	*/	
	setCurrentContact(contact){
		if(!contact){return;}
		let contacts = this.state.contacts;
		//update recent contacts
		let recentContacts = this.state.recentContacts;
		let recent = true;
		for(let i = 0;i < recentContacts.length;i++){
			if(recentContacts[i].publicKey === contact.publicKey){
				recent = false;
				break;
			}
		}
		if(recent){
			recentContacts.unshift(contact);
			recentContacts = recentContacts.slice(0,4);
		}
		//end update recent contacts
		if(contacts[contact.publicKey]){
			contacts[contact.publicKey].message = 0;
			updateContacts(contacts);
			this.setState({
				currentContact:contact,
				contacts,
				recentContacts,
				viewContacts:false,
				viewChat:true,
			},this.scrollToBottom);
		}
		return;
	}
	
	/**
	* Set the loading status
	* @method setLoading
	* @param {Boolean} Is transaction processing?
	* @return {Null}
	*/	
	setLoading(isLoading){
		this.setState({loading:isLoading});
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
	subscribe(contacts,network){
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
				message.params = [defaultChannel,{"encoding":"jsonParsed","commitment":"singleGossip"} ]; 
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
		//Channel for sol survivor
		const bc = new BroadcastChannel('game_channel');
		const onMessage = (evt)=> {
			try{
				this.writeLog(evt.data);
				let account = JSON.parse(evt.data);
				if(account.params){
					let accountData = account.params.result.value.data;
					//Send data to game screen
					if( account.params.result.value.owner === this.state.GAME_ID){
						return bc.postMessage(accountData);
					}
					//Manage Account Data
					if(!this.state.syncingHistory){
						this.parseAccountData(accountData[0]);
						checkpoint(account.params.result.context.slot);
					}
					else{
						AccountDataQue.push({ data:accountData[0],slot:account.params.result.context.slot });
					}
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
		}

		function onError(evt) {
		  console.error(evt.data);
		}
		let socketRoot = "wss://"+network+".solana.com";
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
	* Toggle between chat view
	* @method toggleChatView
	* @return {Null}
	*/			
	toggleChatView(){
		if(!this.state.viewChat){
			this.setState({viewChat:true,viewContacts:false,viewSettings:false,viewTransactions:false,playGame:false});
			return;
		}
		this.setState({viewChat:!this.state.viewChat});
		return;
	}
		
	/**
	* Toggle between contacts view
	* @method toggleContactsView
	* @return {Null}
	*/			
	toggleContactsView(){
		if(!this.state.viewContacts){
			this.setState({viewChat:false,viewContacts:true,viewSettings:false,viewTransactions:false,playGame:false});
			return;
		}
		this.setState({viewContacts:!this.state.viewContacts});
		return;
	}

	/**
	* Toggle view settings
	* @method toggleSettingsView
	* @return {Null}
	*/			
	toggleSettingsView(){
		if(!this.state.viewSettings){
			this.setState({viewChat:false,viewContacts:false,viewSettings:true,viewTransactions:false,playGame:false});
			return;
		}
		this.setState({viewSettings:!this.state.viewSettings});
		return;
	}	
	
	/**
	* Toggle sol-survivor help wizard
	* @method toggleSurvivorHelp
	* @return {Null}
	*/			
	toggleSurvivorHelpOpen(){
		this.setState({survivorHelpOpen:!this.state.survivorHelpOpen});
		return;
	}			
			

	/**
	* Toggle transaction history view
	* @method toggleTransactionView
	* @return {Null}
	*/			
	toggleTransactionView(){
		if(!this.state.viewTransactions){
			this.setState({viewChat:false,viewContacts:false,viewSettings:false,viewTransactions:true,playGame:false});
			return;
		}
		this.setState({viewTransactions:!this.state.viewTransactions});
		return;
	}

	/**
	* Toggle view of games
	* @method togglePlayGame
	* @return {Null}
	*/		
	togglePlayGame(){
		if(!this.state.playGame){
			this.setState({viewChat:false,viewContacts:false,viewSettings:false,viewTransactions:false,playGame:true});
			return;
		}
		this.setState({playGame:!this.state.playGame});
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
	* Update the auto sign transaction
	* @method updateAutosign
	* @param {Boolean} Set auto sign boolean
	* @return {Promise} Promise resolve to undefiend
	*/	
	updateAutoSign(defaultSign=false){
		return new Promise((resolve,reject)=>{
			if(!defaultSign){
				//toggleSetting
				window.localStorage.setItem("autoSign",!this.state.autoSign);
				this.setState({autoSign:!this.state.autoSign},resolve);
			}
			else{
				window.localStorage.setItem("autoSign",true);
				this.setState({autoSign:true},resolve);
			}
		});
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
		console.log("update avatar style",newStyle);
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
	
	/**
   * Render Desktop page
   * @method renderDesktop
   * @return {Null}
   */		
	renderDesktop(){
		return(
		<div className="App">
			<Wizard open={this.state.survivorHelpOpen} close={this.toggleSurvivorHelpOpen}/>
			{ this.state.transactionSignature ? <TransactionInfo resolveSignature={this.state.resolveSignature}/> : null }
			<Snackbar
				anchorOrigin={{
					vertical: 'top',
					horizontal: 'center',
				}}
				open={this.state.notificationOpen}
				autoHideDuration={3000}
				onClose={this.closeNotification}
				>
				<MuiAlert severity={this.state.notificationSeverity} elevation={6} variant="filled">
					{this.state.notificationMessage}
				</MuiAlert>
			</Snackbar>
			<div id="topBar">
				<div>
					<img alt="sologo" id="logo" src="./logo192.png" />
				</div>
				{
					(!this.state.payerAccount && !this.state.localPayerAccount) ?
					<div className="loginButtons">
						<Button color="secondary" variant="contained" size="small" onClick={this.connectWallet}>Sollet</Button> 
						<SecureWallet importKey={this.importKey} notify={this.notify}/>
					</div>
					:null
				}
				{ 
					(this.state.payerAccount || ( this.state.localPayerAccount && this.state.localPayerAccount.publicKey))? 
					<div id="barAccountInfo">
						{
								this.state.payerAccount ? 
								<img alt="accountImg" className="avatar" src={"https://robohash.org/"+ this.state.payerAccount.toBase58() +"?size=128x128"+this.state.avatarStyle }/> :
								<img alt="accountImg" className="avatar" src={"https://robohash.org/"+this.state.localPayerAccount.publicKey.toBase58() +"?size=128x128"+this.state.avatarStyle}/>
						}
						{this.state.payerAccount? this.state.payerAccount.toBase58().slice(0,6) : null} 
						{this.state.localPayerAccount ? this.state.localPayerAccount.publicKey.toBase58().slice(0,6) : null}		
						<br/>
						{this.state.payerAccount? this.state.payerAccountBalance : null}
						{this.state.localPayerAccount ? this.state.localPayerBalance : null} sol	
						{ this.state.showBalanceChange ? <div><marquee id="balanceChange" direction="left" loop={1}>0</marquee></div>: null }		
					</div>
					:null
				}
				<div id="chainSelectionButtons">
					<Button 
						onClick={()=>{this.changeNetwork("api.mainnet-beta")}} 
						color={ this.state.defaultNetwork === "api.mainnet-beta" ? "primary" : "secondary" } 
						variant={ this.state.defaultNetwork === "api.mainnet-beta" ? "contained" : "outlined" } >
						Mainet
					</Button>
					<Button 
						onClick={()=>{this.changeNetwork("testnet")}} 
						color={ this.state.defaultNetwork === "testnet" ? "primary" : "secondary" } 
						variant={ this.state.defaultNetwork === "testnet" ? "contained" : "outlined" } >
						Testnet
					</Button>
				</div>							
			</div>
			<div id="appRow">
				<div id="desktopColBar">
					<List>
						<ListItem>
						{ 
							this.state.loading ? 
							<LinearProgress id="progressBar" now={this.state.loadingValue} label={this.state.loadingMessage}/>
							: null 
						}
						</ListItem>
						<ListItem>
							{ 
								this.state.potentialContacts.length > 0 ? 
								<Badge color="secondary" badgeContent={this.state.potentialContacts.length}> </Badge> 
								: null 
							}
							<Tooltip title="Contacts" placement="top">	
								<Button color="primary"  variant={this.state.viewContacts ? "contained" : "text"} onClick={this.toggleContactsView}><SupervisorAccountIcon /> </Button>
							</Tooltip>	
						</ListItem>
						<ListItem>
							<Tooltip title="Games" placement="top">	
								<Button color="primary" variant={this.state.playGame ? "contained" : "text"} onClick={this.togglePlayGame}> <GamesIcon /> </Button>
							</Tooltip>
						</ListItem>
						<ListItem>
							<Tooltip title="Settings" placement="top">	
								<Button color="primary" variant={this.state.viewSettings ? "contained" : "text"} onClick={this.toggleSettingsView}>	<SettingsIcon /> </Button>
							</Tooltip>
						</ListItem>
						<ListItem>
							{
								(this.state.rsaKeyPair && this.state.rsaKeyPair.publicKey && ( this.state.localPayerAccount || this.state.payerAccount ) ) ? 
								<Tooltip title="Broadcast Presence" placement="top">	
									<Button onClick={this.broadcastPresence}><RecordVoiceOverIcon color="primary" variant="contained" /> </Button>
								</Tooltip>	
								:null
							}						
						</ListItem>						
						<ListItem>
							<Tooltip title="Transaction" placement="top">	
								<Button color="primary" variant={this.state.viewTransactions ? "contained" : "text"} onClick={this.toggleTransactionView}>	<NotesIcon /> </Button>
							</Tooltip>
						</ListItem>
						{
							this.state.playGame ?
							<ListItem>
									<Button color="primary" variant="text" onClick={this.toggleSurvivorHelpOpen}> <HelpOutlineIcon /> </Button>						
							</ListItem>
							:null
						}
						<RecentContacts avatarStyle={this.state.avatarStyle} recentContacts={this.state.recentContacts} setCurrentContact={this.setCurrentContact}/>
					</List>					
				</div>
				<div id="desktopColView">
					{
						this.state.viewChat?
						<div id="chatCol">
							<div> 
								{ 
									this.state.currentContact ?
									<div className="contactSlice">
										<img alt="currentContactImg" className="avatar" src={"https://robohash.org/"+ this.state.currentContact.publicKey +"?size=128x128"+this.state.avatarStyle }/>
										<br/>{this.state.currentContact.publicKey ? this.state.currentContact.publicKey : null}
									</div>
									:null

								}
								<div id="chat"> 						
									{
										this.state.MESSAGE_HISTORY[this.state.currentContact.publicKey] && this.state.MESSAGE_HISTORY[this.state.currentContact.publicKey].map((info,ind)=>(
											<div key={ind} className={info.txid ? "msgSelf" : "msgContact"}>	
												<p>
												{ info.message ? info.message.trim() : null }
												
												{ info.img_src ? <img alt="img" src={info.img_src} /> : null }
												
												{ info.audio_src ? <audio alt="img" src={info.audio_src} controls /> : null }
												</p>
											</div>
										))
									}	
								</div>
							</div>
							<div id="charCount">#{this.state.characterCount}</div>
							<div id="chatHolderDesktop">
								<div className="userInput">
									<Paper component="form"  id="newMessageForm">
										<InputBase
											fullWidth
											id="newMessage"
											placeholder="Type a message"
											inputProps={{ 'aria-label': 'type a message' }}
											onKeyDown={this.messageKeyDown}
										/>
									</Paper>
									<Button variant="contained" color="primary" onClick={this.sendMessage}>
										<MailIcon />
									</Button>
									<Button variant="contained" color="secondary" onClick={this.uploadImageFile}>
										<PhotoCameraIcon/>
									</Button>
									<Recorder uploadAudioFile={this.uploadAudioFile} variant={"contained"} color="primary"/>
								</div>
							</div>
						</div>
						:null
					}
					{
						this.state.playGame ?
						<Stage 
							_connection={connection}
							connection={this.state.connection}
							currentContact={this.state.currentContact}
							defaultNetwork={this.state.defaultNetwork}
							GAME_ID={this.state.GAME_ID} 
							GAME_ACCOUNT={this.state.GAME_ACCOUNT}
							localPayerAccount={this.state.localPayerAccount}
							localSign={this.localSign}
							payerAccount={this.state.payerAccount}
							notify={this.notify}
							saveTransaction={saveTransaction}
							setLoading={this.setLoading}
							stringToBytes={stringToBytes}
							urlRoot={"https://"+this.state.defaultNetwork+".solana.com"}
							wallet={this.state.wallet}
							ws={this.state.ws}
						/>
						: null
					}
					{
						this.state.viewContacts ?
						<ContactsView 
							addContact={this.addContact} 
							avatarStyle={this.state.avatarStyle}
							contacts={this.state.contacts} 
							cancelContactForm={this.cancelContactForm} 
							currentContact={this.state.currentContact}
							potentialContacts={this.state.potentialContacts}
							removeContact={this.removeContact}
							saveNewContact={this.saveNewContact}
							setCurrentContact={this.setCurrentContact}
							showContactForm_state={this.state.showContactForm} 
							showContactForm={this.showContactForm}
						/>
						: null
					}
					{
						this.state.viewSettings ?		
						<Settings 
							addContact={this.addContact}
							autoSaveHistory={this.state.autoSaveHistory}
							autoSign={this.state.autoSign}
							avatarStyle={this.state.avatarStyle}
							copySolanaAddress={this.copySolanaAddress}
							currentContact={this.state.currentContact}
							broadcastPresence={this.broadcastPresence}
							defaultNetwork={this.state.defaultNetwork}
							deleteMessageHistory={this.deleteMessageHistory}
							exportContacts={this.exportContacts}
							exportPrivateKey={this.exportPrivateKey}
							exportRSAKeys={this.exportRSAKeys}
							importRSAKeys_JSON={this.importRSAKeys_JSON}
							localPayerAccount={this.state.localPayerAccount}
							localPayerBalance={this.state.localPayerBalance}
							payerAccount={this.state.payerAccount}
							payerAccountBalance={this.state.payerAccountBalance}
							providerUrl={this.state.providerUrl}
							removeImportedAccount={this.removeImportedAccount}
							removeRSAKeys={this.removeRSAKeys}
							rsaKeyPair={this.state.rsaKeyPair}
							sendSol={this.sendSol}
							showSolanaQR={this.state.showSolanaQR}
							solanaQRURL={this.state.solanaQRURL}
							toggleShowSolanaQR={this.toggleShowSolanaQR}
							viewStyle={this.state.viewStyle}
							updateAutoSaveHistory={this.updateAutoSaveHistory}
							updateAutoSign={this.updateAutoSign}
							updateAvatarStyle={this.updateAvatarStyle}
							updateViewStyle={this.updateViewStyle}
						/>:null				
					}
					{
						this.state.viewTransactions ?
						<TransactionHistory
							transactions={ localStorage.getItem("transactionHistory")? JSON.parse(localStorage.getItem("transactionHistory")) : [] }
						/>
						: null
					}
				</div>
			</div>

		<div id="logRow">
			<div>
				<p>Logs</p>
				<textarea id="logs"></textarea>
			</div>
		</div>
		<div>
			<div>
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
							<Button variant="contained" onClick={()=>{this.loadProgram(0)}}>Deploy Chat</Button>
							<Button onClick={()=>{this.loadProgram(1)}}>Deploy Game</Button>
							<Button variant="contained" onClick={()=>this.importKey()}>Import New Private Key</Button>
							<Button onClick={()=>{this.loadProgramControlledAccount(0)}}> Launch a new chat room  </Button>
							<Button onClick={()=>{this.loadProgramControlledAccount(1)}}> Launch a new game room  </Button>
						</ButtonGroup>
					</div>
					:<Button variant="contained" onClick={()=>{this.importKey()}}>Import Private Key </Button>
				}
				</div>
			</div>
		</div>
		</div>);
	}

	render(){
		if(this.state.viewStyle !== "mobile"){
			return this.renderDesktop();
		}
		return this.renderDesktop();
	}
}


function ContactsView(props){
	function proxyAddContact(){
			let solanaPublicKey = document.getElementById("new_contact_key").value;
			let rsaPublicKey = document.getElementById("new_chat_key").value;
			if(solanaPublicKey.value && !rsaPublicKey.value){rsaPublicKey = "";}
			props.addContact(solanaPublicKey,rsaPublicKey);
			props.cancelContactForm();
	}
	//Merge Unsaved Contacts
	for(let i = 0;i < props.potentialContacts.length;i++){
		props.contacts[ props.potentialContacts[i].publicKey ] = props.potentialContacts[i];
	}
	
	return(<div className="contactHolder">
			<div>
				<Row className="contactCol">
				{
					Object.keys(props.contacts).length > 0 && Object.keys(props.contacts).map((item,ind)=>(
						<Col xs={4} key={ind} style={{background: props.currentContact.publicKey === props.contacts[item].publicKey ? "#cfe7f14a" : "" }}>
							{ props.contacts[item].message > 0 ? <Badge color="secondary" badgeContent={props.contacts[item].message}> </Badge>:null }
							<img alt="contactImg" className="contactImg" src={"https://robohash.org/"+props.contacts[item].publicKey+"?size=256x256"+props.avatarStyle} />
							<p className="contactInfo">
								<Button size="large">
									<ChatIcon onClick={()=>{props.setCurrentContact(props.contacts[item])}} variant="outlined" color="primary"  > </ChatIcon>
								</Button>
								<Button size="large">
									<DeleteIcon variant="contained" color="secondary" size="small" onClick={()=>{props.removeContact(item); }}> remove </DeleteIcon>
								</Button>	
								<br/>
								<b>Solana Address</b>
								<br/>{props.contacts[item].publicKey}
								<br/><b>RSA Public Key</b>
								<br/>{props.contacts[item].chatPublicKey}
								<br/><b>Program</b>
								<br/>{props.contacts[item].programId}
								<br/><b>Account</b>
								<br/>{props.contacts[item].channel}
								<br/>
								{
									props.contacts[item].unsaved === true ? 
									<Button color="primary" onClick={()=>{props.saveNewContact( props.contacts[item] );}}>save contact</Button>
									:null
								}
							</p>
						</Col>
					))
				}
				</Row>
				<div id="addContact">
					{
						props.showContactForm_state ?
						<Button variant="contained" color="secondary" onClick={props.cancelContactForm}>CANCEL</Button>		
						: <Button variant="contained" color="primary" onClick={props.showContactForm}>ADD CONTACT</Button>		
					}
				</div>	
			</div>
		
		{
			props.showContactForm_state ? <NewContact cancelContactForm={props.cancelContactForm} proxyAddContact={proxyAddContact} />: null
		}
	</div>)
}

function NewContact(props){
	return(<Card className="secureWalletCard">
		<Button id="titleButton">Add Contact</Button>
		<div>
			<form noValidate autoComplete="off">
				<TextField fullWidth id="new_contact_key" label="Solana Public Key" variant="outlined" type="text"/>
			    <br/><TextField fullWidth id="new_chat_key" label="RSA Public Key" variant="outlined" type="text"/>
			</form>
		</div>
		<CardActions id="addContactActions">
			<Button color="secondary" onClick={props.cancelContactForm}>Cancel</Button>
			<Button id="addContactButton" color="primary" variant="contained" onClick={props.proxyAddContact}>Add</Button>
		</CardActions>
	</Card>)
}

function RecentContacts(props){
	return(<div className="recentContacts">
			<div id="gitLink"> <a className="github-button" href="https://github.com/kemargrant/soltalk" data-icon="octicon-star" aria-label="Star soltalk on GitHub" data-size="large" >Star</a></div>
			{
				props.recentContacts.length > 0 && props.recentContacts.map((contact,ind)=>(
					<Button key={ind} onClick={()=>{ return props.setCurrentContact(contact);}}>
						<img alt="recent contact avatar" key={ind} src={"https://robohash.org/"+contact.publicKey+"?size=128x128"+props.avatarStyle} />
					</Button>
				))
			}
	</div>)
}

function Settings(props){	
	return(<div className="settingsPanel">
			<Card className="settingsCard">
				<b id="settingsAccount">{ props.payerAccount ? props.payerAccount.toBase58() : null } { props.localPayerAccount ? props.localPayerAccount.publicKey.toBase58() : null } </b>
				<CardActionArea>
				{
						props.payerAccount ?
						<CardMedia className={"cardAvatar"} image={"https://robohash.org/"+props.payerAccount.toBase58()+"?size=720x720"+props.avatarStyle} title="card avatar"/>
						:null 
				}
				{
						props.localPayerAccount ?
						<CardMedia className={"cardAvatar"} image={"https://robohash.org/"+props.localPayerAccount.publicKey.toBase58()+"?size=720x720"+props.avatarStyle} title="card avatar"/>
						:null 
				}
				{
					props.showSolanaQR ?
					<img alt="userQRCode" className="desktopQR" src={props.solanaQRURL}/>
					:null
				}
				<CardContent className="settingsContent">
					<Typography variant="body2" color="textSecondary" component="p">
						{props.payerAccount ? props.payerAccountBalance : null } { props.localPayerAccount ? props.localPayerBalance : null } SOL
						<br/>
						{ 
							props.providerUrl && props.payerAccount?  props.providerUrl : null
						} 
						<br/>
						<b>PROGRAM </b>
						<a rel="noopener noreferrer" href={'https://explorer.solana.com/address/'+defaultProgram+'?cluster='+props.defaultNetwork} target="_blank">{props.currentContact.channel}</a>   
						<br/> 
						<b>ACCOUNT </b> 
						<a rel="noopener noreferrer" href={'https://explorer.solana.com/address/'+defaultChannel+'?cluster='+props.defaultNetwork} target="_blank">{props.currentContact.programId} </a>
					</Typography>
				</CardContent>
				</CardActionArea>
				<List>
					<Divider/>
					<ListItem>
						<b>AutoSave Messages</b> 
						<FormGroup aria-label="position" row>
							<FormControlLabel
							control={<Switch color="primary" />}
							labelPlacement="start"
							checked={props.autoSaveHistory ? true : false}
							onClick={props.updateAutoSaveHistory}
							/>
						</FormGroup>
					</ListItem>
					<Divider/>	
					<ListItem>
						<b>Auto Sign Transactions</b> 
						<FormGroup aria-label="position" row>
							<FormControlLabel
							control={<Switch color="primary" />}
							labelPlacement="start"
							checked={props.autoSign ? true : false}
							onClick={async()=>{await props.updateAutoSign(); }}
							/>
						</FormGroup>
					</ListItem>
					<Divider/>						
					<ListItem>
						<b>Avatar Style</b> 
						<FormGroup aria-label="position" row>
							<FormControlLabel
							control={<Switch color="primary" />}
							labelPlacement="start"
							checked={props.avatarStyle === "" ? true : false}
							onClick={props.updateAvatarStyle}
							/>
						</FormGroup>
					</ListItem>
					<Divider/>	
					<ListItem>
						<ButtonGroup size="small">
							<Button color="primary">QR CODE</Button>
							<Button variant="contained" color="primary" onClick={props.toggleShowSolanaQR}>View</Button>
							<Button variant="contained" color="primary"><ScanQR title={"Scan"} addContact={props.addContact} avatarStyle={props.avatarStyle} sendSol={props.sendSol}/></Button>
						</ButtonGroup>
					</ListItem>						
					<Divider/>	
					<ListItem>
						<ButtonGroup size="small">
							<Button color="primary">import</Button>
							<Button variant="contained" color="primary" onClick={props.importRSAKeys_JSON}>Import RSA Keys</Button>
						</ButtonGroup>
					</ListItem>			
					<Divider/>	
					<ListItem>
						<ButtonGroup size="small">
							<Button color="primary">export</Button>
							<Button variant="contained" color="primary" onClick={props.exportContacts}>Contacts</Button>
							{ props.localPayerAccount?
								<Button variant="contained" color="primary" onClick={props.exportPrivateKey}>Private Key</Button> : null
							}
							{ props.rsaKeyPair?
								<Button variant="contained" color="primary" onClick={props.exportRSAKeys}>RSA Keys</Button> : null
							}
						</ButtonGroup>
					</ListItem>
					<Divider/>	
					<ListItem>
						<ButtonGroup size="small">
							<Button color="secondary">remove</Button>
							<Button variant="contained" color="secondary" onClick={props.deleteMessageHistory}> Message History </Button>
							{ props.localPayerAccount?
								<Button variant="contained" color="secondary" onClick={props.removeImportedAccount}> Imported Account </Button> : null
							}
							{ props.rsaKeyPair?
								<Button variant="contained" color="secondary" onClick={props.removeRSAKeys}> RSA Keys </Button> : null
							}
						</ButtonGroup>
					</ListItem>
					<Divider/>
					{
						(!props.rsaKeyPair && ( props.localPayerAccount || props.payerAccount ) ) ? 
						<ListItem>
							<Button onClick={props.createRSAKeyPair}>Create RSA key pair</Button>
						</ListItem>
						:null
					}	
					<Divider/>
					<ListItem>
						<p className="credits">
							<a href="robohash.org" target='_blank' rel="noopener noreferrer">Robots lovingly delivered by Robohash.org</a>
							<br/> <a href="https://www.fesliyanstudios.com/royalty-free-music/download/dragon-boss-fight/993"> "Dragon Boss Fight" by David Fesliyan </a>
						</p>
					</ListItem>
				</List>		
			</Card>	

		</div>)
}		

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
			<Button color="primary" variant="outlined" onClick={()=>{return sendSig(true);}}>Auto Sign Transactions</Button>
			<div>	
				<Card>
					<Button id="titleButton">Transaction Details</Button>
					<CardActionArea className="transactionCard">
						<CardContent>
							<Typography variant="body2" color="textSecondary" component="p">
								message:<p id="msg"></p>
								<br/>message(base64):<p id="base64_message"></p>	
								<p id="signature" style={{display:"none"}}></p>
								<br/>signature(base64):<p id="base64_signature"></p>										
							</Typography>
						</CardContent>
					</CardActionArea>
					<CardActions>
						<div id="secureButtons">
							<Button color="secondary" variant="contained" onClick={cancel}>Cancel</Button>
							<Button id="protectButton" color="primary" variant="contained" onClick={sendSig}>Confirm</Button>
						</div>
					</CardActions>
				</Card>
			</div>
	</div>)
}

function TransactionHistory(props){	
	return(<div className="txHistory">
		<b>Transactions</b>
		<List>
			{
				props.transactions && props.transactions.reverse().map((transaction,ind)=>(
					<div key={ind}>
						<ListItem>
							<p>
							{timeAgo.format(new Date(transaction.date),'round')}
							<br/>
							{transaction.type}
							<br/>
								<a rel="noopener noreferrer" 
								href={transaction.link} 
								target="_blank">
									{transaction.txid}
								</a>  
							</p> 
						</ListItem>
						<Divider/>
					</div>
				))
			}
		</List>	
	</div>)
}

class Wizard extends React.Component{ 
	constructor(props){
		super(props);
		this.state = {
			content:{
				1:"Player1 Press Start",
				2:"Wait For Player2 to Press Start",
				3:"Player1 Select Action(Commit) & Approve Transaction",
				4:"Wait For Player2 Action(Commit)",
				5:"Unleash(Reveal) Your Action",
				6:"Player2 Has 10 Seconds to Unleash(Reveal) Action"
			},
			step:1
		}
		this.backward = this.backward.bind(this);
		this.forward = this.forward.bind(this);
	}
	
	backward(){
		let step = this.state.step;
		if(step > 1){step--}
		this.setState({step});
		return;
	}
	
	forward(){
		let step = this.state.step;
		if(step < 6){step++}
		this.setState({step});
		return;
	}	
	
	render(){
		if(!this.props.open){
			return null;
		}
		return(<div className="wizardCard">
				<Card>
					<Button variant="contained" color="secondary" onClick={this.props.close}> <CancelIcon/> </Button> 						
					<h4>How To Play</h4>	
					<CardActionArea>
						<CardContent className="wizardContent">
							<div id="wizardImgDiv">
								<img src={"./images/step"+this.state.step+".png"} alt="wizard instruction step"/>
							</div>
							<Typography variant="body1" color="textSecondary" component="p">
							{this.state.content[this.state.step]}
							</Typography>
						</CardContent>
				</CardActionArea>
					<CardActions>
						<Button variant="contained" color="primary" onClick={this.backward}>  <FastRewindIcon/> </Button> 						
						<Button variant="contained" color="primary" id="wizardForward" onClick={this.forward}> <FastForwardIcon/> </Button>
					</CardActions>
				</Card>
	</div>)
	}
}	
	
export default App;
