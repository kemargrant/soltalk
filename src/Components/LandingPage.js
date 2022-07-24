import React from 'react';

let isMobile = false;
if(window.innerHeight > window.innerWidth){ isMobile = true; }

function LandingPage(props){ 	
	return(<div id="Landing_body">
			<div id="Landing_site">
				{	
					!isMobile ?	
					<div id="Landing_movie">
						<video autoplay="" loop id="video1"> 
							<source src="images/kor.webm" controls type="video/webm" /> 
						</video>
					</div>
					:null
				}
				<div id="Landing_cards">
					<div className="Landing_card" >
						<b onClick={props.goToApp}> APP </b>
					</div>
					<div className="Landing_card" >
						<a href="https://sol-survivor.gitbook.io/docs"> TUTORIAL </a>
					</div>				
					<div className="Landing_card" >
						<a href="https://digitaleyes.market/collections/Survivor"> NFTs [DigitalEyes] </a>
					</div>	
					<div className="Landing_card" >
						<a href="https://artz.ai/u/SolSurvivor"> NFTs [Artz.ai] </a>
					</div>												
				</div>
			</div>
			<div className="row" id="Landing_support"> 
				<a href="https://twitter.com/sol__survivor" target="_blank" rel="noopener noreferrer">
					<img src="https://solsurvivor.net/images/twitter.png" alt="twitter logo" class="img-fluid"/>
				</a>            

				<a href="https://github.com/kemargrant/soltalk" target="_blank" aria-label="Star kemargrant/soltalk on GitHub" rel="noopener noreferrer">
					<img src="https://solsurvivor.net/images/github_light.png" alt="github logo" class="img-fluid"/>
				</a>

				<a href="https://solana.com" target="_blank" rel="noopener noreferrer">
					<img src="https://solsurvivor.net/images/built_for_solana.svg" alt="solana logo" class="img-fluid" />
				</a>
			</div>
		</div>)
	}
export { LandingPage }
