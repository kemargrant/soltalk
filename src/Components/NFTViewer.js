import React from 'react';
import { TokenBalance } from '../util/TokenBalance';     
	
function WebGLView(props){
	return (<iframe
		className="nftIframe"
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
			nakedshorts:false,
		}
		this.haveToken = this.haveToken.bind(this);
		this.loadNFTs = this.loadNFTs.bind(this);
	}	
	
	componentDidMount(){
		return this.loadNFTs().catch(console.warn);
	}
	
	async haveToken(mintAddress){
		let hasCharacter = false;
		if(this.props.payerAccount || this.props.localPayerAccount){ if(await TokenBalance(this.props,mintAddress)){hasCharacter = true;} }
		return hasCharacter;
	}
	
	async loadNFTs(){
		console.log("loading")
		let nakedShortsMint = "ss1gxEUiufJyumsXfGbEwFe6maraPmc53fqbnjbum15";
		let obj = {}
		if( await this.haveToken(nakedShortsMint)){  
			obj.nakedshorts = true;
		}
		console.log("loading nft complete:",obj);
		this.setState(obj);
	}
	
	render(){
		return(<div style={{width:"100%"}}>
			{ this.state.nakedshorts ? <WebGLView src="./solsurvivor/nakedshorts.html" /> : null }
			<br/>
		</div>)
	}
}


export { NFTViewer };
