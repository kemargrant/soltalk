import React from 'react';
import { Button,ButtonGroup,
ProgressBar } from 'react-bootstrap';
import {
  PublicKey,  
  TransactionInstruction,
  Transaction,
} from '@solana/web3.js';
import {sendAndConfirmTransaction} from '../util/send-and-confirm-transaction';
import bs58 from 'bs58';
import * as BufferLayout from 'buffer-layout';
const sdbm = require('sdbm');


// get random number between min and max value
function rand(min, max) {
  return Math.floor(Math.random() * (max + 1)) + min;
}

//Uint8Array
function get64BitTime(byteArray,offset=0){
	if(!byteArray){return 0}
	let trim = [];
	for (let i = byteArray.length-1;i > -1;i--){
		if(byteArray[i] > 0){
			trim.push(byteArray[i])
		}
	}
	let nArray = new Uint8Array(trim);
	let buffer = Buffer.from(nArray);
	let hex = "0x"+buffer.toString("hex");
	let big = window.BigInt(hex);
	big = big.toString();
	big = Number(big);
	let time = new Date( big *1000 );
	return time;
}


let currentConnection = "http://testnet.solana.com";
//let currentConnection = "http://localhost:8899";

const GAME_ID = "D6sPuWypcX7MiQsDesUKtMUvBznknJd3f7bBh6qaqG3p";
const GAME_ACCOUNT = "24zUvBhv981ur8kedCbUimhj8araq73RDMBLU49ENxtH";  
const react_game_channel = new BroadcastChannel('game_channel'); 
const iframe_game_channel = new BroadcastChannel('game_commands');
    
function WebGLView(props){return (<iframe title="gameIframe" src={props.src} width={1080} height={700} style={{frameBorder:0}}/>);}     
     
class Stage extends React.Component{ 
	constructor(props){
		super(props);
		this.state = {
			backroundMusic:"",
			gameOver:false,
			gameStart:false,
			gameStatus:0,
			isPlayer1:false,
			isPlayer2:false,
			moveTimer:-1,
			moveTimerExpiration:-1,
			moveTimeoutValue:10,
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
		}
		this.acceptChallenge = this.acceptChallenge.bind(this);
		this.commit = this.commit.bind(this);
		this.countDownTimer = this.countDownTimer.bind(this);
		this.createChallenge = this.createChallenge.bind(this);
		this.getAccountInfo = this.getAccountInfo.bind(this);
		this.muteMusic = this.muteMusic.bind(this);
		this.parseState = this.parseState.bind(this);
		this.playMusic = this.playMusic.bind(this);
		this.reveal = this.reveal.bind(this);
		this.subscribeToGame = this.subscribeToGame.bind(this);
	}
	
	async acceptChallenge(){
		this.setState({gameStart:false});
		//this.playMusic().catch(console.warn);
		let programId = new PublicKey(GAME_ID);
		let txid;
		//sollet adapter
		if(this.props.payerAccount){	
			let instruction = new TransactionInstruction({
				keys: [
					{pubkey: new PublicKey(GAME_ACCOUNT), isSigner: false, isWritable: true},
					{pubkey: this.props.payerAccount, isSigner: true, isWritable: false},
				],
				programId,
				data: Buffer.from([1])
			});
			let _transaction =  new Transaction().add(instruction);
			let { blockhash } = await this.props.connection.getRecentBlockhash();
			_transaction.recentBlockhash = blockhash;		
			_transaction.setSigners(this.props.payerAccount);
			let signed = await this.props.wallet.signTransaction(_transaction);
			let tx = await this.props.connection.sendRawTransaction(signed.serialize());
			txid = this.props.connection.confirmTransaction(tx);	
		}
		else{
			//localaccount
			let instruction = new TransactionInstruction({
				keys: [
					{pubkey:new PublicKey(GAME_ACCOUNT), isSigner: false, isWritable: true},
					{pubkey:this.props.localPayerAccount.publicKey, isSigner: true, isWritable: false},
				],
				programId,
				data: Buffer.from([1])
			});
			let _transaction =  new Transaction().add(instruction);	
			let { blockhash } = await this.props._connection.getRecentBlockhash();
			_transaction.recentBlockhash = blockhash;				
			_transaction.sign(this.props.localPayerAccount);
			txid = await sendAndConfirmTransaction(
				'acceptChallenge',
				this.props._connection,
				_transaction,
				this.props.localPayerAccount,
			);
		}
		iframe_game_channel.postMessage( "idle-idle"); 
		if(this.state.gameOver){
			this.stateState({gameOver:false});
		}
	}

