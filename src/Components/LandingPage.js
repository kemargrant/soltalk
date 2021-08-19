import React from 'react';

function LandingPage(props){ 	
	return(
		<div className="landingBody">
			<div id="landingLogoDiv">
				<img id="landingLogo" src="/images/landing_logo.png" alt="sol survivor logo"/>
			</div>
			<div id="landingMidBody">
				<p id="landingMainMessage">
					FIGHTING EVOLVED
					<br/>
					<br/>
					
					<a href="https://sol-survivor.gitbook.io/docs/" target="_blank" rel="noopener noreferrer"><button className="landingButton">Read The Docs</button></a>
					<button className="landingButton" onClick={props.goToApp}>Launch APP</button>
					<a href="https://nft.solsurvivor.net/" target="_blank" rel="noopener noreferrer"><button className="landingButton">NFTs</button></a>
					
					<br/>
					<br/>
				</p>	
			</div>
			<div id="landingLowerBody">
				<a href="https://twitter.com/sol__survivor?ref_src=twsrc%5Etfw" target="_blank" rel="noopener noreferrer"> 
					<img src="/images/twitter.png" alt="twitter logo"/>								
				</a>
				<a href="https://github.com/kemargrant/soltalk" target="_blank" aria-label="Star kemargrant/soltalk on GitHub" rel="noopener noreferrer">
					<img src="/images/github_light.png" alt="github logo"/>								
				</a>	
				<a href="https://solana.com" target="_blank" rel="noopener noreferrer">
					<img src="/images/built_for_solana.svg" alt="solana logo"/>								
				</a>
				<a href="https://www.unlimitedcope.com/" target="_blank"> Powered by <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/8HGyAAB1yoM1ttS7pXjHMa3dukTFGQggnFFH3hJZgzQh/logo.png" id="copeLogo"/> </a>
			</div>
		</div>
		)
	}

export { LandingPage }
