import React from 'react';
import { Button,ButtonGroup,Input } from 'reactstrap';
import { ProgressBar } from 'react-bootstrap';
import {
  PublicKey,  
  TransactionInstruction,
  Transaction,
} from '@solana/web3.js';
import {sendAndConfirmTransaction} from '../util/send-and-confirm-transaction';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import * as BufferLayout from 'buffer-layout';
import { TokenBalance } from '../util/TokenBalance';
import { WagerClient } from '../util/wager';
import { ContractView } from './ContractView';
import DeleteIcon from '@material-ui/icons/Delete';
import LinearProgress,{ linearProgressClasses } from '@mui/material/LinearProgress';
import LineStyleIcon from '@material-ui/icons/LineStyle';
import MonetizationOnIcon from '@material-ui/icons/MonetizationOn';
import { styled } from '@mui/material/styles';

const HealthLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: 10,
  borderRadius: 5,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: theme.palette.grey[theme.palette.mode === 'light' ? 200 : 800],
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 5,
    backgroundColor: theme.palette.mode === 'light' ? '#06D6A0' : '#308fe8',
  },
}));

const sdbm = require('sdbm');

var Drift = 0;
function get64BitTime(byteArray){
	if(!byteArray){return 0;}
	let trim = byteArray.reverse().slice(4)
	let nArray = new Uint8Array(trim);
	let buffer = Buffer.from(nArray);
	let hex = "0x"+buffer.toString("hex");
	let big = window.BigInt(hex);
	big = big.toString();
	big = Number(big);
	let time = new Date( (big *1000) + Drift);
	return time;
}

const react_game_channel = new BroadcastChannel('game_channel'); 
var channel;
var port1;
var connectPort = false;
var unityReady = false;

function addChannel(){
	if(connectPort === true){return;}
	let ifr = document.getElementsByTagName("iframe")[0];
	if(!ifr || !ifr.contentWindow){ return setTimeout(()=>{addChannel()},1000); }
	ifr.contentWindow.postMessage('init', '*', [channel.port2]);
	connectPort = true;
}

let lastTime = new Date().getTime();
let speed = "";
function rpcSpeedTest(reset=false){
	if(reset){
		speed = (new Date().getTime() - lastTime)/1000;
		console.error("%cRPC speed:"+speed+"s","background:black;color:white");
	}
	lastTime = new Date().getTime();
}

function WebGLView(props){
	return (<iframe
		id="gameIframe"
		title="gameIframe" 
		src={props.src} 
		width={document.body.clientWidth} 
		height={document.body.clientHeight*0.85} 
		style={{frameBorder:0}}
		onLoad={props.onLoad}
	/>);
}       

var loadingCharactersBouncer = 0;     
     
     
class Stage extends React.Component{ 
	constructor(props){
		super(props);
		this.state = {
			backroundMusic:"",
			bet:{},
			chosenCharacter:0,
			classic:true,
			gameStart:false,
			gameStatus:0,
			initialLoadingCompleted:false,			
			isPlayer1:false,
			isPlayer2:false,
			isWagerGame:false,
			kor:false,
			loadingAccountData:true,
			moveTimer:-1,
			moveTimerExpiration:-1,
			moveTimeoutValue:30,
			muted:false,
			myCommit:"",
			player1:false,
			player2:false,
			p1Action:"idle",
			player1Character:0,
			player1Commit:0,
			player1DidCommit:0,
			player1DidReveal:0,
			player1Health:-1,
			player1Super:0,
			p2Action:"idle",
			player2Character:0,
			player2Commit:0,
			player2DidCommit:0,
			player2DidReveal:0,
			player2Health:-1,	
			player2Super:0,
			timeLimit:-1,
			tournamentStart:0,
			steps:0,
			wager:false,
			wagerAmount:0.05,
			wagerContractAddress:"",
			wagerTokenBalance:0,
			wagers:window.localStorage.getItem("wagers") ? JSON.parse(window.localStorage.getItem("wagers")) : [],			
			viewBet:false,	
		}
		this.acceptChallenge = this.acceptChallenge.bind(this);
		this.acceptWagerKeysIx = this.acceptWagerKeysIx.bind(this);
		this.addMintSigs = this.addMintSigs.bind(this);
		this.beginGame = this.beginGame.bind(this);
		this.chooseCharacter = this.chooseCharacter.bind(this);
		this.commit = this.commit.bind(this);
		this.countDownTimer = this.countDownTimer.bind(this);
		this.crankIt = this.crankIt.bind(this);
		this.createChallenge = this.createChallenge.bind(this);
		this.haveToken = this.haveToken.bind(this);
		this.gameSetup = this.gameSetup.bind(this);
		this.getAccountInfo = this.getAccountInfo.bind(this);
		this.getWagerInfo = this.getWagerInfo.bind(this);
		this.muteMusic = this.muteMusic.bind(this);
		this.onWalletUpdate = this.onWalletUpdate.bind(this);
		this.parseState = this.parseState.bind(this);
		this.playMusic = this.playMusic.bind(this);
		this.reveal = this.reveal.bind(this);
		this.returnToMenu = this.returnToMenu.bind(this);
		this.sendCharactersToUnity = this.sendCharactersToUnity.bind(this);
		this.solletSign = this.solletSign.bind(this);
		this.subscribeToGame = this.subscribeToGame.bind(this);
		this.timeGame = this.timeGame.bind(this);
		this.toggleViewBet = this.toggleViewBet.bind(this);
		this.translateGameState = this.translateGameState.bind(this);
		this.updateSteps = this.updateSteps.bind(this);
		this.updateWagerAmount = this.updateWagerAmount.bind(this);
		this.updateWagerList = this.updateWagerList.bind(this);
		this.updateWagerOption = this.updateWagerOption.bind(this);
		this.wagerStart = this.wagerStart.bind(this);
	}
	
	async acceptChallenge(){
		if(!this.props.payerAccount && !this.props.localPayerAccount){
			return alert("Please Connect Wallet First!");
		}		
		this.props.setLoading(true);
		this.setState({gameStart:false});
		this.playMusic().catch(console.warn);
		let clock = new PublicKey("SysvarC1ock11111111111111111111111111111111");		
		let gameAccount;
		let gameWallet;
		let programId;
		if(this.state.wager){ 
			gameAccount = new PublicKey(this.props.WAGER_GAME_ACCOUNT);
			programId = new PublicKey(this.props.WAGER_GAME_ID); 
		}
		else if(this.state.classic){ 
			gameAccount = new PublicKey(this.props.GAME_ACCOUNT);
			programId = new PublicKey(this.props.GAME_ID); 
		}
		else if(this.state.kor){ 
			gameAccount = new PublicKey(this.props.KOR_ACCOUNT);
			gameWallet = new PublicKey(this.props.KOR_WALLET);
			programId = new PublicKey(this.props.KOR_ID); 
		}
		let txid;
		//sollet adapter
		if(this.props.payerAccount){	
			let instructions = new TransactionInstruction({
				keys: [
					{pubkey: gameAccount, isSigner: false, isWritable: true},
					{pubkey: this.props.payerAccount, isSigner: true, isWritable: false},
				],
				programId,
				data: Buffer.concat ([ Buffer.from([1]),Buffer.from([this.state.chosenCharacter]) ])
			});
			//wager
			let wagerIx;
			if(this.state.wager){
				wagerIx = await this.acceptWagerKeysIx(instructions);
				if(!wagerIx){
					this.props.setLoading(false);
					return;
				}			
			}
			//kor
			if(this.state.kor){
				instructions.keys.push( {pubkey: clock, isSigner: false, isWritable: false} );
				instructions.keys.push( {pubkey: gameWallet, isSigner: false, isWritable:true} );
				let feeInstruction = this.props.generateFeeInstruction(gameWallet,1/20);
				txid = await this.solletSign([feeInstruction,instructions],wagerIx);
			}
			else{
				txid = await this.solletSign([instructions],wagerIx);
			}	
		}
		else{
			//localaccount
			let instructions = new TransactionInstruction({
				keys: [
					{pubkey:gameAccount, isSigner: false, isWritable: true},
					{pubkey:this.props.localPayerAccount.publicKey, isSigner: true, isWritable: false},
				],
				programId,
				data: Buffer.concat ([ Buffer.from([1]),Buffer.from([this.state.chosenCharacter]) ])
			});
			//wager
			let wagerIx;
			if(this.state.wager){
				wagerIx= await this.acceptWagerKeysIx(instructions);
				if(!wagerIx){
					this.props.setLoading(false);
					return;
				}			
			}
			let _transaction = new Transaction();
			if(wagerIx){
				for(let i = 0;i < wagerIx.length;i++){
					_transaction.add(wagerIx[i]);
				}
			}
			//kor
			if(this.state.kor){
				instructions.keys.push( {pubkey: clock, isSigner: false, isWritable: false} );
				instructions.keys.push( {pubkey: gameWallet, isSigner: false, isWritable: true} );
				let feeInstruction = this.props.generateFeeInstruction(gameWallet,1/20);
				_transaction.add(feeInstruction);
			}
			//
			_transaction.add(instructions);	
			let { blockhash } = await this.props._connection.getRecentBlockhash("finalized");
			_transaction.recentBlockhash = blockhash;		
			_transaction.feePayer = this.props.localPayerAccount.publicKey;
			let signature = await this.props.localSign(Buffer.from(_transaction.serializeMessage()),this.props.localPayerAccount,_transaction);
			if(!signature){
				return this.props.notify("Signing Error","error");
			}
			_transaction.addSignature(this.props.localPayerAccount.publicKey,signature);		
			try{
				txid = await sendAndConfirmTransaction(
					'acceptChallenge',
					this.props._connection,
					_transaction,
					this.props.localPayerAccount,			
				);
				this.props.notify("Success:"+txid);
			}
			catch(e){
				console.warn(e);
				let canRecover = await this.props.recoverFromTimeout(e,0);
				if(!canRecover){
					this.props.notify(e.message,"error");
					this.props.setLoading(false);
					return;
				}	
			}
		}
		console.warn("challenge accpeted txid:",txid);
		this.props.setLoading(false);
		rpcSpeedTest();		
		if(txid){
			this.props.saveTransaction(txid,this.props.defaultNetwork,"Sol-Survivor").catch(console.warn);
			//Start Unity Game
			this.beginGame();
			//
		}
		return txid;
	}
	
