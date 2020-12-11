import React from 'react';
import { pbkdf2 } from 'crypto';
import { randomBytes, secretbox,sign } from 'tweetnacl';
import * as bip32 from 'bip32';
import bs58 from 'bs58';
import * as bip39 from 'bip39';

import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import InputBase from '@material-ui/core/InputBase';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';

async function generateMnemonicAndSeed() {
  const mnemonic = bip39.generateMnemonic(128);
  const seed = await bip39.mnemonicToSeed(mnemonic);
  return { mnemonic, seed: Buffer.from(seed).toString('hex') };
}

async function mnemonicToSeed(mnemonic) {
	const bip39 = await import('bip39');
	if (!bip39.validateMnemonic(mnemonic)) {throw new Error('Invalid seed words');}
	const seed = await bip39.mnemonicToSeed(mnemonic);
	return Buffer.from(seed).toString('hex');
}

function hasLockedMnemonicAndSeed() {
  return !!localStorage.getItem('locked');
}

async function storeMnemonicAndSeed(mnemonic, seed, password) {
	const plaintext = JSON.stringify({ mnemonic, seed });
	if (password) {
		const salt = randomBytes(16);
		const kdf = 'pbkdf2';
		const iterations = 100000;
		const digest = 'sha256';
		const key = await deriveEncryptionKey(password, salt, iterations, digest);
		const nonce = randomBytes(secretbox.nonceLength);
		const encrypted = secretbox(Buffer.from(plaintext), nonce, key);
		localStorage.setItem(
			'locked',
			JSON.stringify({
				encrypted: bs58.encode(encrypted),
				nonce: bs58.encode(nonce),
				kdf,
				salt: bs58.encode(salt),
				iterations,
				digest,
			}),
		);
		localStorage.removeItem('unlocked');
		sessionStorage.removeItem('unlocked');
	} 
	else{
		localStorage.setItem('unlocked', plaintext);
		localStorage.removeItem('locked');
		sessionStorage.removeItem('unlocked');
	}
}

async function loadMnemonicAndSeed(password,notify) {
	const {
		encrypted: encodedEncrypted,
		nonce: encodedNonce,
		salt: encodedSalt,
		iterations,
		digest,
	} = JSON.parse(localStorage.getItem('locked'));
	const encrypted = bs58.decode(encodedEncrypted);
	const nonce = bs58.decode(encodedNonce);
	const salt = bs58.decode(encodedSalt);
	const key = await deriveEncryptionKey(password, salt, iterations, digest);
	const plaintext = secretbox.open(encrypted, nonce, key);
	if(!plaintext){return notify('Incorrect password',"error");}
	const decodedPlaintext = Buffer.from(plaintext).toString();
	const { mnemonic, seed } = JSON.parse(decodedPlaintext);
	const privateKey = deriveImportsEncryptionKey(seed);
	return { mnemonic, seed, privateKey };
}

async function deriveEncryptionKey(password, salt, iterations, digest) {
  return new Promise((resolve, reject) =>
    pbkdf2(
      password,
      salt,
      iterations,
      secretbox.keyLength,
      digest,
      (err, key) => (err ? reject(err) : resolve(key)),
    ),
  );
}

// Returns the 32 byte key used to encrypt imported private keys.
function deriveImportsEncryptionKey(seed) {
  // SLIP16 derivation path.
  return bip32.fromSeed(Buffer.from(seed, 'hex')).derivePath("m/10016'/0").privateKey;
}

class SecureWallet extends React.Component{ 
	constructor(props){
		super(props);
		this.state = {
			loggedIn:false,
			mnemonic:false,
			restoringAccount:false,
			seed:false,
			seedSaved:false,
			unlocked:false,
			userPromise:false,
		}
		this.cancelPromise = this.cancelPromise.bind(this);
		this.generateMnemonicAndSeed = this.generateMnemonicAndSeed.bind(this);
		this.restoreAccount = this.restoreAccount.bind(this);
		this.storeMnemonicAndSeed = this.storeMnemonicAndSeed.bind(this);
		this.unlockAccount = this.unlockAccount.bind(this);
		this.updatePromise = this.updatePromise.bind(this);
	}
	
	cancelPromise(){
		return this.setState({mnemonic:false,userPromise:false});
	}
	
	componentDidMount(){
		if(hasLockedMnemonicAndSeed()){
			this.setState({seedSaved:true});
		}
	}
	
	async generateMnemonicAndSeed(){
		if(!this.state.mnemonic){
			let { mnemonic, seed } = await generateMnemonicAndSeed();
			this.setState({mnemonic,seed});
		}
		return;
	}
	
	async restoreAccount(){
		let mnemonic = document.getElementById("mnemonic").value;
		let pwd1 = document.getElementById("pwd1");
		let pwd2 = document.getElementById("pwd2");
		if(pwd1.value !== pwd2.value){return alert("Passwords Do Not Match!");}
		if(mnemonic && pwd1.value){
			let seed = await mnemonicToSeed(mnemonic);
			await storeMnemonicAndSeed(mnemonic, seed, pwd1.value);
			await this.unlockAccount(pwd1.value);
		}
	}
	
