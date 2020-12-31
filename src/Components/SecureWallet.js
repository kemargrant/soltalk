import React from 'react';
import { pbkdf2 } from 'crypto';
import { randomBytes, secretbox,sign } from 'tweetnacl';
import * as bip32 from 'bip32';
import bs58 from 'bs58';
import * as bip39 from 'bip39';

import { Row, Col, Card, CardBody, FormGroup, Input, Button, InputGroup, InputGroupAddon } from 'reactstrap';

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
				<Button color="info" block onClick={this.generateMnemonicAndSeed}> New Account </Button>
				<Button color="danger" variant="outlined" block onClick={()=>{return this.setState({restoringAccount:true})}}> Restore Account </Button>
				<div className="secureWalletCard">
					<Row className="justify-content-center">
						<Col md={8} lg={6} xl={5} >
							{
								this.state.mnemonic && !this.state.seedSaved?
										<Card>
											<CardBody className="p-4">
												Your private keys are only stored on your current computer or device. 
												You will need these words to restore your wallet 
												if your browser's storage is cleared or your device is damaged or lost.										
											</CardBody>
											<h4> {this.state.mnemonic} </h4>
											<br/>
											<div id="secureWalletPromise">
												{
													!this.state.userPromise ?
													<Button variant="contained" onClick={this.updatePromise}><i className="ri-service-fill mr-1 align-middle"></i> I Promise I Have Saved My Seed Words <i className="ri-service-fill mr-1 align-middle"></i></Button>
													:
													<FormGroup className="mb-4">
														<InputGroup className="mb-3 bg-soft-light input-group-lg rounded-lg">
															<InputGroupAddon addonType="prepend">
																<span className="input-group-text border-light text-muted">
																	<i className="ri-lock-2-line"></i>
																</span>
															</InputGroupAddon>
															<Input
																type="password"
																id="pwd1"
																name="password1"
																className="form-control bg-soft-light border-light"
																placeholder="Enter Password"
															/>																						
														</InputGroup>
														<InputGroup className="mb-3 bg-soft-light input-group-lg rounded-lg">
															<InputGroupAddon addonType="prepend">
																<span className="input-group-text border-light text-muted">
																	<i className="ri-lock-2-line"></i>
																</span>
															</InputGroupAddon>
															<Input
																type="password"
																id="pwd2"
																name="password2"
																className="form-control bg-soft-light border-light"
																placeholder="Confirm Password"
															/>																						
														</InputGroup>
													</FormGroup>
												}
											</div>
												{
													this.state.userPromise ?
													<div id="secureButtons">
														<Button id="cancelProtect" color="secondary" onClick={this.cancelPromise}>Cancel</Button>
														<Button id="protectButton" color="primary" vonClick={this.storeMnemonicAndSeed}>Submit</Button>
													</div>	
													: null
												}
											<br/>	
										</Card>
								:null
							}
						</Col>
					</Row>
				</div>
			</div>
			:null
		}
		{
			((this.state.seedSaved && !this.state.unlocked) && !this.state.restoringAccount) ?
			<div>
				<Input
					id="pwd3"
					type="password"
					className="form-control bg-soft-light border-light"
					onKeyDown={async (evt)=>{if(evt.keyCode === 13){evt.preventDefault(); return await this.unlockAccount();} }}
				/>
				<Button color="primary" block className=" waves-effect waves-light" onClick={async()=>{return await this.unlockAccount();}}> LOGIN </Button>
			</div>
			:null
		}
		{
			this.state.restoringAccount ?
			<div className="restoreWalletCard">
				<Row className="justify-content-center">
					<Col md={8} lg={6} xl={5}>
						<Card>
							<div>
								<FormGroup className="mb-4">
									<InputGroup className="mb-3 bg-soft-light input-group-lg rounded-lg">
										<Input
											type="text"
											id="mnemonic"
											name="mnemonic"
											className="form-control bg-soft-light border-light"
											placeholder="mnemonic"
										/>																						
									</InputGroup>						
									<InputGroup className="mb-3 bg-soft-light input-group-lg rounded-lg">
										<InputGroupAddon addonType="prepend">
											<span className="input-group-text border-light text-muted">
												<i className="ri-lock-2-line"></i>
											</span>
										</InputGroupAddon>
										<Input
											type="password"
											id="pwd1"
											name="password1"
											className="form-control bg-soft-light border-light"
											placeholder="New Password"
										/>																						
									</InputGroup>
									<InputGroup className="mb-3 bg-soft-light input-group-lg rounded-lg">
										<InputGroupAddon addonType="prepend">
											<span className="input-group-text border-light text-muted">
												<i className="ri-lock-2-line"></i>
											</span>
										</InputGroupAddon>
										<Input
											type="password"
											id="pwd2"
											name="password2"
											className="form-control bg-soft-light border-light"
											placeholder="Confirm Password"
										/>																						
									</InputGroup>
								</FormGroup>
							</div>
							<div id="secureButtons">
								<Button onClick={()=>{return this.setState({restoringAccount:false})}} color="secondary" variant="contained">cancel</Button>
								<Button id="protectButton" onClick={async()=>{return await this.restoreAccount();}} color="primary" variant="contained">restore account</Button>
							</div>	
						</Card>
					</Col>
				</Row>
			</div>
			:null
		}
		</div>)
	}
}




export { SecureWallet }
