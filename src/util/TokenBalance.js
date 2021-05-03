import { PublicKey } from '@solana/web3.js';
import {  TOKEN_PROGRAM_ID } from "@solana/spl-token";
const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");



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

function get64Value(array){
	let hex = "0x"+array.toString("hex");
	let big = window.BigInt(hex);
	big = big.toString();
	big = Number(big);
	return big;
}

async function TokenBalance(props,mintAddress){
	let balance = 0;
	try{
		let associatedTokenAccount = await findAssociatedTokenAccountPublicKey(props.payerAccount ? props.payerAccount : props.localPayerAccount.publicKey,new PublicKey(mintAddress));
		let info = await props._connection.getAccountInfo(associatedTokenAccount);
		balance = get64Value(info.data.slice(64,72).reverse());
	}
	catch(e){
		console.warn(e);
	}
	if( balance > 0 ){return true;}
	return false;
}
			
export { TokenBalance };