	async acceptWagerKeysIx(obj){
		let wc = await this.getWagerInfo();
		let info = await wc.getFeePayerWagerTokenAccount(true);
		let exists = info[1];
		let creationIx = info[2];
		let wagerIx = [];
		if(!exists){ wagerIx.push(creationIx); }
		let amountToMint = wc.minimumBet / Math.pow(10,6);	
		let [ mintPositionIx,associateMintTokenAccountPublicKey ] = await wc.mintPx(2,amountToMint,true);
		for(let i = 0;i < mintPositionIx.length ;i++){ wagerIx.push(mintPositionIx[i]); }
		if(obj && obj.keys){			
			obj.keys.push( {pubkey: wc.contractAccount, isSigner: false, isWritable: true} );
			obj.keys.push( {pubkey: wc.mintAccounts[1], isSigner: false, isWritable: true} );
			obj.keys.push( {pubkey: associateMintTokenAccountPublicKey, isSigner: false, isWritable: true} );
		}
		return wagerIx;
	}

	addMintSigs(wc,_transaction){
		let message = Buffer.from(_transaction.serializeMessage());
		let privateKeyMint1 = new Uint8Array(wc.mintAccounts[0].secretKey);
		let privateKeyMint2 = new Uint8Array(wc.mintAccounts[1].secretKey);
		let privateKeyContractAccount = new Uint8Array(wc.contractAccount.secretKey);		
		let signatureMint1 = nacl.sign.detached(message,privateKeyMint1);
		let signatureMint2 = nacl.sign.detached(message,privateKeyMint2);
		let signatureContractAccount = nacl.sign.detached(message,privateKeyContractAccount);		
		_transaction.addSignature(wc.mintAccounts[0].publicKey,signatureMint1);
		_transaction.addSignature(wc.mintAccounts[1].publicKey,signatureMint2);	
		_transaction.addSignature(wc.contractAccount.publicKey,signatureContractAccount);	
	}
	
	beginGame(asKing=false){
		//When player 2 Accepts the challenge both players have full health
		//or Player 2 looking to rejoin the match
		if(!asKing){
			return this.setState({steps:2},()=>{ 
				return this.sendCharactersToUnity(this.state.player1Character,this.state.player2Character); 
			});
		}
		else if(asKing === true){
			if(this.state.player1Health !== this.state.player2Health){ this.setState({steps:1.3});}
			else if(this.state.player1Health > 0 && this.state.player2Health > 0){
				this.setState({steps:2});
				return this.sendCharactersToUnity(this.state.player1Character,this.state.player2Character);
			}
		}
	}

	chooseCharacter(x){
		return this.setState({chosenCharacter:x},()=>{
			if(this.state.steps === 1.1){
				if(this.state.wager === true){this.wagerStart();}
				else{this.createChallenge();}
			}
			else if(this.state.steps === 1.2){
				return this.setState({player2Character:x},this.acceptChallenge);
			}
			return;
		});
	}

	async commit(action){
		this.props.setLoading(true);
		let programId;
		let gameAccount;
		if(this.state.wager){ 
			gameAccount = new PublicKey(this.props.WAGER_GAME_ACCOUNT);
			programId = new PublicKey(this.props.WAGER_GAME_ID); 
		}
		else if(this.state.classic){ 
			gameAccount = new PublicKey(this.props.GAME_ACCOUNT)
			programId = new PublicKey(this.props.GAME_ID); 
		}
		else if(this.state.kor){ 
			gameAccount = new PublicKey(this.props.KOR_ACCOUNT)
			programId = new PublicKey(this.props.KOR_ID); 
		}
		let txid;
		//Craft action
		let random = Math.random().toString().slice(0,10);
		let r = ""
		let act = { "rock":"0","paper":"1","scissors":"2" }
		for(let i = 0;i < random.length;i++){
			if(i === 5){r += act[action];}
			else{r += random[i]}
		}
		random = r;
		let random_s = sdbm(random);
		let _myCommit = Buffer.allocUnsafe(4);
		this.setState({myCommit:random});
		_myCommit.writeUInt32BE(random_s);
		//sollet adapter
		if(this.props.payerAccount){	
			let instruction = new TransactionInstruction({
				keys: [
					{pubkey: gameAccount, isSigner: false, isWritable: true},
					{pubkey: this.props.payerAccount, isSigner: true, isWritable: false},
				],
				programId,
				data: Buffer.concat([ Buffer.from([2]),_myCommit])
			});
			txid = await this.solletSign([instruction]);
		}
		else{
			//localaccount
			let instruction = new TransactionInstruction({
				keys: [
					{pubkey: gameAccount, isSigner: false, isWritable: true},
					{pubkey:this.props.localPayerAccount.publicKey, isSigner: true, isWritable: false},
				],
				programId,
				data: Buffer.concat([ Buffer.from([2]),_myCommit ])
			});
			let _transaction =  new Transaction().add(instruction);	
			let { blockhash } = await this.props._connection.getRecentBlockhash("finalized");
			_transaction.recentBlockhash = blockhash;				
			_transaction.feePayer = this.props.localPayerAccount.publicKey;
			let signature = await this.props.localSign(Buffer.from(_transaction.serializeMessage()),this.props.localPayerAccount,_transaction);
			if(!signature){
				return this.props.notify("Signing Error","error");
			}
			_transaction.addSignature(this.props.localPayerAccount.publicKey,signature);		
			try{
				txid = await sendAndConfirmTransaction(
					'commit',
					this.props._connection,
					_transaction,
					this.props.localPayerAccount,
				);
				this.props.notify("Success:"+txid);
			}
			catch(e){
				console.warn(e);
				let canRecover = await this.props.recoverFromTimeout(e,0);
				if(!canRecover){
					this.props.notify(e.message,"error");
					this.props.setLoading(false);
					return;
				}	
			}
		}

		this.props.setLoading(false);
		this.props.saveTransaction(txid,this.props.defaultNetwork,"Sol-Survivor").catch(console.warn);
		rpcSpeedTest();
		return txid;
	}
		
	componentDidMount(){
		document.title = "survivor(alpha)";
		this.playMusic().catch(console.warn);
		this.gameSetup();
	}

	countDownTimer(){
		return setTimeout(()=>{
			let now = new Date().getTime();
			if(this.state.moveTimer[0]){
				let timeout = ( this.state.moveTimerExpiration - now )/1000 ;
				if( timeout > 0){
					this.setState({moveTimeoutValue:timeout});
				}
			}
			if(this.state.gameStart){
				let timeLimit = ((this.state.gameStart+(180*1000)) - now)/1000;
				this.setState({timeLimit});
			}
			//todo use ref in App.js
			//monitor wallet change
			this.onWalletUpdate();
			//
			return this.countDownTimer();
		},1000);
	}
	