	async commit(action){
		let programId = new PublicKey(GAME_ID);
		let txid;
		//Craft action
		let random = Math.random().toString().slice(0,10);
		let r = ""
		let act = {
			"attack":"0",
			"gaurd":"1",
			"counter":"2",
			"taunt":"3",
		}
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
					{pubkey: new PublicKey(GAME_ACCOUNT), isSigner: false, isWritable: true},
					{pubkey: this.props.payerAccount, isSigner: true, isWritable: false},
				],
				programId,
				data: Buffer.concat([ Buffer.from([2]),_myCommit])
			});
			let _transaction =  new Transaction().add(instruction);
			let { blockhash } = await this.props.connection.getRecentBlockhash();
			_transaction.recentBlockhash = blockhash;		
			_transaction.setSigners(this.props.payerAccount);
			let signed = await this.props.wallet.signTransaction(_transaction);
			let tx = await this.props.connection.sendRawTransaction(signed.serialize());
			txid = this.props.connection.confirmTransaction(tx);	
		}
		else{
			//localaccount
			let instruction = new TransactionInstruction({
				keys: [
					{pubkey:new PublicKey(GAME_ACCOUNT), isSigner: false, isWritable: true},
					{pubkey:this.props.localPayerAccount.publicKey, isSigner: true, isWritable: false},
				],
				programId,
				data: Buffer.concat([ Buffer.from([2]),_myCommit ])
			});
			let _transaction =  new Transaction().add(instruction);	
			let { blockhash } = await this.props._connection.getRecentBlockhash();
			_transaction.recentBlockhash = blockhash;				
			_transaction.sign(this.props.localPayerAccount);
			txid = await sendAndConfirmTransaction(
				'acceptChallenge',
				this.props._connection,
				_transaction,
				this.props.localPayerAccount,
			);
		}
	}
		
	componentDidMount(){
		this.playMusic().catch(console.warn);
		react_game_channel.onmessage = (ev)=> { 
			if(ev && ev.data){
				return this.parseState(ev.data[0]);
			}
		}
		//airdrop
		setTimeout(()=>{
			this.getAccountInfo()
			.then(this.subscribeToGame);
				window.fetch("http://localhost:8899", {
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
		},1000);		
	}
	
	countDownTimer(){
		return requestIdleCallback(()=>{
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
		})
	}
	
	async createChallenge(){
		this.setState({gameStart:false});
		//this.playMusic().catch(console.warn);
		let programId = new PublicKey(GAME_ID);
		let clock = new PublicKey("SysvarC1ock11111111111111111111111111111111");
		let txid;
		//sollet adapter
		if(this.props.payerAccount){	
			let instruction = new TransactionInstruction({
				keys: [
					{pubkey: new PublicKey(GAME_ACCOUNT), isSigner: false, isWritable: true},
					{pubkey: this.props.payerAccount, isSigner: true, isWritable: false},
					{pubkey:clock, isSigner: false, isWritable: false}
				],
				programId,
				data: Buffer.from([0])
			});
			let _transaction =  new Transaction().add(instruction);
			let { blockhash } = await this.props.connection.getRecentBlockhash();
			_transaction.recentBlockhash = blockhash;		
			_transaction.setSigners(this.props.payerAccount);
			let signed = await this.props.wallet.signTransaction(_transaction);
			let tx = await this.props.connection.sendRawTransaction(signed.serialize());
			txid = this.props.connection.confirmTransaction(tx);	
		}
		else{
			//local account
			let instruction = new TransactionInstruction({
				keys: [
					{pubkey:new PublicKey(GAME_ACCOUNT), isSigner: false, isWritable: true},
					{pubkey:this.props.localPayerAccount.publicKey, isSigner: true, isWritable: false},
					{pubkey:clock, isSigner: false, isWritable: false}
				],
				programId,
				data: Buffer.from([0])
			});
			let _transaction =  new Transaction().add(instruction);	
			let { blockhash } = await this.props._connection.getRecentBlockhash();
			_transaction.recentBlockhash = blockhash;				
			_transaction.sign(this.props.localPayerAccount);
			txid = await sendAndConfirmTransaction(
				'createChallenge',
				this.props._connection,
				_transaction,
				this.props.localPayerAccount,
			);
		}
		iframe_game_channel.postMessage( "idle-idle");  
		if(this.state.gameOver){
			this.setState({gameOver:false});
		}
	}
	
	getAccountInfo(){
		//clock info
		let body = {
			"jsonrpc": "2.0",
			"id": 1,
			"method": "getAccountInfo",
			"params": [GAME_ACCOUNT,{"encoding": "base64"}]
		}
		//Contract Information
		return window.fetch(currentConnection, {		
			"headers": {"content-type": "application/json"},
			"body":JSON.stringify(body),
			"method": "POST",
		})
		.then((r)=>r.json())
		.then((json)=>{
			//base64
			console.warn(json)
			if(!json.result.value){return}
			let data = json.result.value.data[0];
			this.parseState(data);
		})
		.then(()=>{
			body = {
				"jsonrpc": "2.0",
				"id": 1,
				"method": "getAccountInfo",
				"params": ["SysvarC1ock11111111111111111111111111111111",{"encoding": "base64"}]
			}
			window.fetch(currentConnection, {
				"headers": {"content-type": "application/json"},
				"body":JSON.stringify(body),
				"method": "POST",
			})
			.then((r)=>r.json())
			.then((json)=>{
				//base64
				console.log(json);
				if(!json.result.value){return}
				let data = json.result.value.data[0];
				data = atob(data);
				let time = this.props.stringToBytes(data);
				time = get64BitTime(time.slice(32));
				console.warn(time);
				return;
			})
			.catch(console.warn);
		})
		.catch(console.warn);
		
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
		]);
		console.log(dataInfo);
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
			//gameStart:state[21]
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
				let actions = ["attack","gaurd","counter","taunt","idle"];
				if(state[14][0] === 0 && state[16][0] > 0 ){ iframe_game_channel.postMessage( "dead" + "-" + actions[state[19][0]] );   }
				else if(state[14][0] > 0 && state[16][0] === 0 ){ iframe_game_channel.postMessage( actions[state[18][0]] + "-" + "dead" );   }
				else if(state[14][0] === 0 && state[16][0] === 0 ){ iframe_game_channel.postMessage( "dead" + "-" + "dead" );   }
				else{
					iframe_game_channel.postMessage( actions[state[18][0]] + "-" + actions[state[19][0]]);
					this.setState({
						p1Action:actions[state[18][0]],
						p2Action:actions[state[19][0]]
					});
				}

			}
		});
		let player1;
		let player2;
		if(state[1][0] > 1){
			let p1 = dataInfo.fields[1].property;
			player1 = bs58.encode(this.props.stringToBytes(p1));
			console.log("Player1:",player1);
			this.setState({player1}); 
		}
		if(state[2][0] > 1){
			let p2 = dataInfo.fields[2].property;
			player2 = bs58.encode(this.props.stringToBytes(p2));
			console.log("Player2:",player2);
			this.setState({player2});
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
		console.warn(player2);
		//Set start time
		if(!this.state.gameStart){
			let gameStart = data.slice(117,125);
			gameStart = get64BitTime(this.props.stringToBytes(gameStart)).getTime();
			this.setState({gameStart},this.countDownTimer);
		}
		//set time
		if(state[13][0] > 0 && this.state.moveTimer !== -1){
			this.setState({moveTimer:state[13]});
			if(this.state.moveTimerExpiration < 0){
				let expire = (new Date().getTime()+10000);		
				this.setState({moveTimerExpiration:expire});
			}
		}
		else{
			this.setState({moveTimer:-1,moveTimerExpiration:-1,moveTimeoutValue:10});
		}
	}
	
	async playMusic(){
		if(!this.state.backroundMusic){
			this.setState({backgroundMusic:"./Sounds/2020-07-05_-_Dragon_Boss_Fight_-_David_Fesliyan.mp3"});
			let audio = document.getElementById("backgroundMusic");
			return await audio.play();
		}
	}
	
	async reveal(){
		let programId = new PublicKey(GAME_ID);
		let clock = new PublicKey("SysvarC1ock11111111111111111111111111111111");
		let txid;
		let random = Math.random().toString().slice(0,10);
		if(!this.state.myCommit){
			console.log("lost commitment.using random reveal:",random,Buffer.from(random));
			this.setState({myCommit:random});
		}
		//sollet adapter
		if(this.props.payerAccount){	
			let instruction = new TransactionInstruction({
				keys: [
					{pubkey: new PublicKey(GAME_ACCOUNT), isSigner: false, isWritable: true},
					{pubkey: this.props.payerAccount, isSigner: true, isWritable: false},
					{pubkey:clock, isSigner: false, isWritable: false}
				],
				programId,
				data: Buffer.concat([ Buffer.from([3]), Buffer.from(this.state.myCommit) ])
			});
			let _transaction =  new Transaction().add(instruction);
			let { blockhash } = await this.props.connection.getRecentBlockhash();
			_transaction.recentBlockhash = blockhash;		
			_transaction.setSigners(this.props.payerAccount);
			let signed = await this.props.wallet.signTransaction(_transaction);
			let tx = await this.props.connection.sendRawTransaction(signed.serialize());
			txid = this.props.connection.confirmTransaction(tx);	
		}
		else{
			//localaccount
			let instruction = new TransactionInstruction({
				keys: [
					{pubkey:new PublicKey(GAME_ACCOUNT), isSigner: false, isWritable: true},
					{pubkey:this.props.localPayerAccount.publicKey, isSigner: true, isWritable: false},
					{pubkey:clock, isSigner: false, isWritable: false}
				],
				programId,
				data: Buffer.concat([ Buffer.from([3]), Buffer.from(this.state.myCommit) ])
			});
			let _transaction =  new Transaction().add(instruction);	
			let { blockhash } = await this.props._connection.getRecentBlockhash();
			_transaction.recentBlockhash = blockhash;				
			_transaction.sign(this.props.localPayerAccount);
			txid = await sendAndConfirmTransaction(
				'acceptChallenge',
				this.props._connection,
				_transaction,
				this.props.localPayerAccount,
			);
		}
		console.log(txid);
	}
	
	
	subscribeToGame(){
		if(!this.props.ws){return}
		let message = {
			"jsonrpc":"2.0", 
			"id":909, 
			"method":"accountSubscribe",
			"params":[]
		}
		message.params = [GAME_ACCOUNT,{"encoding":"jsonParsed"} ]; 
		this.props.ws.send(JSON.stringify(message));		
	}

	render(){
		return(<div className="stageHolder">
			<h3 id="title">			
				{
					((this.state.timeLimit < 0 || (this.state.gameStatus === 0 || this.state.gameStatus === 2)) && this.state.gameStatus !== 1) ?
					<Button block variant="danger" onClick={this.createChallenge}> PLAYER 1 PRESS START </Button> : null
				}
				
				◎ survivor *alpha*
				{ 
					(this.state.gameStatus === 1) ?
					<Button block variant="danger" onClick={this.acceptChallenge}> PLAYER 2 PRESS START </Button> : null	
				}
			</h3>
				<div>
					<div id="player1Stats">
						<b>
							{(this.state.player1HonestReveal > 0 && this.state.player1HonestReveal === 8) ? "honest" : null }						
							{this.state.player1DidCommit === 1 ? " commit" : null }
						</b>
					</div>
					<div id="player2Stats">
						<b>
							{(this.state.player2HonestReveal > 0 && this.state.player2HonestReveal === 8) ? "honest" : null }
							{this.state.player2DidCommit === 1 ? " commit" : null }
						</b>
					</div>
				</div>
			<div><ProgressBar variant={this.state.timeLimit > 40 ? "primary" : "danger"} striped min={0} max={180} now={this.state.timeLimit} label={"TIME: "+Math.floor(this.state.timeLimit)+"s"} /></div>
			<div id="moveTimeout">
				<ProgressBar variant="warning" 
					 striped min={0} max={10} 
					now={this.state.moveTimeoutValue} 
					label={Math.floor(this.state.moveTimeoutValue)}
				/>
			</div>
			<div>
				<div id="player1Stats">
					<b>{this.state.player1 ? this.state.player1.slice(0,15) : null}</b> 
					<br/><meter min={0} max={100} value={this.state.player1Super}/>
					<br/><ProgressBar variant={this.state.player1Health > 40 ? "success" : "danger"}  min={0} max={100} now={this.state.player1Health} />
					<br/><marquee direction="right">{this.state.p1Action.toUpperCase()}</marquee >
				</div>
				<div id="player2Stats">
						<b>{this.state.player2 ? this.state.player2.slice(0,15) : null}</b> 
						<br/><meter min={0} max={100} value={this.state.player2Super}/>
						<br/><ProgressBar id="player2HealthBar" variant={this.state.player2Health > 40 ? "success" : "danger"} min={0} max={100} now={this.state.player2Health}/>
						<br/><marquee loop={0} direction="left">{this.state.p2Action.toUpperCase()}</marquee>
				</div>
				<br/>
				{(this.state.isPlayer1 || this.state.isPlayer2) ?
				<div>
					<ButtonGroup id="playerOptions">
						{ this.state.isPlayer1 && this.state.player1DidCommit === 1 ? <Button block variant="primary" onClick={()=>{this.reveal("attack")}}>UNLEASH </Button>  : null }
						<Button variant="success" onClick={()=>{this.commit("attack")}} >ATTACK</Button>
						<Button variant="default" onClick={()=>{this.commit("gaurd")}} >BLOCK</Button>
						<Button variant="warning" onClick={()=>{this.commit("counter")}} >COUNTER</Button>
						<Button variant="info" onClick={()=>{this.commit("taunt")}} >TAUNT</Button>
						{ this.state.isPlayer2 && this.state.player2DidCommit === 1 ? <Button block variant="primary" onClick={()=>{this.reveal("attack")}}>UNLEASH </Button>  : null }
					</ButtonGroup>
				</div>:null
				}
				<WebGLView src={"./solsurvivor/index.html"}/>
		
			</div>
			<Button block size="sm" variant="info" onClick={this.muteMusic}> <span role="img"> { !this.state.muted ? "🔇": "📢"} </span>  </Button>
			<audio id="backgroundMusic" src={this.state.backgroundMusic} />
		</div>)
	}
}

export { Stage };
