import React from 'react';
import { Button,ButtonGroup,Input,Label } from 'reactstrap';
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
import { WagerClient } from '../util/wager';
import { Wizard } from './Wizard';
import { ContractView } from './ContractView';
import LineStyleIcon from '@material-ui/icons/LineStyle';
import MonetizationOnIcon from '@material-ui/icons/MonetizationOn';

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
const iframe_game_channel = new BroadcastChannel('game_commands');   
    
function WebGLView(props){
	return (<iframe
		id="gameIframe"
		title="gameIframe" 
		src={props.src} 
		width={document.body.clientWidth} 
		height={document.body.clientHeight*0.8} 
		style={{frameBorder:0}}
	/>);
}     
     
class Stage extends React.Component{ 
	constructor(props){
		super(props);
		this.state = {
			backroundMusic:"",
			bet:{},
			gameOver:false,
			gameStart:false,
			gameStatus:0,
			isPlayer1:false,
			isPlayer2:false,
			isWagerGame:false,
			loadingAccountData:true,
			moveTimer:-1,
			moveTimerExpiration:-1,
			moveTimeoutValue:30,
			muted:false,
			myCommit:"",
			player1:false,
			player2:false,
			p1Action:"idle",
			player1Commit:0,
			player1DidCommit:0,
			player1DidReveal:0,
			player1Health:100,
			player1Super:0,
			p2Action:"idle",
			player2Commit:0,
			player2DidCommit:0,
			player2DidReveal:0,
			player2Health:100,	
			player2Super:0,
			timeLimit:180,
			wager:false,
			wagerContractAddress:"",
			wagerTokenBalance:0,
			wagers:window.localStorage.getItem("wagers") ? JSON.parse(window.localStorage.getItem("wagers")) : [],			
			viewBet:false,	
		}
		this.acceptChallenge = this.acceptChallenge.bind(this);
		this.acceptWagerKeysIx = this.acceptWagerKeysIx.bind(this);
		this.addMintSigs = this.addMintSigs.bind(this);
		this.commit = this.commit.bind(this);
		this.countDownTimer = this.countDownTimer.bind(this);
		this.createChallenge = this.createChallenge.bind(this);
		this.getAccountInfo = this.getAccountInfo.bind(this);
		this.getWagerInfo = this.getWagerInfo.bind(this);
		this.muteMusic = this.muteMusic.bind(this);
		this.parseState = this.parseState.bind(this);
		this.playMusic = this.playMusic.bind(this);
		this.reveal = this.reveal.bind(this);
		this.solletSign = this.solletSign.bind(this);
		this.subscribeToGame = this.subscribeToGame.bind(this);
		this.timeGame = this.timeGame.bind(this);
		this.toggleViewBet = this.toggleViewBet.bind(this);
		this.updateWagerList = this.updateWagerList.bind(this);
		this.updateWagerOption = this.updateWagerOption.bind(this);
		this.wagerStart = this.wagerStart.bind(this);
	}
	