	async storeMnemonicAndSeed(){
		let pwd1 = document.getElementById("pwd1");
		let pwd2 = document.getElementById("pwd2");
		if(pwd1.value !== pwd2.value){return alert("Passwords Do Not Match!");}
		await storeMnemonicAndSeed(this.state.mnemonic,this.state.seed,pwd1.value);
		this.setState({seedSaved:true,unlocked:true},async ()=>{
			await this.unlockAccount(pwd1.value);
		});
	}
	
	async unlockAccount(pwd){
		let acc;
		if(!pwd){ acc = await loadMnemonicAndSeed(document.getElementById("pwd3").value,this.props.notify);}
		else{acc = await loadMnemonicAndSeed(pwd,this.props.notify);}
		if(acc && acc.mnemonic && acc.seed){
			let walletIndex = 0;
			let accountIndex = 0;
			const seed = await bip39.mnemonicToSeed(acc.mnemonic);
			const derivedSeed = bip32.fromSeed(seed).derivePath(`m/501'/${walletIndex}'/0/${accountIndex}`).privateKey;
			let s = sign.keyPair.fromSeed(derivedSeed).secretKey;
			this.props.importKey(Buffer(s).toString("base64"),true)
			.catch(console.warn);
		}
	}
	
	updatePromise(){
		return this.setState({userPromise:true});
	}
	
	render(){
		return(<div>
		{
			(!this.state.seedSaved && !this.state.restoringAccount)?
			<div>
				<Button color="primary" variant="contained" onClick={this.generateMnemonicAndSeed}> New Account </Button>
				<Button color="secondary" variant="outlined" onClick={()=>{return this.setState({restoringAccount:true})}}> Restore Account </Button>
				{
					this.state.mnemonic && !this.state.seedSaved? 
						<Card className="secureWalletCard">
							<Button id="titleButton">seed words</Button>
							<Typography variant="h4" component="p"> {this.state.mnemonic} </Typography>
							<CardActionArea>
								<CardContent>
									<Typography variant="body2" color="textSecondary" component="p">
										Your private keys are only stored on your current computer or device. 
										You will need these words to restore your wallet 
										if your browser's storage is cleared or your device is damaged or lost.										
									</Typography>
								</CardContent>
							</CardActionArea>
							<div id="secureWalletPromise">
								{
									!this.state.userPromise ?
									<Button variant="contained" onClick={this.updatePromise}><span role="img" aria-label="handshake">🤝</span> I Promise I Have Saved My Seed Words <span aria-label="handshake" role="img">🤝</span></Button>
									:
									<form noValidate autoComplete="off">
										<TextField fullWidth id="pwd1" label="password" variant="outlined" type="password"/>
										<br/><TextField fullWidth id="pwd2" label="password" variant="outlined" type="password"/>
									</form>
								}
							</div>
							<CardActions>
								{
									this.state.userPromise ?
									<div id="secureButtons">
										<Button color="secondary" onClick={this.cancelPromise}>Cancel</Button>
										<Button id="protectButton" color="primary" variant="contained" onClick={this.storeMnemonicAndSeed}>Password Protect Account</Button>
									</div>	
									: null
								}	
							</CardActions>
						</Card>
					:null
				}
			</div>
			:null
		}
		{
			((this.state.seedSaved && !this.state.unlocked) && !this.state.restoringAccount) ?
			<div>
				<Paper component="form" id="secureMessageForm">
					<InputBase
						id="pwd3"
						type="password"
						inputProps={{ 'aria-label': 'password' }}
						onKeyDown={async (evt)=>{if(evt.keyCode === 13){evt.preventDefault(); return await this.unlockAccount();} }}
					/>
					<Button onClick={async()=>{return await this.unlockAccount();}} color="primary" variant="contained">unlock account</Button>
				</Paper>
			</div>
			:null
		}
		{
			this.state.restoringAccount ?
			<div>
				<Card className="restoreWalletCard">
					<Button id="titleButton">MNEMONIC RESTORE</Button>
					<div id="secureWalletPromise">
						<form noValidate autoComplete="off">
							<TextField fullWidth id="mnemonic" label="mnemonic" variant="outlined" type="text"/>
							<br/>Password Protect<br/>
							<br/><TextField fullWidth id="pwd1" label="new password" variant="outlined" type="password"/>
							<br/><TextField fullWidth id="pwd2" label="confirm password" variant="outlined" type="password"/>
						</form>
					</div>
					<CardActions>
						<div id="secureButtons">
							<Button onClick={()=>{return this.setState({restoringAccount:false})}} color="secondary" variant="contained">cancel</Button>
							<Button id="protectButton" onClick={async()=>{return await this.restoreAccount();}} color="primary" variant="contained">restore account</Button>
						</div>	
					</CardActions>
				</Card>
			</div>
			:null
		}
		</div>)
	}
}



export { SecureWallet }