	async crankIt(){
		this.props.setLoading(true);
		let programId;
		let gameAccount;
		if(this.state.wager){ 
			gameAccount = new PublicKey(this.props.WAGER_GAME_ACCOUNT);
			programId = new PublicKey(this.props.WAGER_GAME_ID); 
		}
		else if(this.state.classic){ 
			gameAccount = new PublicKey(this.props.GAME_ACCOUNT)
			programId = new PublicKey(this.props.GAME_ID); 
		}
		else if(this.state.kor){ 
			gameAccount = new PublicKey(this.props.KOR_ACCOUNT)
			programId = new PublicKey(this.props.KOR_ID); 
		}
		let txid;

		let clock = new PublicKey("SysvarC1ock11111111111111111111111111111111");
		//sollet adapter
		if(this.props.payerAccount){	
			let instruction = new TransactionInstruction({
				keys: [
					{pubkey: gameAccount, isSigner: false, isWritable: true},
					{pubkey: clock, isSigner: false, isWritable: false},	
					{pubkey: clock, isSigner: false, isWritable: false},	
				],
				programId,
				data: Buffer.from([4])
			});
			txid = await this.solletSign([instruction]);
		}
		else{
			//localaccount
			let instruction = new TransactionInstruction({
				keys: [
					{pubkey: gameAccount, isSigner: false, isWritable: true},
					{pubkey: clock, isSigner: false, isWritable: false},	
					{pubkey: clock, isSigner: false, isWritable: false},					],
				programId,
				data: Buffer.from([4])
			});
			let _transaction =  new Transaction().add(instruction);	
			let { blockhash } = await this.props._connection.getRecentBlockhash("finalized");
			_transaction.recentBlockhash = blockhash;				
			_transaction.feePayer = this.props.localPayerAccount.publicKey;
			let signature = await this.props.localSign(Buffer.from(_transaction.serializeMessage()),this.props.localPayerAccount,_transaction);
			if(!signature){
				return this.props.notify("Signing Error","error");
			}
			_transaction.addSignature(this.props.localPayerAccount.publicKey,signature);		
			try{
				txid = await sendAndConfirmTransaction(
					'commit',
					this.props._connection,
					_transaction,
					this.props.localPayerAccount,
				);
				this.props.notify("Success:"+txid);				
			}
			catch(e){
				console.warn(e);
				let canRecover = await this.props.recoverFromTimeout(e,0);
				if(!canRecover){
					this.props.notify(e.message,"error");
					this.props.setLoading(false);
					return;
				}	
			}
		}

		this.props.setLoading(false);
		this.props.saveTransaction(txid,this.props.defaultNetwork,"Sol-Survivor").catch(console.warn);
		rpcSpeedTest();
		return txid;
	}	
	
	async createChallenge(wgpk){
		if(!this.props.payerAccount && !this.props.localPayerAccount){
			return alert("Please Log In!");
		}
		this.setState({gameStart:false});
		this.props.setLoading(true);
		this.playMusic().catch(console.warn);
		let programId;
		let gameAccount;
		let gameWallet;
		if(this.state.wager){ 
			gameAccount = new PublicKey(this.props.WAGER_GAME_ACCOUNT);
			programId = new PublicKey(this.props.WAGER_GAME_ID); 
		}
		else if(this.state.classic){ 
			gameAccount = new PublicKey(this.props.GAME_ACCOUNT);
			programId = new PublicKey(this.props.GAME_ID); 
		}
		else if(this.state.kor){ 
			gameAccount = new PublicKey(this.props.KOR_ACCOUNT);
			gameWallet = new PublicKey(this.props.KOR_WALLET); 
			programId = new PublicKey(this.props.KOR_ID); 
		}
		let clock = new PublicKey("SysvarC1ock11111111111111111111111111111111");
		let txid;
		//sollet adapter
		if(this.props.payerAccount){	
			let instruction = new TransactionInstruction({
				keys: [
					{pubkey: gameAccount, isSigner: false, isWritable: true},
					{pubkey: this.props.payerAccount, isSigner: true, isWritable: false},
					{pubkey: clock, isSigner: false, isWritable: false},					
				],
				programId,
				data: Buffer.concat ([ Buffer.from([0]),Buffer.from([this.state.chosenCharacter]) ])
			});
			if(this.state.wager){ instruction.keys.push( {pubkey: wgpk, isSigner: false, isWritable: false} ); }
			else if(this.state.kor){
				instruction.keys.push( {pubkey: gameWallet, isSigner: false, isWritable: true} );
			}
			else{
				//Dummy Account (We allow anyone to join)
				instruction.keys.push( {pubkey: clock, isSigner: false, isWritable: false} );
				//
			}
			if(this.state.kor){
				let feeInstruction = this.props.generateFeeInstruction(gameWallet,1/20);
				txid = await this.solletSign([feeInstruction,instruction]);
			}
			else{
				txid = await this.solletSign([instruction]);
			}
		}
		else{
			//local account
			let instruction = new TransactionInstruction({
				keys: [
					{pubkey: gameAccount, isSigner: false, isWritable: true},
					{pubkey: this.props.localPayerAccount.publicKey, isSigner: true, isWritable: false},
					{pubkey: clock, isSigner: false, isWritable: false},
				],
				programId,
				data: Buffer.concat ([ Buffer.from([0]),Buffer.from([this.state.chosenCharacter]),Buffer.from([0]) ])
			});
			if(this.state.wager){ instruction.keys.push( {pubkey: wgpk, isSigner: false, isWritable: false} ); }
			else if(this.state.kor){
				instruction.keys.push( {pubkey: gameWallet,isSigner: false, isWritable: true} );
			}
			else{
				//Dummy Account (We allow anyone to join)
				instruction.keys.push( {pubkey: clock, isSigner: false, isWritable: false} );
				//
			}
			let _transaction =  new Transaction();
			if(this.state.kor){
				let feeInstruction = this.props.generateFeeInstruction(gameWallet,1/20);
				_transaction.add(feeInstruction);
			}
			_transaction.add(instruction);	
			let { blockhash } = await this.props._connection.getRecentBlockhash("finalized");
			_transaction.recentBlockhash = blockhash;	
			_transaction.feePayer = this.props.localPayerAccount.publicKey;
			let signature = await this.props.localSign(Buffer.from(_transaction.serializeMessage()),this.props.localPayerAccount,_transaction);
			if(!signature){
				return this.props.notify("Signing Error","error");
			}
			_transaction.addSignature(this.props.localPayerAccount.publicKey,signature);	
			try{	
				txid = await sendAndConfirmTransaction(
					'createChallenge',
					this.props._connection,
					_transaction,
					this.props.localPayerAccount,			
				);
				let status = ( await this.props._connection.confirmTransaction(txid) ).value;
				console.log("createChallenge txid",txid,status);
				if(status.err){
					this.props.notify("Wager TX Error","error");
				}
				else{
					this.props.notify("Success:"+txid);
				}
			}
			catch(e){
				console.warn(e);
				let canRecover = await this.props.recoverFromTimeout(e,0);
				if(!canRecover){
					this.props.notify(e.message,"error");
					this.props.setLoading(false);
					return;
				}				
			}
		}
		this.props.setLoading(false);
		this.setState({steps:1.3})
		this.props.saveTransaction(txid,this.props.defaultNetwork,"Sol-Survivor").catch(console.warn);		
		rpcSpeedTest();
		return txid;
	}
	
	gameSetup(){
		react_game_channel.onmessage = (ev)=> { 
			if(ev && ev.data){
				rpcSpeedTest(true);
				return this.parseState(ev.data[0]).catch(console.warn);
			}
			else{
				//Network Change
				console.warn("network changed");
				this.setState({gameStart:false},()=>{
					this.getAccountInfo()
					.then(this.subscribeToGame)
					.catch(console.warn);
				});
			}
		}
		//Enable timer
		this.countDownTimer();
		//Get Game data
		return this.getAccountInfo()
		.then(this.subscribeToGame)
		.then(()=>{
			this.setState({initialLoadingCompleted:true});
		})
		.catch(console.warn)
			
	}
	
	getAccountInfo(){
		let account;
		if(this.state.wager){ account = this.props.WAGER_GAME_ACCOUNT; }
		else if(this.state.classic){ account = this.props.GAME_ACCOUNT; }
		else if(this.state.kor){ account = this.props.KOR_ACCOUNT; }
		return this.props._connection.getAccountInfo( new PublicKey(account),"confirmed" )
		.then((resp)=>{
			if(!resp || !resp.data){
				return console.error("Unable to get account data");
			}
			let data = new Buffer(resp.data).toString("base64");
			this.parseState(data);
		})
		.then(()=>{
			//We only need to do this once
			return this.props._connection.getAccountInfo( new PublicKey("SysvarC1ock11111111111111111111111111111111") )
			.then((resp)=>{
				Drift = 0;
				if(!resp.data){return}
				let data = new Buffer(resp.data).toString("base64");
				data = atob(data);
				let time = this.props.stringToBytes(data);
				time = get64BitTime(time.slice(32));
				Drift = new Date().getTime() - time.getTime();
			})
			.catch(console.warn);
		})
		.catch(console.warn);
	}
		
