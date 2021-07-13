import React from 'react';
import { TokenBalance } from '../util/TokenBalance';     
	
function WebGLView(props){
	return (<iframe
		className="nftIframe"
		id={props.id}
		title="nftIframe" 
		src={props.src} 
		width={document.body.clientWidth} 
		height={document.body.clientHeight*0.85} 
		style={{frameBorder:0}}
		onLoad={props.onLoad}
	/>);
} 	

class NFTViewer extends React.Component {
	constructor(props){
		super(props);
		this.state = {
			jaybeezy:false,
			nakedshorts:false,
			poh:false,
		}
		this.haveToken = this.haveToken.bind(this);
		this.loadNFTs = this.loadNFTs.bind(this);
	}	
	
	componentDidMount(){
		return this.loadNFTs().catch(console.warn);
	}
	
	async haveToken(mintAddress,isPrintTokenMint=false){
		let hasCharacter = false;
		if(this.props.payerAccount || this.props.localPayerAccount){
			 if(await TokenBalance(this.props,mintAddress,isPrintTokenMint)){
				 hasCharacter = true;
			} 
		}
		return hasCharacter;
	}
	
	async loadNFTs(){
		let jayBeezyPrintTokenMint = "GyTF8PoMBYivkba8shFyjhW3hcJvUPEDv3GHQU87yJiq";
		let nakedShortsMint = "ss1gxEUiufJyumsXfGbEwFe6maraPmc53fqbnjbum15";
		let pohMint = "ss26ybWnrhSYbGBjDT9bEwRiyAVUgiKCbgAfFkksj4R";
		let obj = {}
		if( await this.haveToken(nakedShortsMint)){  
			obj.nakedshorts = true;
		}
		if( await this.haveToken(pohMint)){  
			obj.poh = true;
		}
		if( await this.haveToken(jayBeezyPrintTokenMint,true)){  
			obj.jaybeezy = true;
		}
		this.setState(obj);
	}
	
	render(){
		return(<div style={{width:"100%"}}>
			{ this.state.nakedshorts ? <WebGLView id="nakedshorts" src="./solsurvivor/nakedshorts.html" /> : null }
			{ this.state.poh? <WebGLView id="poh" src="./solsurvivor/poh.html" /> : null }
			{ this.state.jaybeezy? <WebGLView id="jaybeezy" src="./solsurvivor/jaybeezy.html" /> : null }
		</div>)
	}
}


export { NFTViewer };