	async acceptChallenge(){
		if(!this.props.payerAccount && !this.props.localPayerAccount){
			return alert("Please Log In!");
		}		
		this.props.setLoading(true);
		this.setState({gameStart:false});
		this.playMusic().catch(console.warn);
		let programId = this.state.wager ? new PublicKey(this.props.WAGER_GAME_ID) : new PublicKey(this.props.GAME_ID);
		let gameAccount = this.state.wager ? new PublicKey(this.props.WAGER_GAME_ACCOUNT) : new PublicKey(this.props.GAME_ACCOUNT);
		let txid;
		//sollet adapter
		if(this.props.payerAccount){	
			let instructions = new TransactionInstruction({
				keys: [
					{pubkey: gameAccount, isSigner: false, isWritable: true},
					{pubkey: this.props.payerAccount, isSigner: true, isWritable: false},
				],
				programId,
				data: Buffer.from([1])
			});
			let wagerIx;
			if(this.state.wager){
				wagerIx = await this.acceptWagerKeysIx(instructions);
				if(!wagerIx){
					this.props.setLoading(false);
					return;
				}			
			}
			txid = await this.solletSign([instructions],wagerIx);	
		}
		else{
			//localaccount
			let instructions = new TransactionInstruction({
				keys: [
					{pubkey:gameAccount, isSigner: false, isWritable: true},
					{pubkey:this.props.localPayerAccount.publicKey, isSigner: true, isWritable: false},
				],
				programId,
				data: Buffer.from([1])
			});
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
			_transaction.add(instructions);	
			let { blockhash } = await this.props._connection.getRecentBlockhash();
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
		iframe_game_channel.postMessage( "idle-idle"); 
		if(this.state.gameOver){
			this.stateState({gameOver:false});
		}
		this.props.setLoading(false);
		this.props.saveTransaction(txid,this.props.defaultNetwork,"Sol-Survivor").catch(console.warn);
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

	async commit(action){
		this.props.setLoading(true);
		let programId = this.state.wager ? new PublicKey(this.props.WAGER_GAME_ID) : new PublicKey(this.props.GAME_ID);
		let gameAccount = this.state.wager ? new PublicKey(this.props.WAGER_GAME_ACCOUNT) : new PublicKey(this.props.GAME_ACCOUNT);
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
			let { blockhash } = await this.props._connection.getRecentBlockhash();
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
			}
			catch(e){
				this.props.notify("Confirmation Timeout","error");
			}
		}

		this.props.setLoading(false);
		this.props.saveTransaction(txid,this.props.defaultNetwork,"Sol-Survivor").catch(console.warn);
		return txid;
	}
		