	haveToken(mintAddress,isPrintTokenMint=false){
		//slow down requests to rpc server
		return new Promise(async(resolve,reject)=>{
			let hasCharacter = false;
			if(this.props.payerAccount || this.props.localPayerAccount){
				if(await TokenBalance(this.props,mintAddress,isPrintTokenMint)){hasCharacter = true;}
			}
			setTimeout(()=>{resolve(hasCharacter);},400);
		});
	}
	
	async getWagerInfo(address){
		if(!address && this.state.wagerContractAddress){address = this.state.wagerContractAddress;}
		let wc = await this.props.getContractInformation(address);
		this.setState({bet:wc});
		return wc;
	}	
	
	async muteMusic(mute){
		let audio = document.getElementById("backgroundMusic");
		if(!audio.muted || mute){ 
			audio.muted = true;
			this.setState({muted:audio.muted});
		}
		else{
			audio.muted = false;
			await audio.play();
			this.setState({muted:audio.muted});
		}
		return;
	}
	
	onWalletUpdate(){
		if(!this.props.payerAccount){return;}
		let isPlayer1 = false;
		let isPlayer2 = false;
		if(this.state.player1 === this.props.payerAccount.toBase58()){ isPlayer1 = true; }
		if(this.state.player2 === this.props.payerAccount.toBase58()){ isPlayer2 = true; }
		if( (isPlayer1 && !this.state.isPlayer1) || (isPlayer2 && !this.state.isPlayer2)){
			this.setState({isPlayer1,isPlayer2});			
		}	
		return;
	}
	
	parseState(data){
		return new Promise((resolve,reject)=>{
			data = atob(data);
			let dataInfo = BufferLayout.struct([
				BufferLayout.u8(data.slice(0,1)), //game status
				BufferLayout.u8(data.slice(1,33)), //player1
				BufferLayout.u8(data.slice(33,65)), //player2
				BufferLayout.u8(data.slice(65,66)), //player 1 commit bool
				BufferLayout.u8(data.slice(66,67)), //player 1 reveal bool
				BufferLayout.u32(data.slice(67,71)), //player 1 commit		 
				BufferLayout.u8(data.slice(71,72)), //player 2 commit bool
				BufferLayout.u8(data.slice(72,73)), //player 2 reveal bool
				BufferLayout.u32(data.slice(73,77)), //player 2 commit	
				BufferLayout.u8(data.slice(77,78)), //player 1 character	
				BufferLayout.u8(data.slice(78,79)), //player 1 reveal is honest bool
				BufferLayout.cstr(data.slice(79,89)), //player 1 reveal
				BufferLayout.u8(data.slice(89,90)), //player 2 character
				BufferLayout.u8(data.slice(90,91)), //player 2 reveal is honest bool
				BufferLayout.cstr(data.slice(91,101)), //player 2 reveal	 
				BufferLayout.nu64(data.slice(102,110)), //Timer 
				BufferLayout.u8(data.slice(110,111)), //p1 health 
				BufferLayout.u8(data.slice(111,112)), //p1 super
				BufferLayout.u8(data.slice(112,113)), //p2 health
				BufferLayout.u8(data.slice(113,114)), //p2 super
				BufferLayout.u8(data.slice(114,115)), // P1 Last Move 1,2,3		
				BufferLayout.u8(data.slice(115,116)), // P2 Last Move 1,2,3	
				BufferLayout.u8(data.slice(116,117)), // Winner 1,2,3	
				BufferLayout.u8(data.slice(117,125)), // Game Start   
				BufferLayout.u8(data.slice(125,157)) // Wager Address // Absolute start time
			]);
			//console.log(dataInfo);
			let state = [];
			dataInfo.fields.map((item,ind)=>{ return state.push(Buffer.from(item.property)); });
			console.log(state);
			this.setState({
				gameStatus:state[0][0],
				player1:state[1],
				player2:state[2],
				player1DidCommit:state[3][0],
				player1DidReveal:state[4][0],
				player1Commit:state[5],
				player2DidCommit:state[6][0],
				player2DidReveal:state[7][0],
				player2Commit:state[8],
				player1Character:state[9][0],
				player1HonestReveal:state[10][0],
				player1Reveal:state[11],
				player2Character:state[12][0],
				player2HonestReveal:state[13][0],
				player2Reveal:state[14],	
				moveTimer:state[15],				
				player1Health:state[16][0],
				player1Super:state[17][0],
				player2Health:state[18][0],
				player2Super:state[19][0],
				player1LastMove:state[20][0],
				player2LastMove:state[21][0],
				winner:state[22][0],
				gameStart:state[23],
				wagerGame:state[24]
			},()=>{this.translateGameState(state,dataInfo,data)});
		});
	}
	
	async playMusic(){
		if(!this.state.backroundMusic && this.props.enableMusic){
			this.setState({backgroundMusic:"./Sounds/2020-07-05_-_Dragon_Boss_Fight_-_David_Fesliyan.mp3"});
			let audio = document.getElementById("backgroundMusic");
			return await audio.play();
		}
	}
	
	async reveal(){
		this.props.setLoading(true);
		let gameAccount;
		let programId;
		if(this.state.wager){ 
			gameAccount = new PublicKey(this.props.WAGER_GAME_ACCOUNT);
			programId = new PublicKey(this.props.WAGER_GAME_ID); 
		}
		else if(this.state.classic){ 
			gameAccount = new PublicKey(this.props.GAME_ACCOUNT)
			programId = new PublicKey(this.props.GAME_ID); 
		}
		else if(this.state.kor){ 
			gameAccount = new PublicKey(this.props.KOR_ACCOUNT)
			programId = new PublicKey(this.props.KOR_ID); 
		}
		let clock = new PublicKey("SysvarC1ock11111111111111111111111111111111");
		let wagerHooks = [];
		let txid;
		let random = Math.random().toString().slice(0,10);
		if(!this.state.myCommit){
			console.log("lost commitment.using random reveal:",random,Buffer.from(random));
			this.setState({myCommit:random});
		}
		////Add Wager Accounts to allow wager hook to be called//////
		if(this.state.wager){
			let wc = await this.getWagerInfo();
			let [ ca_signer ] = await wc.getContractAuth(false, new PublicKey(this.props.WAGER_GAME_ID) );
			wagerHooks = [
				{pubkey: wc.contractAccount, isSigner: false, isWritable: true},
				{pubkey:ca_signer, isSigner: false, isWritable: false},
				{pubkey:new PublicKey(this.props.BET_PROGRAM_ID), isSigner: false, isWritable: false},
			]
		}
		const addKeys = (obj)=>{
			if(obj && obj.keys){
				obj.keys.push(wagerHooks[0]);
				obj.keys.push(wagerHooks[1]);
				obj.keys.push(wagerHooks[2]);
			}
		}
		//////////
		//sollet adapter
		if(this.props.payerAccount){	
			let instruction = new TransactionInstruction({
				keys: [
					{pubkey: gameAccount, isSigner: false, isWritable: true},
					{pubkey: this.props.payerAccount, isSigner: true, isWritable: false},
					{pubkey:clock, isSigner: false, isWritable: false}
				],
				programId,
				data: Buffer.concat([ Buffer.from([3]), Buffer.from(this.state.myCommit) ])
			});
			//wager keys
			if(this.state.wager){addKeys(instruction);}
			//
			txid = await this.solletSign([instruction]);
		}
		else{
			//localaccount
			let instruction = new TransactionInstruction({
				keys: [
					{pubkey:gameAccount, isSigner: false, isWritable: true},
					{pubkey:this.props.localPayerAccount.publicKey, isSigner: true, isWritable: false},
					{pubkey:clock, isSigner: false, isWritable: false}
				],
				programId,
				data: Buffer.concat([ Buffer.from([3]), Buffer.from(this.state.myCommit) ])
			});
			//wager hooks
			if(this.state.wager){addKeys(instruction);}
			//
			let _transaction =  new Transaction().add(instruction);	
			let { blockhash } = await this.props._connection.getRecentBlockhash("finalized");
			_transaction.recentBlockhash = blockhash;				
			_transaction.feePayer = this.props.localPayerAccount.publicKey;
			let signature = await this.props.localSign(Buffer.from(_transaction.serializeMessage()),this.props.localPayerAccount,_transaction);
			if(!signature){
				return this.props.notify("Signing Error","error");
			}
			_transaction.addSignature(this.props.localPayerAccount.publicKey,signature);		
			try{
				txid = await sendAndConfirmTransaction(
					'reveal',
					this.props._connection,
					_transaction,
					this.props.localPayerAccount,
				);
				this.props.notify("Success:"+txid);				
				console.log("reveal txid",txid);
			}
			catch(e){
				console.warn(e);
				let canRecover = await this.props.recoverFromTimeout(e,0);
				if(!canRecover){
					this.props.notify(e.message,"error");
					this.props.setLoading(false);
					return;
				}	
			}
		}
		this.props.setLoading(false);
		rpcSpeedTest();		
		this.props.saveTransaction(txid,this.props.defaultNetwork,"Sol-Survivor").catch(console.warn);
		return txid;
	}
	
