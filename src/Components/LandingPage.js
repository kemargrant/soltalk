import React from 'react';

function LandingPage(props){ 	
	return(
		<div className="landingBody">
			<div id="landingLogoDiv">
				<img id="landingLogo" src="/images/landing_logo.png"/>
			</div>
			<div id="landingMidBody">
				<p id="landingMainMessage">
					FIGHTING EVOLVED
					<br/>
					<br/>
					<a href="https://sol-survivor.gitbook.io/docs/" target="_blank"><button className="landingButton">Read The Docs</button></a>
						<button  className="landingButton" onClick={props.goToApp}>Launch APP</button>
					<br/>
					<br/>
				</p>	
			</div>
			<div id="landingLowerBody">
				<a href="https://twitter.com/sol__survivor?ref_src=twsrc%5Etfw" target="_blank"> 
					<img src="/images/twitter.png"/>								
				</a>
				<a href="https://github.com/kemargrant/soltalk" target="_blank" aria-label="Star kemargrant/soltalk on GitHub">
					<img src="/images/github_light.png"/>								
				</a>	
				<a href="https://solana.com" target="_blank">
					<img src="/images/built_for_solana.svg"/>								
				</a>
			</div>
		</div>
		)
	}

export { LandingPage }