	componentDidMount(){
		document.title = "survivor(alpha)";
		this.playMusic().catch(console.warn);
		react_game_channel.onmessage = (ev)=> { 
			if(ev && ev.data){
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
		//airdrop
		setTimeout(()=>{
			this.getAccountInfo()
			.then(this.subscribeToGame);
				/*window.fetch("http://localhost:8899", {
					"headers": {"content-type": "application/json"},
					"body":JSON.stringify( {
						"jsonrpc": "2.0",
						"id": 1,
						"method": "requestAirdrop",
						"params": [
							this.props.localPayerAccount.publicKey.toBase58(),50000000
						]
					}),
					"method": "POST",
				})
				.catch(console.warn);	
				*/	
		},1000);		
	}
	componentWillUnmount(){}
	
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
			return this.countDownTimer();
		},1000);
	}
	
	async createChallenge(wgpk){
		if(!this.props.payerAccount && !this.props.localPayerAccount){
			return alert("Please Log In!");
		}
		this.setState({gameStart:false});
		this.props.setLoading(true);
		this.playMusic().catch(console.warn);
		let programId = this.state.wager ? new PublicKey(this.props.WAGER_GAME_ID) : new PublicKey(this.props.GAME_ID);
		let gameAccount = this.state.wager ? new PublicKey(this.props.WAGER_GAME_ACCOUNT) : new PublicKey(this.props.GAME_ACCOUNT);
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
				data: Buffer.from([0])
			});
			if(this.state.wager){ instruction.keys.push( {pubkey: wgpk, isSigner: false, isWritable: false} )}
			txid = await this.solletSign([instruction]);
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
				data: Buffer.from([0])
			});
			if(this.state.wager){
				instruction.keys.push( {pubkey: wgpk, isSigner: false, isWritable: false} );
			}
			let _transaction =  new Transaction().add(instruction);	
			let { blockhash } = await this.props._connection.getRecentBlockhash();
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
		iframe_game_channel.postMessage( "idle-idle");  
		if(this.state.gameOver){
			this.setState({gameOver:false});
		}
		this.props.setLoading(false);
		this.props.saveTransaction(txid,this.props.defaultNetwork,"Sol-Survivor").catch(console.warn);		
		return txid;
	}
	
	getAccountInfo(){
		let account = this.state.wager === true? this.props.WAGER_GAME_ACCOUNT : this.props.GAME_ACCOUNT;
		console.warn("getting " + account + " info");
		return this.props._connection.getAccountInfo( new PublicKey(account) )
		.then((resp)=>{
			if(!resp.data){return}
			let data = new Buffer(resp.data).toString("base64");
			console.log("initial game state:",data);
			return this.parseState(data);
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
				return;
			})
			.catch(console.warn);
		})
		.catch(console.warn);
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
	
	parseState(data){
		return new Promise((resolve,reject)=>{
			data = atob(data);
			let dataInfo = BufferLayout.struct([
				BufferLayout.u8(data.slice(0,1)), //game status
				BufferLayout.u8(data.slice(1,33)), //player2
				BufferLayout.u8(data.slice(33,65)), //player2
				BufferLayout.u8(data.slice(65,66)), //player 1 commit bool
				BufferLayout.u8(data.slice(66,67)), //player 1 reveal bool
				BufferLayout.u32(data.slice(67,71)), //player 1 commit		 
				BufferLayout.u8(data.slice(71,72)), //player 2 commit bool
				BufferLayout.u8(data.slice(72,73)), //player 2 reveal bool
				BufferLayout.u32(data.slice(73,77)), //player 2 commit	
				BufferLayout.u8(data.slice(78,79)), //player 1 reveal is honest bool
				BufferLayout.cstr(data.slice(79,89)), //player 1 reveal
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
				BufferLayout.u8(data.slice(125,157)) // Wager Address
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
				player1HonestReveal:state[9][0],
				player1Reveal:state[10],
				player2HonestReveal:state[11][0],
				player2Reveal:state[12],	
				moveTimer:state[13],				
				player1Health:state[14][0],
				player1Super:state[15][0],
				player2Health:state[16][0],
				player2Super:state[17][0],
				player1LastMove:state[18][0],
				player2LastMove:state[19][0],
				winner:state[20][0],
				gameStart:state[21],
				wagerGame:state[22]
			},()=>{
				if(
					//Game Setup
					state[0][0] === 2 &&
					//Commits
					state[3][0] === 0  && state[4][0] === 0  &&
					state[6][0] === 0  && state[7][0] === 0  &&
					//Reveals
					state[9][0] === 0  && state[11][0] === 0 &&
					//Time has started
					state[13][1] > 0
				){
					let actions = ["counter","taunt","attack","","idle"];
					let gameMessage = "";
					if(state[14][0] === 0 && state[16][0] > 0 ){ 
						gameMessage = `dead-${actions[state[19][0]]}`;
						iframe_game_channel.postMessage( gameMessage );   
					}
					else if(state[14][0] > 0 && state[16][0] === 0 ){ 
						gameMessage = `${actions[state[18][0]]}-dead`;
						iframe_game_channel.postMessage( gameMessage );   
					}
					else if(state[14][0] === 0 && state[16][0] === 0 ){ 
						gameMessage = "dead-dead";
						iframe_game_channel.postMessage( gameMessage );   
					}
					else{
						gameMessage = actions[state[18][0]] + "-" + actions[state[19][0]];
						iframe_game_channel.postMessage( gameMessage );
					}
					//temp fix till new engine in place
					let realActions = ["Reversal","Punch","Strike","","idle"];
					this.setState({
						p1Action:realActions[state[18][0]],
						p2Action:realActions[state[19][0]]
					});

				}
			});
			let player1;
			let player2;
			if(state[1][0] > 1){
				let p1 = dataInfo.fields[1].property;
				player1 = bs58.encode(this.props.stringToBytes(p1));
				this.setState({player1}); 
			}
			if(state[2][0] > 1){
				let p2 = dataInfo.fields[2].property;
				player2 = bs58.encode(this.props.stringToBytes(p2));
				this.setState({player2});
			}
			else if(state[2].join() === "0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0"){
				iframe_game_channel.postMessage( "reset" );   
			}
			if(!this.state.isPlayer1){
				if(player1){
					let p1 = 0;
					if(this.props.localPayerAccount && this.props.localPayerAccount.publicKey.toBase58() === player1){ p1++; }
					if(this.props.payerAccount && this.props.payerAccount.toBase58() === player1){ p1++; }
					if(p1){ 
						this.setState({isPlayer1:true});
					}
				}
			}
			if(!this.state.isPlayer2){
				if(player2){
					let p2 = 0;
					if(this.props.localPayerAccount && this.props.localPayerAccount.publicKey.toBase58() === player2){ p2++; }
					if(this.props.payerAccount && this.props.payerAccount.toBase58() === player2){ p2++ }
					if(p2){ 
						this.setState({isPlayer2:true});
					}
				}
			}
			console.log(this.state.player1,"vs",this.state.player2);
			//Move Time
			if(state[13][0] > 0 && this.state.moveTimer !== -1){
				this.setState({moveTimer:state[13]});
				if(this.state.moveTimerExpiration < 0){
					let expire = (new Date().getTime()+30000);	
					this.setState({moveTimerExpiration:expire});
				}
			}
			else{
				this.setState({moveTimer:-1,moveTimerExpiration:-1,moveTimeoutValue: 30 });
			}
			//Game Time
			this.timeGame(data).catch(console.warn);
			this.setState({loadingAccountData:false},resolve);
			//Wager
			if( state[22] && state[22][0] > 1){
				let wagerContractAddress = dataInfo.fields[22].property;
				wagerContractAddress = bs58.encode(this.props.stringToBytes(wagerContractAddress));
				this.updateWagerList(wagerContractAddress)
				this.setState({wager:true,wagerContractAddress},()=>{ return this.getWagerInfo(wagerContractAddress); }); 
			}
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
		let programId = this.state.wager ? new PublicKey(this.props.WAGER_GAME_ID) : new PublicKey(this.props.GAME_ID);
		let gameAccount = this.state.wager ? new PublicKey(this.props.WAGER_GAME_ACCOUNT) : new PublicKey(this.props.GAME_ACCOUNT);
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
			let { blockhash } = await this.props._connection.getRecentBlockhash();
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
				console.log("reveal txid",txid);
			}
			catch(e){
				console.log(e);
				let canRecover = await this.props.recoverFromTimeout(e,0);
				if(!canRecover){
					this.props.notify(e.message,"error");
				}
			}
		}
		this.props.setLoading(false);
		this.props.saveTransaction(txid,this.props.defaultNetwork,"Sol-Survivor").catch(console.warn);
		return txid;
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
			let { blockhash } = await this.props.connection.getRecentBlockhash();
			transaction.recentBlockhash = blockhash;		
			transaction.setSigners(this.props.payerAccount);
			let signed = await this.props.wallet.signTransaction(transaction);
			txid = await this.props.connection.sendRawTransaction(signed.serialize());
			await this.props.connection.confirmTransaction(txid);	
		}
		catch(e){
			let canRecover = await this.props.recoverFromTimeout(e,0);
			if(!canRecover){
				this.props.notify(e.message,"error");
				this.props.setLoading(false);
				return;
			}
		}
		return txid
	}
	
	subscribeToGame(){
		if(!this.props.ws){return}
		let message = {
			"jsonrpc":"2.0", 
			"id":909, 
			"method":"accountSubscribe",
			"params":[]
		}
		if(!this.state.wager){
			message.params = [this.props.GAME_ACCOUNT,{"encoding":"jsonParsed","commitment":"singleGossip"} ]; 
			this.props.ws.send(JSON.stringify(message));	
			//unsubscribe from wager game_account
			message.method = "accountUnsubscribe";	
			message.params = [910];
			this.props.ws.send(JSON.stringify(message));	
		}
		else if(this.state.wager){
			message.id = 910;
			message.params = [this.props.WAGER_GAME_ACCOUNT,{"encoding":"jsonParsed","commitment":"singleGossip"} ]; 
			this.props.ws.send(JSON.stringify(message));
			//unsubscribe from normal game_account
			message.method = "accountUnsubscribe";	
			message.params = [909];
			this.props.ws.send(JSON.stringify(message));				
		}	
	}
	
	timeGame(data){
		return new Promise((resolve,reject)=>{
			if(Drift === 0){
				return resolve( setTimeout(()=>{return this.timeGame(data)},1000) );
			}
			let gameStart = data.slice(117,125);	
			let startDate = get64BitTime(this.props.stringToBytes(gameStart));
			this.setState({gameStart:startDate.getTime()},resolve);
			console.log("game started @ ",startDate,"Drift",Drift);
		})
	}
	
	updateWagerList(x){
		let wagers = this.state.wagers;
		if(wagers.indexOf(x) > -1){return}
		wagers.push(x);
		this.setState({wagers});
		window.localStorage.setItem("wagers",JSON.stringify(wagers));
	}
	
	updateWagerOption(){
		return this.setState({wager:!this.state.wager},()=>{
			this.subscribeToGame();
			console.log("get acc info");
			this.getAccountInfo();
		});
	}
	
	async wagerStart(){
		this.setState({bet:false,wagerContractAddress:""});
		let wagerAmount = document.getElementById("wagerAmount");
		if(!wagerAmount.value || wagerAmount.value === 0 ){
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
			minimumBet: Number( wagerAmount.value ),
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
		let [ mintPositionIx ] = await wc.mintPx(1,wagerAmount.value,true);	
		console.log(allIx);
		allIx = allIx.concat(mintPositionIx);
		let _transaction =  new Transaction();
		let txid = "";
		for(let i = 0;i < allIx.length ;i++){
			_transaction.add(allIx[i]);
		}				

		if(this.props.payerAccount){	
			let { blockhash } = await this.props.connection.getRecentBlockhash();
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
			let { blockhash } = await this.props._connection.getRecentBlockhash();
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
					  commitment: 'root',
					  //preflightCommitment: 'max',  
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
		if(this.state.loadingAccountData){return null;}
		return(<div className="stageHolder">
			<WagerSwitch
				bet={this.state.bet}
				close={this.toggleViewBet}
				getContractInformation={this.props.getContractInformation}
				redeemContract={this.props.redeemContract}
				wager={this.state.wager} 
				wagerContractAddress={this.state.wagerContractAddress}
				updateWagerOption={this.updateWagerOption} 
				viewBet={this.state.viewBet}
			/>
			<h3 id="title">		
				<div className="pressStart">	
				{
					( this.state.timeLimit < 0 || this.state.gameStatus === 0  ) || this.state.winner > 0 ?
					<div> 
						<GameOptions 
							classic={this.createChallenge} 
							wager={this.state.wager} 
							wagerStart={this.wagerStart} 
							enabled={this.props.loading} 
							usdtBalance={this.props.usdtBalance}
							/> 
					</div> : null
				}
				</div>
				<div className="pressStart">
				{ 
					(this.state.gameStatus === 1) ?
					<Button color="danger" block className=" waves-effect waves-light" onClick={this.acceptChallenge}> 
						PLAYER 2 PRESS START 
						{this.state.bet && this.state.bet.minimumBet ? <b> ${(this.state.bet.minimumBet / Math.pow(10,6))} USDT</b> : null}
					</Button> : null	
				}
				</div>
			</h3>
			<div><ProgressBar id="gameTimer" variant={this.state.timeLimit > 40 ? "primary" : "danger"} striped min={0} max={180} now={this.state.timeLimit} label={"TIME: "+Math.floor(this.state.timeLimit)+"s"} /></div>
			<br/>
			<div id="moveTimeout">
				<ProgressBar variant="info"
					style={{fontSize:"large",height:"2vh"}}
					 striped min={0} max={30} 
					now={this.state.moveTimeoutValue} 
					label={Math.floor(this.state.moveTimeoutValue)}
				/>
			</div>
			<div>
				<div id="player1Stats">
					<div className="comrev">
						<b> Player 1 </b>
						<br/>Address<br/> <b>{this.state.player1 ? this.state.player1.slice(0,15) : null}</b>
						<br/>Status<br/> <b>{(this.state.player1HonestReveal > 0 && this.state.player1HonestReveal === 8) ? " HONEST" : null }{this.state.player1DidCommit === 1 ? " COMMIT" : null }</b>
						<br/>Action<br/> <b>{this.state.p1Action? this.state.p1Action.toUpperCase() : ""}</b>
						<br/>Health 
						<ProgressBar id="player1HealthBar" variant={this.state.player1Health > 1 ? "success" : "danger"} min={0} max={100} now={this.state.player1Health}/>
					</div>
				</div>
				<div id="player2Stats">
						<div className="comrev" id="comrev2">
							<b> Player 2 </b>
							<br/>Address<br/> <b>{this.state.player2 ? this.state.player2.slice(0,15) : null}</b>
							<br/>Status<br/> <b>{(this.state.player2HonestReveal > 0 && this.state.player2HonestReveal === 8) ? " HONEST" : null } {this.state.player2DidCommit === 1 ? " COMMIT" : null } </b>
							<br/>Action<br/> <b>{this.state.p2Action? this.state.p2Action.toUpperCase() : ""}</b>
							<br/>Health
							<ProgressBar id="player1HealthBar" variant={this.state.player2Health > 1 ? "success" : "danger"} min={0} max={100} now={this.state.player2Health}/>
						</div>
				</div>
				<br/>
				{(this.state.isPlayer1 || this.state.isPlayer2) ?
					<div id="playerOptions">
						<div>
							<ButtonGroup>
								{ this.state.isPlayer1 && this.state.player1DidCommit === 1 ? <Button block color="danger" onClick={()=>{this.reveal("attack")}}>UNLEASH </Button>  : null }
								<Button color="success" onClick={()=>{this.commit("rock")}}> Reversal </Button>
								<Button color="default" onClick={()=>{this.commit("paper")}}> Punch </Button>
								<Button color="warning" onClick={()=>{this.commit("scissors")}}> Strike </Button>
								{ this.state.isPlayer2 && this.state.player2DidCommit === 1 ? <Button block color="danger" onClick={()=>{this.reveal("attack")}}>UNLEASH </Button>  : null }
							</ButtonGroup>
						</div>
					</div>:null
				}
				<WebGLView src={"./solsurvivor/index.html"}/>
				<Wizard open={this.props.survivorHelpOpen} close={this.props.toggleSurvivorHelpOpen}/>
			</div>
			<audio id="backgroundMusic" src={this.state.backgroundMusic} />
		</div>)
	}
}

function GameOptions(props){
	function updateWAmount(evt){
		let currentWagerAmount = document.getElementById("currentWagerAmount");
		currentWagerAmount.innerHTML = evt.currentTarget.value;
		return;
	}
	return(<div>
		{
			props.wager === false ?
				<Button color="danger" block className="classicButton waves-effect waves-light" onClick={props.classic}> PLAYER 1 PRESS START </Button> 
			:
			<div className="wagerDiv"> 
				<Input type="number" defaultValue="0.05" id="wagerAmount" onChange={updateWAmount}/>			 
				<Button color="success" block disabled={props.enabled ? true : false} id="wagerButton" onClick={props.wagerStart}> WAGER $<b id="currentWagerAmount">0.05</b> / <b>{props.usdtBalance.toFixed(2)}</b> (USDT) </Button>
			</div>
		}		
	</div>)
}

function WagerSwitch(props){
	let showDisc = true;
	function removeDisc(){
		try{
			let wd = document.getElementsByClassName("wagerDisclaimer")[0];
			wd.parentElement.removeChild(wd);
		}
		catch(e){console.error(e)}
	}	

	return(<div className="custom-control custom-switch">
			<Input type="checkbox" 
				className="custom-control-input" 
				id="modeSwitch" 
				checked={props.wager}
				onClick={props.updateWagerOption}
			/>
			<Label className="custom-control-label" htmlFor="modeSwitch"> <p id="modeText">{ props.wager ? "wager" : "classic" }</p> </Label>
			{	props.wager && showDisc?
					<p className="wagerDisclaimer">
					Disclaimer: Wagers are not available in the U.S.A, E.U. or other prohibited jurisdictions. 
					If you are located in, incorporated or otherwise established in, or a resident of the United States of America
					or any nation part of the European Union, you are not permitted to wager on sol-talk.com. By using this 
					service you acknowledge Sol-Talk bears no responsibility for any loss of funds.
					<br/><button color="danger" onClick={removeDisc}>acknowledge</button>
					</p>
				: null
			}
			<ButtonGroup id="wagerButtons">
			{ props.wager ? <Button id="wagerStats" title="wager information" onClick={props.close}> <LineStyleIcon/> DETAILS </Button> : null }
			{ 
				props.wager && props.bet && props.bet.outcome > 0 ?
				<Button id="wagerCollect" onClick={async()=>{ await props.redeemContract(props.wagerContractAddress); }} title="collect"> <MonetizationOnIcon /> COLLECT </Button>
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