	returnToMenu(){
		return setTimeout(()=>{
			if(!this.state.kor || (!this.state.isPlayer1 && !this.state.isPlayer2) ){ this.setState({steps:0}); }
			else if(this.state.kor){
				if(this.state.isPlayer1){
					this.setState({steps:1.3,p1Action:"idle",p2Action:"idle"});
				}
				else if(this.state.isPlayer2){this.setState({steps:1.2,p1Action:"idle",p2Action:"idle"});}
			}
			return;
		},6000);
	}
	
	sendCharactersToUnity(p1,p2){
		return setTimeout(()=>{
			if(unityReady){
				console.warn("...selecting characters...",p1,p2);
				port1.postMessage("select"+p1);
				setTimeout(()=>port1.postMessage("select"+p2),800);
			}
			else{
				console.warn("...wait to select characters...",unityReady);
				setTimeout(()=>{ return this.sendCharactersToUnity(p1,p2); },1000);
			}
			return;
		},1000);
		
	}
	
	async solletSign(instructionList,wagerIx=false){
		let transaction =  new Transaction();
		let txid = false;
		if(wagerIx){
			for(let i = 0;i < wagerIx.length;i++){
				transaction.add(wagerIx[i]);
			}
		}
		for(let i = 0;i < instructionList.length;i++){
			transaction.add(instructionList[i]);
		}	
		try{ 
			let { blockhash } = await this.props.connection.getRecentBlockhash("finalized");
			transaction.recentBlockhash = blockhash;		
			transaction.feePayer = this.props.payerAccount;
			let signed = await this.props.wallet.signTransaction(transaction);
			txid =  await this.props.connection.sendRawTransaction(signed.serialize());
			await this.props.connection.confirmTransaction(txid);
			this.props.notify("Success:"+txid,"success");
		}
		catch(e){
			let canRecover = await this.props.recoverFromTimeout(e,0);
			if(!canRecover){
				this.props.notify(e.message,"error");
				this.props.setLoading(false);
				return false;
			}
		}
		return txid
	}
	
	subscribeToGame(){
		if(!this.props.ws){
			console.warn("websocket not ready");
			setTimeout(this.subscribeToGame,2500);
			return;
		}
		let message = {
			"jsonrpc":"2.0", 
			"id":909, 
			"method":"accountSubscribe",
			"params":[]
		}
		if(this.state.classic){
			message.params = [this.props.GAME_ACCOUNT,{"encoding":"jsonParsed","commitment":"processed"} ]; 
			this.props.ws.send(JSON.stringify(message));	
			//unsubscribe from other accounts
			message.method = "accountUnsubscribe";	
			message.params = [910,911];
			this.props.ws.send(JSON.stringify(message));	
		}
		else if(this.state.wager){
			message.id = 910;
			message.params = [this.props.WAGER_GAME_ACCOUNT,{"encoding":"jsonParsed","commitment":"processed"} ]; 
			this.props.ws.send(JSON.stringify(message));
			message.method = "accountUnsubscribe";	
			message.params = [909,911];
			this.props.ws.send(JSON.stringify(message));				
		}
		else if(this.state.kor){
			message.id = 911;
			message.params = [this.props.KOR_ACCOUNT,{"encoding":"jsonParsed","commitment":"processed"} ]; 
			this.props.ws.send(JSON.stringify(message));
			message.method = "accountUnsubscribe";	
			message.params = [909,910];
			this.props.ws.send(JSON.stringify(message));	
		}
		return;	
	}
	
	timeGame(data,retry=0){
		return new Promise((resolve,reject)=>{
			if(Drift === 0 && retry < 2){
				return resolve( setTimeout(()=>{return this.timeGame(data,++retry)},1000) );
			}
			let gameStart = data.slice(117,125);
			let startDate = get64BitTime(this.props.stringToBytes(gameStart));
			this.setState({gameStart:startDate.getTime()},resolve);
			console.warn("game started @ ",startDate,"Drift",Drift);
			if(this.state.kor){
				gameStart = data.slice(125,133);
				startDate = get64BitTime(this.props.stringToBytes(gameStart));
				this.setState({tournamentStart:startDate.getTime()},resolve);
				console.warn("tournament started @ ",startDate,"Drift",Drift);
			}
		})
	}
	
	translateGameState(state,dataInfo,data){
		//Todo: cut down on uneccessary condtions
		let actions = ["Reversal","Punch","Strike","","idle"];
		let gameMessage = "";
		if(
			//Game Setup
			( (!this.state.kor && state[0][0] === 2) || (this.state.kor && state[0][0] === 1)) &&
			//Commits
			state[3][0] === 0  && state[4][0] === 0  &&
			state[6][0] === 0  && state[7][0] === 0  &&
			//Reveals
			state[9][0] === 0  && state[11][0] === 0 &&
			//Time has started
			state[15][1] > 0
		){
			if(this.state.steps === 2){
				if(state[16][0] === 0 && state[18][0] > 0 ){ 
					gameMessage = "p2"+ actions[state[21][0]].toLowerCase()[0];
					//Forced Game Close
					if(this.state.kor && gameMessage === "p2i"){gameMessage = "p2p";}
					if(port1){port1.postMessage(gameMessage);}
					this.returnToMenu();
				}
				else if(state[16][0] > 0 && state[18][0] === 0 ){ 
					gameMessage = "p1"+ actions[state[20][0]].toLowerCase()[0];
					//Force Game Close
					if(this.state.kor && gameMessage === "p1i"){gameMessage = "p1p";}
					if(port1){port1.postMessage(gameMessage);}
					this.returnToMenu();
				}
				else if(state[16][0] === 0 && state[18][0] === 0 ){ 
					//This ensures a double ko
					if(port1){port1.postMessage("dko");}
					this.returnToMenu();
				}
				else if (state[22][0] === 1){
					//p2 dishonest commit
					gameMessage = "p1"+ actions[state[20][0]].toLowerCase()[0];
					if(port1){port1.postMessage(gameMessage);} 
					this.returnToMenu();
				}
				else if (state[22][0] === 2){
					//p1 dishonest commit
					gameMessage = "p2"+ actions[state[21][0]].toLowerCase()[0];
					if(port1){port1.postMessage(gameMessage);}
					this.returnToMenu();
				}
				else if (state[22][0] === 3){
					//draw
					if(port1){port1.postMessage("dko");}
					this.returnToMenu();
				}					
				this.setState({
					p1Action:actions[state[20][0]],
					p2Action:actions[state[21][0]]
				});
			}
		}
		else{
			if(state[16][0] > 0 && state[18][0] === 0 && state[0][0] === 1 && state[22][0] === 1){
				//Force End P1 Wins
				console.log("forced end p1 wins?");
				gameMessage = "p1p";
				if(port1){port1.postMessage(gameMessage);}
				this.returnToMenu();
				return;
			}
			if(state[16][0] === 0 && state[18][0] > 0 && state[0][0] === 1 && state[22][0] === 2){
				//Force End P2 Wins
				console.log("forced end p2 wins?");
				gameMessage = "p2p";
				if(port1){port1.postMessage(gameMessage);}
				this.returnToMenu();
				return;
			}
			if(state[16][0] === 0 && state[18][0] === 0 && state[0][0] === 3){
				//Force End P2 Wins
				console.log("forced end draw wins?");
				if(port1){port1.postMessage("dko");}
				this.returnToMenu();
				return;
			}
		}
		let player1;
		let player2;
		let newState = {};
		if(state[1][0] > 1){
			let p1 = dataInfo.fields[1].property;
			player1 = bs58.encode(this.props.stringToBytes(p1));
			newState.player1 = player1;
		}
		if(state[2][0] > 1){
			let p2 = dataInfo.fields[2].property;
			player2 = bs58.encode(this.props.stringToBytes(p2));
			//Move to step2 for player1
			if(this.state.steps === 1.3 && player2.toString("hex") !== "0000000000000000000000000000000000000000000000000000000000000000"){
				newState.steps = 2;
			}
			newState.player2 = player2;
		}
		if(!this.state.isPlayer1){
			if(player1){
				let p1 = 0;
				if(this.props.localPayerAccount && this.props.localPayerAccount.publicKey.toBase58() === player1){ p1++; }
				if(this.props.payerAccount && this.props.payerAccount.toBase58() === player1){ p1++; }
				if(p1){
					newState.isPlayer1 = true; 
					newState.isPlayer2 = false;
				}
			}
		}
		if(!this.state.isPlayer2){
			if(player2){
				let p2 = 0;
				if(this.props.localPayerAccount && this.props.localPayerAccount.publicKey.toBase58() === player2){ p2++; }
				if(this.props.payerAccount && this.props.payerAccount.toBase58() === player2){ p2++ }
				if(p2){ 
					newState.isPlayer2 = true; 
					newState.isPlayer1 = false;
				}
			}
		}
		try{ 
			console.warn(newState.player1.toString(),this.state.player1Character,"vs",newState.player2.toString("hex"),this.state.player2Character); 
		}
		catch(e){}
		//Move Time
		if(state[15][0] > 0 && this.state.moveTimer !== -1){
			newState.moveTimer = state[15];
			if(this.state.moveTimerExpiration < 0){
				let expire = (new Date().getTime()+30000);	
				newState.moveTimerExpiration = expire;
			}
		}
		else{
			newState.moveTimer = -1;
			newState.moveTimerExpiration = -1;
			newState.moveTimeoutValue = 30;
		}
		//Game Time
		this.timeGame(data).catch(console.warn);
		if(this.state.loadingAccountData === true){ newState.loadingAccountData = false; }
		//Wager
		if( this.state.wager && state[24] && state[24][0] > 1){
			let wagerContractAddress = dataInfo.fields[24].property;
			wagerContractAddress = bs58.encode(this.props.stringToBytes(wagerContractAddress));
			this.updateWagerList(wagerContractAddress)
			newState.wagerContractAddress = wagerContractAddress;
		}
		//Update State
		if(this.state.steps === 1.3 && newState.steps === 2){
			this.sendCharactersToUnity(this.state.player1Character,this.state.player2Character);
		}
		if(this.state.wager){
			this.setState(newState,()=>{ 
				return this.getWagerInfo(newState.wagerContractAddress); 				
			})
		}
		else{
			this.setState(newState);
		}

	}
	
