import {
  Account,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  Token,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import bs58 from 'bs58';

const { Numberu64 } = require("@solana/spl-token-swap");

const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const SYSVAR_RENT_PUBKEY = new PublicKey("SysvarRent111111111111111111111111111111111");
const systemClock = new PublicKey("SysvarC1ock11111111111111111111111111111111");		
const tokenProgram =  new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

function get64BitTime(byteArray){
	if(!byteArray){return 0;}
	let trim = byteArray.reverse().slice(4)
	let nArray = new Uint8Array(trim);
	let buffer = Buffer.from(nArray);
	let hex = "0x"+buffer.toString("hex");
	let big = window.BigInt(hex);
	big = big.toString();
	big = Number(big);
	let time = new Date( (big *1000) );
	return time;
}

function get64Value(array){
	let hex = "0x"+array.toString("hex");
	let big = window.BigInt(hex);
	big = big.toString();
	big = Number(big);
	return big;
}

const findAssociatedTokenAccountPublicKey = async (ownerPublicKey,tokenMintPublicKey) =>(
    await PublicKey.findProgramAddress(
      [
        ownerPublicKey.toBuffer(),
		TOKEN_PROGRAM_ID.toBuffer(),
        tokenMintPublicKey.toBuffer()
      ],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
    )
 )[0];
  
function sleep(secs){
	return new Promise((resolve,reject)=>{
		let sleeping=0;
		let progress = setInterval(()=>{console.log("sleeping:",sleeping++)},999)
		return setTimeout(()=>{ return resolve(clearInterval(progress)); },secs*1000);
	});
}

async function getContractAuth(buf,programId){
	let seed = buf!== false ? buf : Buffer.from("1");
	let addr;
	try{
		addr = await PublicKey.createProgramAddress(
			[seed],
			programId
		);	
	}
	catch(e){
		seed[0]++;
		return getContractAuth(seed,programId);
	}
	return [addr,seed];
}

function createIx( funderPubkey,associatedTokenAccountPublicKey,ownerPublicKey,tokenMintPublicKey ){
	return new TransactionInstruction({
		programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
		data: Buffer.from([]),
		keys: [
			{ pubkey: funderPubkey, isSigner: true, isWritable: true },
			{
				pubkey: associatedTokenAccountPublicKey,
				isSigner: false,
				isWritable: true
			},
			{ pubkey: ownerPublicKey, isSigner: false, isWritable: false },
			{ pubkey: tokenMintPublicKey, isSigner: false, isWritable: false },
			{ pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
			{ pubkey: tokenProgram, isSigner: false, isWritable: false },
			{ pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
		]
	});
}


function WagerClient(config){
	this.connection = config.connection;
	//Contract end time (from unix epoch)
	this.contractAccount = config.contractAccount;
	this.contractPotAccount = null;
	this.endTime = config.endTime;
	this.fee = (config.fee && config.fee > 0) ? config.fee : 0;
	this.feePayer = config.feePayer;
	this.feeAccount = config.feeAccount;
	this.oracleAccount = config.oracleAccount;
	this.override = config.override;
	this.potMint = config.potMint;
	this.programId = config.programId;
	this.minimumBet = config.minimumBet
	this.mintAccounts = [];
	//default settings
	this.decimals = 6;
	return this;
}

WagerClient.prototype.closeAccounts = function(returnIx= false){
	return new Promise(async(resolve,reject)=>{	
		let associatedTokenAccountPublicKey1 = await findAssociatedTokenAccountPublicKey(this.feePayer.publicKey ? this.feePayer.publicKey : this.feePayer,this.mintAccounts[0]);	
		let associatedTokenAccountPublicKey2 = await findAssociatedTokenAccountPublicKey(this.feePayer.publicKey ? this.feePayer.publicKey : this.feePayer,this.mintAccounts[1]);			
		let accountsToClose = [false,false];
		let closeIx = [];		
		if(await this.connection.getAccountInfo(associatedTokenAccountPublicKey1) ){
			accountsToClose[0] = associatedTokenAccountPublicKey1;
		}
		if(await this.connection.getAccountInfo(associatedTokenAccountPublicKey2) ){
			accountsToClose[1] = associatedTokenAccountPublicKey2;
		};		
		let token;
		let balance = 0;
		let burn;
		let closeTI;
		if( accountsToClose[0] ){
			token = new Token(
				this.connection,
				this.mintAccounts[0],
				tokenProgram,
				this.feePayer
			);
			balance = await this.getBalance(accountsToClose[0]);
			if(!returnIx){
				if(balance > 0){
					await token.burn(
					  accountsToClose[0],
					  this.feePayer,
					  [],
					  balance
					);
				}
				await token.closeAccount(
					accountsToClose[0],
					this.feePayer.publicKey ? this.feePayer.publicKey : this.feePayer,
					this.feePayer.publicKey ? this.feePayer.publicKey : this.feePayer,
					[],
				);
				console.log("Token Account 1 Closed");
			}
			else{
				if(balance > 0 ){
					burn = Token.createBurnInstruction(
					  tokenProgram,
					  this.mintAccounts[0],
					  accountsToClose[0],
					  this.feePayer,
					  [],
					  balance
					);
					closeIx.push(burn);
				}
				closeTI = Token.createCloseAccountInstruction(
					tokenProgram,
					accountsToClose[0],
					this.feePayer.publicKey ? this.feePayer.publicKey : this.feePayer,
					this.feePayer.publicKey ? this.feePayer.publicKey : this.feePayer,
					[],
				);
				closeIx.push(closeTI);
			}
		}
		if(accountsToClose[1] ){
			token = new Token(
				this.connection,
				this.mintAccounts[1],
				tokenProgram,
				this.feePayer
			);
			balance = await this.getBalance(accountsToClose[1]);
			if(!returnIx){
				if(balance > 0){
					await token.burn(
					  accountsToClose[1],
					  this.feePayer,
					  [],
					  balance
					);
				}
				await token.closeAccount(
					accountsToClose[1],
					this.feePayer.publicKey ? this.feePayer.publicKey : this.feePayer,
					this.feePayer.publicKey ? this.feePayer.publicKey : this.feePayer,
					[],
				);
				console.log("Token Account 2 Closed");
			}
			else{
				if(balance > 0 ){
					burn = Token.createBurnInstruction(
					  tokenProgram,
					  this.mintAccounts[1],
					  accountsToClose[1],
					  this.feePayer,
					  [],
					  balance
					);
					closeIx.push(burn);
				}
				closeTI = Token.createCloseAccountInstruction(
					tokenProgram,
					accountsToClose[1],
					this.feePayer.publicKey ? this.feePayer.publicKey : this.feePayer,
					this.feePayer.publicKey ? this.feePayer.publicKey : this.feePayer,
					[],
				);
				closeIx.push(closeTI);
			}
		}
		resolve( closeIx );
	});
}

WagerClient.prototype.closeContract = function(outcome,returnIx = false){
	return new Promise(async(resolve,reject)=>{
		let contractAccountPublicKey = this.contractAccount.publicKey ? this.contractAccount.publicKey : this.contractAccount;		
		console.log("Closing Contract");
		//Accounts [ContractAccount,SystemClock,OracleAccount]		
		let closeIx = new TransactionInstruction({
			keys: [
				{pubkey: contractAccountPublicKey, isSigner: false, isWritable:true},
				{pubkey: systemClock, isSigner:false, isWritable:false},	
				{pubkey: this.oracleAccount.publicKey, isSigner:true, isWritable:true},	
			],
			programId:this.programId,
			data: Buffer.concat ([ Buffer.from([2]),Buffer.from([outcome]) ])
		});
		if(!returnIx){
			try{
				var  finalize =  new Transaction().add(closeIx);	
				let tx = await sendAndConfirmTransaction(
					this.connection,
					finalize,
					[this.oracleAccount],
					{
					  commitment: 'singleGossip',
					  preflightCommitment: 'singleGossip',  
					},
				); 
				console.log("tx tokens",tx);
			}
			catch(e){
				console.error(e);
			}
		}
		return resolve([closeIx]);
	});
}

WagerClient.prototype.createPot = function(returnIx = false){
	return new Promise(async(resolve,reject)=>{
		let [ contractAuthority ] = await getContractAuth(false,this.programId);
		//////////////////////////////////////////////////
		//Create Pot Token Account Just for the event
		//
		let potTokenAccount = await findAssociatedTokenAccountPublicKey(contractAuthority,this.potMint);
		let info = await this.connection.getAccountInfo(potTokenAccount);
		let ix;
		if(!info){
			try{
				ix = createIx(
				  this.feePayer.publicKey,
				  potTokenAccount,
				  contractAuthority,
				  this.potMint
				);
				if(!returnIx){
					await sendAndConfirmTransaction(
						this.connection,
						new Transaction().add(ix),
						[this.feePayer],
						{
						  commitment: 'singleGossip',
						  preflightCommitment: 'singleGossip',
						},
					  );	
				}	
			}
			catch(e){
				console.log("Set Authority Failed:",e);
			}
		}
		else{
			console.log("Pot token account exists:",potTokenAccount.toBase58());
		}
		return resolve( [ potTokenAccount,ix ] );
	});
}

WagerClient.prototype.findAssociatedTokenAccountPublicKey = function(pk,mint){
	return new Promise((resolve,reject)=>{
		return resolve(findAssociatedTokenAccountPublicKey(pk,mint));
	})
}

WagerClient.prototype.getBalance = function(publicKey){ 
	return new Promise(async(resolve,reject)=>{ 
			let balance = 0;
			let info;
			try{
				info = await this.connection.getAccountInfo(publicKey);
				balance = get64Value(info.data.slice(64,72).reverse());
			 }
			 catch(e){
				console.log(e);
			}
			return resolve ( balance );
	}); 
};

WagerClient.prototype.getContractAuth = function(buf,programId){ return new Promise(async(resolve,reject)=>{ return resolve(getContractAuth(buf,programId)); }); };

WagerClient.prototype.getFeePayerWagerTokenAccount = function(returnIx = false){
	return new Promise(async(resolve,reject)=>{
		let associatedAccount = await findAssociatedTokenAccountPublicKey(this.feePayer.publicKey ? this.feePayer.publicKey : this.feePayer,this.potMint);
		let info = await this.connection.getAccountInfo(associatedAccount);
		let exists = false;
		let creationIx = false;
		if(!info){
			console.log("Creating Token Account for Fee Payer",associatedAccount.toBase58());
			let ix = createIx(
			  this.feePayer.publicKey ? this.feePayer.publicKey : this.feePayer,
			  associatedAccount,
			  this.feePayer.publicKey ? this.feePayer.publicKey : this.feePayer,
			  this.potMint
			);
			creationIx = ix;
			if(!returnIx){
				await sendAndConfirmTransaction(
					this.connection,
					new Transaction().add(ix),
					[this.feePayer],
					{
					  commitment: 'singleGossip',
					  preflightCommitment: 'singleGossip',
					},
				  );
		  }
		}
		else{
			exists = true;
			console.log("Existing Token Account for Fee Payer",associatedAccount.toBase58());
		}
		return resolve ( [ associatedAccount,exists,creationIx ] );
	})
};

WagerClient.prototype.mintPx= function(position,amount,returnIx = false){
	return new Promise(async(resolve,reject)=>{	
		let contractAccountPublicKey = this.contractAccount.publicKey ? this.contractAccount.publicKey : this.contractAccount;
		let mintAccountxPublicKey = this.mintAccounts[position-1].publicKey ? this.mintAccounts[position-1].publicKey : this.mintAccounts[position-1];
		let [ payerWagerTokenAccount ] = await this.getFeePayerWagerTokenAccount();
		let contractWagerTokenAccount = this.contractPotAccount.publicKey ? this.contractPotAccount.publicKey : this.contractPotAccount;
		let wagerMint = this.potMint.publicKey ? this.potMint.publicKey : this.potMint;
		//Create Mint Account For the User
		let [contractAuthority,seed] = await getContractAuth(false,this.programId);			
		let associatedTokenAccountPublicKey = await findAssociatedTokenAccountPublicKey(this.feePayer.publicKey ? this.feePayer.publicKey : this.feePayer ,mintAccountxPublicKey);	
		let wagerAmount =  amount * Math.pow(10,this.decimals);	
		let wagerAmountBuffer = new Numberu64( amount * Math.pow(10,this.decimals) ).toBuffer();
		let mintIx = [];
		const assocIx = createIx(
		  this.feePayer.publicKey ? this.feePayer.publicKey : this.feePayer,
		  associatedTokenAccountPublicKey,
		  this.feePayer.publicKey ? this.feePayer.publicKey : this.feePayer,
		  mintAccountxPublicKey
		);
		mintIx.push(assocIx);
		if(!returnIx){
			console.log("Creating Mintx Token Account:",associatedTokenAccountPublicKey.toBase58());
			await sendAndConfirmTransaction(
				this.connection,
				new Transaction().add(assocIx),
				[this.feePayer],
				{
				  commitment: 'singleGossip',
				  preflightCommitment: 'singleGossip',
				},
			  );
		}
		//Delegate tokens from WagerToken to be handled by the contract account
		if(!returnIx){
			const token = new Token(
				this.connection,
				wagerMint,
				tokenProgram,
				this.feePayer
			);
			await token.approve(
				payerWagerTokenAccount,
				contractAuthority,
				this.feePayer,
				[],
				wagerAmount
			);
			console.log("Approved Contract to move "+amount+" tokens from ",payerWagerTokenAccount.toBase58());
		}
		else{
			let contractDelegateInstruction = Token.createApproveInstruction(
				tokenProgram,
				payerWagerTokenAccount,
				contractAuthority,
				this.feePayer.publicKey ? this.feePayer.publicKey : this.feePayer,
				[],
				wagerAmount
			);
			mintIx.push(contractDelegateInstruction);
		}
		//Accounts [ContractAccount,SystemClock,TokenMint1 || TokenMint2,PotTokenAccount,UserTokenAccount,ProgramAuthority,TokenProgram,feeAccount]
		var instruction = new TransactionInstruction({
			keys: [
				{pubkey: contractAccountPublicKey, isSigner: false, isWritable:true},
				{pubkey: systemClock, isSigner:false, isWritable:false},	
				{pubkey: mintAccountxPublicKey, isSigner:false, isWritable:true},
				{pubkey: contractWagerTokenAccount , isSigner:false, isWritable:true},	
				{pubkey: payerWagerTokenAccount, isSigner:false, isWritable:true},					
				{pubkey: contractAuthority, isSigner:false, isWritable:false},
				{pubkey: tokenProgram, isSigner:false, isWritable:false},
				{pubkey: associatedTokenAccountPublicKey,isSigner:false,isWritable:true},
				{pubkey: this.feeAccount, isSigner:false, isWritable:true}							
			],
			programId:this.programId,
			data: Buffer.concat ([ Buffer.from([1]), seed, wagerAmountBuffer ])
		});

		if(!returnIx){
			var MintTo =  new Transaction().add(instruction);	
			let txTokens = await sendAndConfirmTransaction(
				this.connection,
				MintTo,
				[this.feePayer],
				{
					skipPreflight:true,
				  commitment: 'singleGossip',
				  //preflightCommitment: 'singleGossip',  
				},
			); 
			console.log("tx tokens",txTokens);
		}
		mintIx.push(instruction);
		resolve( [ mintIx,associatedTokenAccountPublicKey ] );
	});
}

WagerClient.prototype.recreateContract = function(){
	return new Promise(async(resolve,reject)=>{
		let data = await this.viewContractData();
		this.mintAccounts = [
			new PublicKey( bs58.encode(data.TokenMint1) ),
			new PublicKey( bs58.encode(data.TokenMint2) )
		]
		this.feeAccount = new PublicKey( bs58.encode(data.FeeAccount) );
		this.oracleAccount = new PublicKey( bs58.encode(data.OracleAccount) );			
		this.contractPotAccount = new PublicKey( bs58.encode(data.PotTokenAccount) );
		this.endTime = data.EndTime;	
		this.override = data.OverRideTime[0];
		this.outcome = data.Outcome[0];
		this.fee = get64Value( data.Fee.reverse() );
		this.minimumBet = get64Value( data.MinimumBet.reverse() );
		let p1 =  await this.connection.getAccountInfo(this.mintAccounts[0]); 
		let p2 =  await this.connection.getAccountInfo(this.mintAccounts[1]);
		this.positions = [0,0]
		if(p1 && p1.data){
			this.positions[0] = get64Value( p1.data.slice(36,44).reverse() );
		}
		if(p2 && p2.data){
			this.positions[1] = get64Value( p2.data.slice(36,44).reverse() );
		}
		resolve(true);
	});
}


WagerClient.prototype.redeemContract = function (position,returnIx = false){
	return new Promise(async(resolve,reject)=>{
		let contractAccount = this.contractAccount.publicKey ? this.contractAccount.publicKey : this.contractAccount;
		let mintAccountxPublicKey = this.mintAccounts[position-1].publicKey ? this.mintAccounts[position-1].publicKey : this.mintAccounts[position-1];				
		let mintAccount1PublicKey = this.mintAccounts[0].publicKey ? this.mintAccounts[0].publicKey : this.mintAccounts[0];
		let mintAccount2PublicKey = this.mintAccounts[1].publicKey ? this.mintAccounts[1].publicKey : this.mintAccounts[1];		
		let [ payerWagerTokenAccount ] = await this.getFeePayerWagerTokenAccount();
		let contractWagerTokenAccount = this.contractPotAccount.publicKey ? this.contractPotAccount.publicKey : this.contractPotAccount;
		let associatedTokenAccountPublicKey = await findAssociatedTokenAccountPublicKey(this.feePayer.publicKey ? this.feePayer.publicKey : this.feePayer ,mintAccountxPublicKey);		
		let [contractAuthority,seed] = await getContractAuth(false,this.programId);	
		let redeemIxs = [];
		let userMintTokenAccount = await this.connection.getAccountInfo(associatedTokenAccountPublicKey);
		let redeemAmount = get64Value(userMintTokenAccount.data.slice(64,72).reverse());
		//delegateAmount to Burn from the minted tokens
		let contractDelegateInstruction = Token.createApproveInstruction(
			tokenProgram,
			associatedTokenAccountPublicKey,
			contractAuthority,
			this.feePayer.publicKey ? this.feePayer.publicKey : this.feePayer,
			[],
			redeemAmount
		);
		redeemIxs.push(contractDelegateInstruction);
		if(!returnIx){
			const token = new Token(
			  this.connection,
			  mintAccountxPublicKey,
			  tokenProgram,
			  this.feePayer
			);
			let approveTx = await token.approve(
			  associatedTokenAccountPublicKey,
			  contractAuthority,
			  this.feePayer,
			  [],
			  redeemAmount
			);
			console.log("Approved Contract to burn "+redeemAmount+" tokens",approveTx);
		}
		var instruction = new TransactionInstruction({
			keys: [
				{pubkey: contractAccount, isSigner: false, isWritable:true},
				{pubkey: systemClock, isSigner:false, isWritable:false},	
				{pubkey: mintAccount1PublicKey, isSigner:false, isWritable:true},
				{pubkey: mintAccount2PublicKey, isSigner:false, isWritable:true},				
				{pubkey: contractWagerTokenAccount , isSigner:false, isWritable:true},	
				{pubkey: payerWagerTokenAccount, isSigner:false, isWritable:true},					
				{pubkey: contractAuthority, isSigner:false, isWritable:false},
				{pubkey: tokenProgram, isSigner:false, isWritable:false},
				{pubkey: associatedTokenAccountPublicKey,isSigner:false,isWritable:true},
			],
			programId:this.programId,
			data: Buffer.concat ([Buffer.from([3]),seed])
		});
		redeemIxs.push(instruction);
		if(!returnIx){
			var redeem =  new Transaction().add(instruction);	
			let tx = await sendAndConfirmTransaction(
				this.connection,
				redeem,
				[this.feePayer],
				{
				  commitment: 'singleGossip',
				  preflightCommitment: 'singleGossip',  
				},
			); 
			console.log("redeem tx complete:",tx);
		}
		resolve(redeemIxs)
	});
}

WagerClient.prototype.setupContract = function(returnIx = false){
	return new Promise(async(resolve,reject)=>{
		console.log("setting up contract");
		//setup mints for each position
		let oracleAccount = this.oracleAccount.publicKey ? this.oracleAccount.publicKey : this.oracleAccount;
		let IxToReturn = [];
		this.mintAccounts = [ new Account() , new Account() ];
		let [contractAuthority,seed] = await getContractAuth(false,this.programId);
		console.log("Mint1:",this.mintAccounts[0].publicKey.toBase58(),"Mint2:",this.mintAccounts[1].publicKey.toBase58());
		console.log("Contract Authority:",contractAuthority.toBase58());
		//Create Mints
		let lamports = await this.connection.getMinimumBalanceForRentExemption(82,"singleGossip");
		let createMint1 = SystemProgram.createAccount({
		  fromPubkey: this.feePayer.publicKey ? this.feePayer.publicKey : this.feePayer,
		  newAccountPubkey: this.mintAccounts[0].publicKey,
		  lamports,
		  space:82,
		  programId: tokenProgram
		});
		let createMint2 = SystemProgram.createAccount({
		  fromPubkey: this.feePayer.publicKey ? this.feePayer.publicKey : this.feePayer,
		  newAccountPubkey: this.mintAccounts[1].publicKey,
		  lamports,
		  space:82,
		  programId: tokenProgram
		});	
		console.log(contractAuthority,contractAuthority.publicKey)	
		let initMintIx1 = Token.createInitMintInstruction(
			tokenProgram,
			this.mintAccounts[0].publicKey,
			this.decimals,
			contractAuthority,
			null
		);	
		let initMintIx2 = Token.createInitMintInstruction(
			tokenProgram,
			this.mintAccounts[1].publicKey,
			this.decimals,
			contractAuthority,
			null
		);	
		let createMintsIx = new Transaction().add(createMint1).add(initMintIx1).add(createMint2).add(initMintIx2);
		let accounts = [ this.feePayer ];
		accounts = accounts.concat(this.mintAccounts);
		IxToReturn = [ createMint1,initMintIx1,createMint2,initMintIx2 ];
		if(!returnIx){
			let tx = await sendAndConfirmTransaction(
				this.connection,
				createMintsIx ,
				accounts,
				{
				  commitment: 'singleGossip',
				  preflightCommitment: 'singleGossip',
				},
			  );
			console.log("Mints Initialized:",tx);
		}
		//Create Contract Account for the Program
		let contractAccount = new Account();
		this.contractAccount = contractAccount;
		let size = 186;
		let createAccIx3 = SystemProgram.createAccount({
		  fromPubkey: this.feePayer.publicKey? this.feePayer.publicKey : this.feePayer,
		  newAccountPubkey: contractAccount.publicKey,
		  lamports: await this.connection.getMinimumBalanceForRentExemption(size,"singleGossip"),
		  space:size,
		  programId:this.programId
		});	
		IxToReturn.push(createAccIx3);
		if(!returnIx){
			let tx2 = await sendAndConfirmTransaction(
				this.connection,
				new Transaction().add(createAccIx3),
				[this.feePayer,contractAccount],
				{
				  commitment: 'singleGossip',
				  preflightCommitment: 'singleGossip',
				},
			  );  
			console.log("Contract Account Created:",contractAccount.publicKey.toBase58(),tx2);					
		}
		//Create the pot
		let [ contractPotAccount , createPotIx ] = await this.createPot(returnIx);
		this.contractPotAccount = contractPotAccount;
		IxToReturn.push(createPotIx);	
		//Initialize Contract
		//endTimeOffset in Seconds
		let endTimeOffset = new Numberu64 ( this.endTime ).toBuffer();
		let minimumBet = new Numberu64( this.minimumBet * Math.pow(10,this.decimals) ).toBuffer();
		let fee = new Numberu64( this.fee ).toBuffer();
		//Override value should be the value of the seed used by the calling program to sign the transaction
		
		if(this.override > 0 ){
			let [oracleAccountAuthority,overrideSeed] = await getContractAuth(false,oracleAccount);
			this.oracleAccount = oracleAccountAuthority;
			oracleAccount = oracleAccountAuthority;
			this.override = overrideSeed[0];
		}
		var instruction = new TransactionInstruction({
			keys: [
				{pubkey: contractAccount.publicKey, isSigner: false, isWritable:true},
				{pubkey: systemClock, isSigner:false, isWritable:false},			
				{pubkey: this.mintAccounts[0].publicKey, isSigner:false, isWritable:false},
				{pubkey: this.mintAccounts[1].publicKey, isSigner:false, isWritable:false },
				{pubkey: contractPotAccount , isSigner:false, isWritable:false},	
				{pubkey: oracleAccount, isSigner:false, isWritable:false},
				{pubkey: this.feeAccount, isSigner:false, isWritable:true}
			],
			programId:this.programId,
			data: Buffer.concat ([ Buffer.from([0]), seed, minimumBet,endTimeOffset,fee,Buffer.from([this.override])  ])
		});
		IxToReturn.push(instruction);
		let setupTx;
		if(!returnIx){
			try{
				var sendSetupTx =  new Transaction().add(instruction);	
				setupTx = await sendAndConfirmTransaction(
					this.connection,
					sendSetupTx,
					[this.feePayer],
					{
					  commitment: 'singleGossip',
					  preflightCommitment: 'singleGossip',  
					},
				); 
			}
			catch(e){
				console.log("Error setting up contract:",e);
			}
			console.log("Contract Setup Complete",setupTx);
		}
		return resolve( [ contractAccount,this.mintAccounts[0],this.mintAccounts[1],contractPotAccount,this.potMint,IxToReturn ] );
	});
}

WagerClient.prototype.sleep = function(t){ return new Promise(async(resolve,reject)=>{ return await resolve ( sleep(t) ); }); };

WagerClient.prototype.viewContractData = function(contractAccountPublicKey){
	return new Promise(async(resolve,reject)=>{
		if(!contractAccountPublicKey && this.contractAccount){
			contractAccountPublicKey = this.contractAccount.publicKey ? this.contractAccount.publicKey : this.contractAccount;
		}
		else if(!contractAccountPublicKey){
			return resolve({});
		}
		let contractData = await this.connection.getAccountInfo(contractAccountPublicKey);
		let data = contractData.data;
		let field = ["EndTime","TokenMint1","TokenMint2","PotTokenAccount","OracleAccount","FeeAccount","Fee","MinimumBet","OverRideTime","Outcome"]
		let dataStructure = {};
		let dataInfo = [
			data.slice(0,8), //end time
			data.slice(8,40), //token mint 1
			data.slice(40,72), //token mint 2
			data.slice(72,104), //token pot account
			data.slice(104,136), //Outcome oracle account
			data.slice(136,168), //fee token account
			data.slice(168,176), //fee 
			data.slice(176,184), //MinimumBet		 
			data.slice(184,185), //OverRideTime
			data.slice(185,186), //Outcome 				
		];
		dataInfo.map((d,i)=>{
			dataStructure[field[i]] = d;
			console.log(field[i]);
			console.log(Buffer.from(d).toString("hex"));
			if(d.length === 8 && i === 0){
				dataStructure[field[i]] = get64BitTime(d).getTime();
				console.log(new Date(dataStructure[field[i]]));
			}
			return 0;
		});
		resolve(dataStructure);
	});
}

export { WagerClient };
