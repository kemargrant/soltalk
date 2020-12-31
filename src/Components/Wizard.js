import React from 'react';

import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
//Icons
import CancelIcon from '@material-ui/icons/Cancel';
import FastForwardIcon from '@material-ui/icons/FastForward';
import FastRewindIcon from '@material-ui/icons/FastRewind';

class Wizard extends React.Component{ 
	constructor(props){
		super(props);
		this.state = {
			content:{
				1:"Player1 Press Start",
				2:"Wait For Player2 to Press Start",
				3:"Player1 Select Action(Commit) & Approve Transaction",
				4:"Wait For Player2 Action(Commit)",
				5:"Unleash(Reveal) Your Action",
				6:"Player2 Has 10 Seconds to Unleash(Reveal) Action"
			},
			step:1
		}
		this.backward = this.backward.bind(this);
		this.forward = this.forward.bind(this);
	}
	
	backward(){
		let step = this.state.step;
		if(step > 1){step--}
		this.setState({step});
		return;
	}
	
	forward(){
		let step = this.state.step;
		if(step < 6){step++}
		this.setState({step});
		return;
	}	
	
	render(){
		if(!this.props.open){
			return null;
		}
		return(<div className="wizardCard">
				<Card>
					<Button variant="contained" color="secondary" onClick={this.props.close}> <CancelIcon/> </Button> 						
					<h4>How To Play</h4>	
					<CardActionArea>
						<CardContent className="wizardContent">
							<div id="wizardImgDiv">
								<img src={"./images/step"+this.state.step+".png"} alt="wizard instruction step"/>
							</div>
							<Typography variant="body1" color="textSecondary" component="p">
							{this.state.content[this.state.step]}
							</Typography>
						</CardContent>
				</CardActionArea>
					<CardActions>
						<Button variant="contained" color="primary" onClick={this.backward}>  <FastRewindIcon/> </Button> 						
						<Button variant="contained" color="primary" id="wizardForward" onClick={this.forward}> <FastForwardIcon/> </Button>
					</CardActions>
				</Card>
	</div>)
	}
}	

export { Wizard }