	updateSteps(steps){
		return this.setState({steps});
	}
	
	updateWagerAmount(evt){
		return this.setState({wagerAmount:evt.currentTarget.value});
	}
	
	updateWagerList(x){
		let wagers = this.state.wagers;
		if(wagers.indexOf(x) > -1){return}
		wagers.push(x);
		this.setState({wagers});
		window.localStorage.setItem("wagers",JSON.stringify(wagers));
	}
	
	updateWagerOption(mode){
		let obj = {wager:false,classic:false,kor:false,isPlayer1:false,isPlayer2:false}
		if(mode === "CLASSIC"){obj.classic = true}
		else if (mode === "WAGER"){obj.wager = true}
		else if(mode === "KING OF THE RING"){obj.kor = true;}
		return this.setState(obj,()=>{
			this.subscribeToGame();
			this.getAccountInfo();
		});
	}
	
	async wagerStart(){
		this.setState({bet:false,wagerContractAddress:""});
		let wagerAmount = this.state.wagerAmount;
		if(!Number(wagerAmount)){
			this.props.notify("Please Input A Valid Wager","error");
			return;
		}
		let allIx = [];
		this.props.setLoading(true);
		let three_minutes = (60 * 5);
		let feePayer = this.props.localPayerAccount ? this.props.localPayerAccount : this.props.payerAccount;
		let config = {
			connection:this.props._connection,
			endTime: three_minutes,
			fee:0,
			feeAccount:new PublicKey(),//A Dummy Account Because No Fees Are Charged
			feePayer,
			minimumBet: Number( wagerAmount ),
			oracleAccount: new PublicKey(this.props.WAGER_GAME_ID),//public key of the program/account to close the contract. if override > 0 this will automatically be converted to a PDA
			override:1,
			programId: new PublicKey(this.props.BET_PROGRAM_ID),
			potMint: new PublicKey(this.props.WAGER_TOKEN_MINT)
		}
		let wc = new WagerClient(config);
		let setupInfo = await wc.setupContract(true);
		let ixSetup = setupInfo[5];
		for(let i = 0;i < ixSetup.length ;i++){
			if(!ixSetup[i]){continue;}
			allIx.push(ixSetup[i]);
		}	
		////Mint Position ///////
		let info = await wc.getFeePayerWagerTokenAccount(true);
		let exists = info[1];
		let creationIx = info[2];
		if(!exists){allIx.push(creationIx);}
		let [ mintPositionIx ] = await wc.mintPx(1,wagerAmount,true);	
		allIx = allIx.concat(mintPositionIx);
		let _transaction =  new Transaction();
		let txid = "";
		for(let i = 0;i < allIx.length ;i++){
			_transaction.add(allIx[i]);
		}				

		if(this.props.payerAccount){	
			let { blockhash } = await this.props.connection.getRecentBlockhash("finalized");
			_transaction.recentBlockhash = blockhash;
			_transaction.setSigners(this.props.payerAccount);
			let signed = await this.props.wallet.signTransaction(_transaction);
			this.addMintSigs(wc,_transaction);
			try{ txid = await this.props.connection.sendRawTransaction(signed.serialize()); }
			catch(e){
				console.warn(e);
				let canRecover = await this.props.recoverFromTimeout(e,0);
				if(!canRecover){
					this.props.notify(e.message,"error");
					this.props.setLoading(false);
					return;
				}
			}
		}
		else{
			let { blockhash } = await this.props._connection.getRecentBlockhash("finalized");
			_transaction.recentBlockhash = blockhash;		
			_transaction.feePayer = this.props.localPayerAccount.publicKey;
			let signature = await this.props.localSign(Buffer.from(_transaction.serializeMessage()),this.props.localPayerAccount,_transaction);
			if(!signature){return this.props.notify("Signing Error","error");}
			_transaction.addSignature(this.props.localPayerAccount.publicKey,signature);	
			//sign for mint accounts
			this.addMintSigs(wc,_transaction);
			let signers = [ this.props.localPayerAccount,wc.mintAccounts[0],wc.mintAccounts[1],wc.contractAccount ];
			//	
			try{
				txid = await this.props._connection.sendTransaction(
					_transaction,
					signers,
					{
						skipPreflight:true,
					  commitment: 'finalized',
					  //preflightCommitment: 'finalized',  
					},
				  );
				let status = ( await this.props._connection.confirmTransaction(txid) ).value;
				if(status.err){
					console.log("Mint error",status.err,txid);
					this.props.notify("Wager Creation Error","error");
					this.props.setLoading(false);
					return;
				}
			}
			catch(e){
				console.warn(e);
				let canRecover = await this.props.recoverFromTimeout(e,0);
				if(!canRecover){
					this.props.notify(e.message,"error");
					this.props.setLoading(false);
					return;
				}
			}
		}
		this.props.saveTransaction(txid,this.props.defaultNetwork,"Sol-Survivor").catch(console.warn);		
		this.props.setLoading(false);
		this.setState({wager:true},()=>{ return this.createChallenge(wc.contractAccount.publicKey);});
	}
	
	toggleViewBet(){
		return this.setState({viewBet:!this.state.viewBet});
	}
	
	render(){
		return(<div className="stageHolder">		
			<div id="debug"> RPC Speed:{speed}s </div>
			{
				this.state.steps < 1 ?
				<div id="homeButtons">
					<button className="button-65" onClick={()=>this.updateWagerOption("CLASSIC")}> 
						<span className="text" style={{background:this.state.classic ? "none":""}} > CLASSIC </span>
					</button>
					<button className="button-65" onClick={()=>this.updateWagerOption("WAGER")}> 
						<span className="text" style={{background:this.state.wager ? "none":""}}> WAGER </span>
					</button>
					<button className="button-65" onClick={()=>this.updateWagerOption("KING OF THE RING")}> 
						<span className="text" style={{background:this.state.kor ? "none":""}}> KING OF THE RING </span>
					</button>
				</div>
				: null
			}		
			<WagerSwitch
				bet={this.state.bet}
				mode={this.state.classic ? "CLASSIC" : "KING OF THE RING"}
				close={this.toggleViewBet}
				closeWagerAccounts={this.props.closeWagerAccounts}
				getContractInformation={this.props.getContractInformation}
				redeemContract={this.props.redeemContract}
				wager={this.state.wager} 
				wagerContractAddress={this.state.wagerContractAddress}
				updateWagerOption={this.updateWagerOption}
				updateSteps={this.updateSteps} 
				viewBet={this.state.viewBet}
			/>	
			{ (!this.state.initialLoadingCompleted && this.state.timeLimit ===  -1) ?  <div className="mainStartButton"> <Button color="info" className="button-64"> LOADING PLEASE WAIT <br/> <LinearProgress/> </Button></div> : null }
			{
				(this.state.steps === 0  && this.state.kor === false && this.state.initialLoadingCompleted) ?
				<> 
					{
						(this.state.timeLimit < -1 || (this.state.player2Health < 1 || this.state.player1Health < 1 ) ) ?
						 <div className="mainStartButton"> 
							{ 
								this.state.wager ?
								<ButtonGroup className="classicDiv1">
									<Button color="info" className="button-64" onClick={()=>{this.setState({steps:1.1});}}> Player1 </Button>	
									<Button color="default" id="wagerInputButton">
										<b> Wager $</b><Input min={0} type="number" value={this.state.wagerAmount} id="wagerAmount" onChange={this.updateWagerAmount}/> / {this.props.usdtBalance.toFixed(2)} USDT
									</Button>
								</ButtonGroup>	
								:<Button color="info" className="button-64" onClick={()=>{this.setState({steps:1.1});}}> Player1 Press Start</Button>
							}
						 </div> : null
					}
					
					{
						(this.state.timeLimit > 0 &&  this.state.player1.toString("hex") !== "0000000000000000000000000000000000000000000000000000000000000000" && this.state.player2.toString("hex") === "0000000000000000000000000000000000000000000000000000000000000000" ) ?
						<div className="mainStartButton"> 
						<Button color="info" className="button-64" onClick={()=>{this.setState({steps:1.2});}}> 
							Player2 
							{ (this.state.wager && this.state.bet && this.state.bet.minimumBet) ? <b> Wager ${(this.state.bet.minimumBet / Math.pow(10,6))} USDT</b> : " Press Start "}
						</Button>  
						</div> 
						: null
					}
					
					{
						(this.state.timeLimit > 0 && (this.state.player2Health > 0 && this.state.player1Health > 0) && this.state.player2.toString("hex") !== "0000000000000000000000000000000000000000000000000000000000000000" )?
						<div className="mainStartButton"> 
							<Button color="danger" className="button-64">
								MATCH IN PROGRESS 
								Time Remaining: {this.state.timeLimit.toFixed(0)}s
							</Button>   
						 </div>					
						: null
					}
				</>
				:null
			}
			{
				(this.state.steps === 0 && this.state.kor === true && this.state.initialLoadingCompleted) ?
				<> 
					{
						(this.state.player1.toString("hex") === "0000000000000000000000000000000000000000000000000000000000000000") ?
						<div className="mainStartButton"> <Button color="info" className="button-64" onClick={()=>{this.setState({steps:1.1});}}> Start as King </Button> </div> : null
					}
					
					{
						(this.state.isPlayer1) ?
						<div className="mainStartButton"> <Button color="info" className="button-64" onClick={()=>{this.beginGame(true);}}>  Defend The Crown  </Button> </div> : null
					}
					
					{
						( this.state.isPlayer2 && (this.state.player2Health > 0 && this.state.player1Health > 0) ) ?
						<div className="mainStartButton"> <Button color="info" className="button-64" onClick={()=>this.beginGame(false)}>[CHALLENGER] Rejoin Match </Button> </div> : null
					}
					
					{
						(this.state.player1Health === 100 && this.state.player2Health === 100 &&
						!this.state.isPlayer1 && this.state.player1.toString("hex") !== "0000000000000000000000000000000000000000000000000000000000000000" &&
						!this.state.isPlayer2 && this.state.player2.toString("hex") !== "0000000000000000000000000000000000000000000000000000000000000000") ?
						<div className="mainStartButton"> <Button color="info" className="button-64" onClick={()=>this.beginGame(false)}>View Match </Button> </div> : null
					}	
					
					{
						(this.state.player1.toString("hex") !== "0000000000000000000000000000000000000000000000000000000000000000") &&(	( !this.state.isPlayer1 && (this.state.player1Health === 0 || this.state.player2Health === 0) ) 
						||  ( !this.state.isPlayer1 && this.state.player2.toString("hex") === "0000000000000000000000000000000000000000000000000000000000000000" ) ) ?
						<div className="mainStartButton"><Button color="info" className="button-64" onClick={()=>{this.setState({steps:1.2});}}> Challenge the King</Button> </div>: null
					}
				</>
				:null
			}
			{ (this.state.steps > 1 && this.state.steps < 2) ? 
				<CharacterSelect 
					classic={this.state.classic}
					chooseCharacter={this.chooseCharacter} 
					haveToken={this.haveToken}
					kor={this.state.kor}
					loggedIn={this.props.payerAccount}				
					player1Character={this.state.player1Character}
					updateSteps={this.updateSteps} 
					updateWagerOption={this.updateWagerOption}					
					steps={this.state.steps}
					wager={this.state.wager}
				/> 
				:null 
			}
			<Game
				commit={this.commit}
				crankIt={this.crankIt}
				isPlayer1={this.state.isPlayer1}
				isPlayer2={this.state.isPlayer2}
				kor={this.state.kor}
				moveTimeoutValue={this.state.moveTimeoutValue}
				player1={this.state.player1}
				player1DidCommit={this.state.player1DidCommit}
				player1Health={this.state.player1Health}
				player1HonestReveal={this.state.player1HonestReveal}
				p1Action={this.state.p1Action}
				player2={this.state.player2}
				player2DidCommit={this.state.player2DidCommit}
				player2Health={this.state.player2Health}
				player2HonestReveal={this.state.player2HonestReveal}
				p2Action={this.state.p2Action}
				reveal={this.reveal}
				steps={this.state.steps}
				survivorHelpOpen={this.props.survivorHelpOpen}
				toggleSurvivorHelpOpen={this.props.toggleSurvivorHelpOpen}
				timeLimit={this.state.timeLimit}
			 /> 
			<audio id="backgroundMusic" src={this.state.backgroundMusic} />
		</div>)
	}
}

class CharacterSelect extends React.Component{ 
	constructor(props){
		super(props);
		this.state = {
			characters:[],
			loadedCharacters:false,
		}
		this.loadAdditionalCharachers = this.loadAdditionalCharacters.bind(this);
		this.select = this.select.bind(this);
		this.updatePortrait = this.updatePortrait.bind(this);
	}
	
	componentDidMount(){
		let characters = [
			{Name:"Master Chef",Headshot:"./images/player_images/masterchef_small.png",Portrait:"./images/player_images/mc.apng", Mint:"",Index:0},
			{Name:"Assassin",Headshot:"./images/player_images/assassin_small.png",Portrait:"./images/player_images/assassin.apng",Mint:"",Index:1},
		]
		return this.setState({characters},this.loadAdditionalCharacters);
	}
	
	async loadAdditionalCharacters(){
		if(!this.props.loggedIn){return;}
		if(loadingCharactersBouncer > 2){ return; }
		loadingCharactersBouncer++;
		setTimeout(()=>{ loadingCharactersBouncer--; },1500);
		console.warn("LOADING ADDITIONAL CHARACTERS");
		let chars = this.state.characters.slice(0);
		//NakedShorts
		let jayBeezyPrintTokenMint = "GyTF8PoMBYivkba8shFyjhW3hcJvUPEDv3GHQU87yJiq";	
		let olgaPrintTokenMint = "4XhhS3n2ATMPzS5aWY658FsuPzmp4FiXF4rHuruQ4mdq";							
		let nakedShortsMint = "ss1gxEUiufJyumsXfGbEwFe6maraPmc53fqbnjbum15";
		let pohMint = "ss26ybWnrhSYbGBjDT9bEwRiyAVUgiKCbgAfFkksj4R";
		if( await this.props.haveToken(nakedShortsMint)){  
			chars.push({Name:"Naked Shorts",Headshot:"./images/player_images/nakedshorts_small.png",Portrait:"./images/player_images/nakedshorts.apng",Mint:"",Index:2});
		}
		if( await this.props.haveToken(pohMint)){  
			chars.push({Name:"POH",Headshot:"./images/player_images/poh_small.png",Portrait:"./images/player_images/poh.apng",Mint:"",Index:3});
		}
		if( await this.props.haveToken(jayBeezyPrintTokenMint,true)){  
			chars.push({Name:"Jay Beezy",Headshot:"./images/player_images/jaybeezy_small.png",Portrait:"./images/player_images/jaybeezy.apng",Mint:"",Index:4});
		}	
		if( await this.props.haveToken(olgaPrintTokenMint,true)){  
			chars.push({Name:"Olga",Headshot:"./images/player_images/olga_small.png",Portrait:"./images/player_images/olga.apng",Mint:"",Index:5});
		}		
		for(let i = 0;i < 3;i++){
			chars.push({Name:"?",Headshot:"./images/player_images/unknown.png",Mint:"",Index:0})
		}
		return this.setState({characters:chars,loadedCharacters:true});
	}
	
	select(char){
		this.props.chooseCharacter(char.Index);
		let ele = document.getElementById("char"+char.Index);
		if(ele){
			ele.setAttribute("style","border:0.2em solid red");
			this.updatePortrait = function(){}
		}
		return;
	}
	
	updatePortrait(char){
		if(!char || !char.Portrait){return}
		let player = this.props.steps.toString()[2]
		try{
			document.getElementById(`player${player}Portrait`).src = char.Portrait;
			document.getElementById("cssEffect").play().catch(console.warn);
		}
		catch(e){console.log(e);}
	}
	
	render(){
		if(!this.state.loadedCharacters && this.props.loggedIn){this.loadAdditionalCharacters().catch(console.warn);}
		return (<div className="characterSelect">
			<div id="homeButton">
				<button className="button-65" onClick={()=>this.props.updateSteps(0)}> 
					<span className="text" style={{background:"none"}}> Main Menu </span>
				</button>
			</div>			
			<div className="characterSelectRow">
				{ 
					this.state.characters.map((char,ind)=>(
						<div key={ind} onMouseOver={()=>{this.updatePortrait(char)}} onClick={()=>{this.select(char)}}> 
							<button className="button-64" ><span className="text"> {char.Name} </span></button>
						</div>
					))
				}
			</div>
			{
				this.state.characters.length > 0 ?
					<div id="playerPortraitHolder">
						{
							this.props.steps !== 1.2 ?
							<img id="player1Portrait" src={this.state.characters[0].Portrait} alt="player1Portrait" /> 
							:<img id="player1Portrait" src={this.state.characters[this.props.player1Character]? this.state.characters[this.props.player1Character].Portrait : ""} alt="player1Portrait" /> 
						}
						{
							this.props.steps !== 1.2? 
							<Button color="info" className="player2Waiting"> WAITING FOR PLAYER2 <br/> <LinearProgress/> </Button>
							:<img id="player2Portrait" src={this.state.characters[1].Portrait}  alt="player2Portrait"/>
						}
						<div className="selectFloor1" alt="floor"></div>
						<div className="selectFloor2" alt="floor"></div>
					</div>
				: null
			}
			<audio id="cssEffect" src="./Sounds/button-16.ogg" crossOrigin="anonymous"/>
		</div>);
	}
}		
		
class Game extends React.PureComponent {
	constructor(props){
		super(props);
		this.state = {
			hideStyle:{
				opacity:0,
				position:"absolute",
				paddingTop:"99vh",
			},
			showStyle:{
				opacity:1,
				paddingTop:"0vh",				
			},
		}		
		this.bindChannel = this.bindChannel.bind(this);
	}	
	
	bindChannel(){
		//Connect to the iframe
		channel = new MessageChannel();
		port1 = channel.port1;
		connectPort = false;
		addChannel();
		//
		port1.onmessage = (evt)=>{
			if(evt.data === "characterSelectReady"){
				//console.warn("Unity Ready");
				unityReady = true;
			}
			else if(evt.data === "stageReady"){
				//console.warn("stageReady");
			}
		}
	}
	
	render(){
		return(<div id="gameHolder" style={this.props.steps === 2 ? this.state.showStyle : this.state.hideStyle}>
			<div className="gameTimers">
				<ProgressBar id="gameTimer" variant={this.props.timeLimit > 40 ? "primary" : "danger"} min={0} max={180} now={this.props.timeLimit < 0 ? 1 : this.props.timeLimit} label={"TIME: "+Math.floor(this.props.timeLimit)+"s"} />
			</div>
			<div>
				<div id="player1Stats">
					<div className="comrev">
						<div style={{float:"left"}}>
							<b> {this.props.kor ? <span role="img" aria-label="crown">👑</span>: null} {this.props.player1 ? this.props.player1.slice(0,15) : null}</b>
							<br/>
							<HealthLinearProgress variant="determinate" value={this.props.player1Health}/> 
							<br/>Status: <b>{(this.props.player1HonestReveal > 0 && this.props.player1HonestReveal === 8) ? " HONEST" : null }{this.props.player1DidCommit === 1 ? " COMMIT" : null }</b>
							<br/>Action: <b>{this.props.p1Action? this.props.p1Action.toUpperCase() : ""}</b>
						</div>
						<div style={{float:"right",textAlign:"right"}}>
							<b>{this.props.player2 ? this.props.player2.slice(0,15) : null}</b>
							<HealthLinearProgress variant="determinate" value={this.props.player2Health}/> 
							<br/>Status: <b>{(this.props.player2HonestReveal > 0 && this.props.player2HonestReveal === 8) ? " HONEST" : null } {this.props.player2DidCommit === 1 ? " COMMIT" : null } </b>
							<br/>Action: <b>{this.props.p2Action? this.props.p2Action.toUpperCase() : ""}</b>		
						</div>	
						<div id="moveTimeout">
							{
								this.props.timeLimit > 0 ?
								<ProgressBar variant="primary"
									style={{fontSize:"large",height:"1.5vh"}}
									now={this.props.moveTimeoutValue} 
									max={30}
									label={Math.floor(this.props.moveTimeoutValue)+"s"}
								/>:null
							}
							{
								(this.props.player1Health > 0 && this.props.player2Health > 0 && this.props.timeLimit < 1 ) ? 
								<Button color="danger" className="button-65" onClick={this.props.crankIt}> End Game </Button> 
								:null

							}
						</div>					
					</div>
				</div>
				<br/>
				{(this.props.isPlayer1 || this.props.isPlayer2) ?
					<div id="playerOptions">
						<div>
							<ButtonGroup>
								{ this.props.isPlayer1 && this.props.player1DidCommit === 1 ? <button className="button-65" onClick={()=>{this.props.reveal("attack")}}>UNLEASH </button>  : null }
								
								{
									(this.props.isPlayer1 && this.props.player1DidCommit === 1) || (this.props.isPlayer2 && this.props.player2DidCommit === 1) ? null :
									<>
										<button className="button-64" onClick={()=>{this.props.commit("rock")}}>
											<span className="text"> Reversal </span>
										</button>
										
										<button className="button-64" onClick={()=>{this.props.commit("paper")}}>
											<span className="text"> Punch </span>
										</button>
										
										<button className="button-64" onClick={()=>{this.props.commit("scissors")}}>
											<span className="text"> Strike </span>
										</button>
									</>
								}
								{ this.props.isPlayer2 && this.props.player2DidCommit === 1 ? <button className="button-65" onClick={()=>{this.props.reveal("attack")}}>UNLEASH </button>  : null }
							</ButtonGroup>
						</div>
					</div>:null
				}
				<WebGLView src={"https://solsurvivor.s3.amazonaws.com/index.html"} onLoad={this.bindChannel}/>
			</div>
	</div>)}
}

function WagerSwitch(props){
	let showDisclaimer = true;

	function removeDisclaimer(){
		try{
			let wd = document.getElementsByClassName("wagerDisclaimer")[0];
			wd.setAttribute("style","display:none");
		}
		catch(e){console.error(e)}
	}	
		
	return(<div>
			{	(props.wager && showDisclaimer)?
					<p className="wagerDisclaimer">
					Disclaimer: Wagers are not available in the U.S.A, E.U. or other prohibited jurisdictions. 
					If you are located in, incorporated or otherwise established in, or a resident of the United States of America
					or any nation part of the European Union, you are not permitted to wager on sol-talk.com. By using this 
					service you acknowledge Sol-Talk bears no responsibility for any loss of funds.
					<br/><button color="danger" onClick={removeDisclaimer}>acknowledge</button>
					</p>
				: null
			}
			<ButtonGroup id="wagerButtons">
			{ props.wager ? <Button id="wagerStats" title="WAGER DETAILS" onClick={props.close}> <LineStyleIcon/> DETAILS </Button> : null }
			{ 
				props.wager && props.bet && props.bet.outcome > 0 ?
				<Button id="wagerCollect" onClick={async()=>{ await props.redeemContract(props.wagerContractAddress); }} title="COLLECT WAGER"> <MonetizationOnIcon /> COLLECT </Button>
				:null
			}
			{ 
				props.wager && props.bet && props.bet.outcome > 0 ?
				<Button id="wagerTrash" onClick={async()=>{ await props.closeWagerAccounts(props.wagerContractAddress); }} title="CLOSE TOKEN ACCOUNTS"> <DeleteIcon /> ACCOUNTS </Button>
				:null
			}			
			</ButtonGroup>
			{
				props.viewBet ?
				<div id="contractViewHolder">
					<ContractView bet={props.bet ? props.bet : {} } getContractInformation={props.getContractInformation} redeemContract={props.redeemContract} close={props.close}/>
				</div>
				:null
			}			
	</div>)
}

export { Stage };
