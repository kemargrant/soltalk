import React from 'react';
import { Button,ButtonGroup,Card,Input } from 'reactstrap';
import CancelIcon from '@material-ui/icons/Cancel';
import LoopIcon from '@material-ui/icons/Loop';
import MonetizationOnIcon from '@material-ui/icons/MonetizationOn';

class ContractView extends React.Component{ 
	constructor(props){
		super(props);
		this.state = {
			bet:{}
		}
		this.getInfo = this.getInfo.bind(this);
		this.redeemAndUpdate = this.redeemAndUpdate.bind(this);
	}
	
	componentDidMount(){
		if(!this.props.bet){
			this.getInfo();
		}
		else{
			this.setState({bet:this.props.bet});
		}
		return;
	}

	async getInfo(){
		let bet;
		if(this.props.wager_address){ 
			bet = await this.props.getContractInformation(this.props.wager_address); 
		}
		else if(this.state.bet.contractAccount){
			  bet = await this.props.getContractInformation(this.state.bet.contractAccount.toBase58()); 
		}  
		this.setState({bet});
		return;
	}

	async redeemAndUpdate(){
		try{
			await this.props.redeemContract(this.state.bet.contractAccount.toBase58());
		}
		catch(e){
			console.log(e);
		}
	}

	
	render(){
		if(!this.state.bet.contractAccount){
			this.getInfo();
			return (<progress style={{
				display:"block",margin:"auto"
			}}/>)
		}
		return (<Card className="shadow-none border mb-2 contractView">
			<div className="contractInfo">
				<div>
					<p className="text-muted mb-1"> Address </p>
					<h5 className="font-size-14"> <Input type="text" value={ this.state.bet.contractAccount.toBase58() } /> </h5>
				</div>
				<div className="mt-4">
					<p className="text-muted mb-1"> End Time </p>
					<h5 className="font-size-14"> { new Date(this.state.bet.endTime).toLocaleString() } </h5>
				</div>
				<div className="mt-4">
					<p className="text-muted mb-1"> Position 1 ({ this.state.bet.positions[0] / Math.pow(10,6) }) </p>
					<h5 className="font-size-14"> { this.state.bet.mintAccounts[0].toBase58() } </h5>
				</div>
				<div className="mt-4">
					<p className="text-muted mb-1"> Position 2 ({ this.state.bet.positions[1]  / Math.pow(10,6) }) </p>
					<h5 className="font-size-14"> { this.state.bet.mintAccounts[1].toBase58() } </h5>
				</div>
				<div className="mt-4">
					<p className="text-muted mb-1"> Pot </p>
					<h5 className="font-size-14"> { this.state.bet.contractPotAccount.toBase58() } </h5>
				</div>			
				<div className="mt-4">
					<p className="text-muted mb-1"> Oracle </p>
					<h5 className="font-size-14"> { this.state.bet.oracleAccount.toBase58() } </h5>
				</div>			
				<div className="mt-4">
					<p className="text-muted mb-1"> Fee </p>
					<h5 className="font-size-14"> { this.state.bet.fee } </h5>
				</div>	
				<div className="mt-4">
					<p className="text-muted mb-1"> FeeAccount </p>
					<h5 className="font-size-14"> { this.state.bet.feeAccount.toBase58() } </h5>
				</div>
				<div className="mt-4">
					<p className="text-muted mb-1"> Minimum Bet </p>
					<h5 className="font-size-14"> ${ this.state.bet.minimumBet / Math.pow(10,6) } </h5>
				</div>			
				<div className="mt-4">
					<p className="text-muted mb-1"> Contract Override </p>
					<h5 className="font-size-14"> { this.state.bet.override > 0 ? "YES" : "NO" } </h5>
				</div>	
				<div className="mt-4">
					<p className="text-muted mb-1"> Outcome </p>
					<h5 className="font-size-14"> 
						{ {0:"PENDING",1:"Player1 - Win",2:"Player2 - Win",3:"DRAW"}[this.state.bet.outcome] } 
					</h5>
				</div>
			</div>
			<progress min="0" value={ this.state.bet.positions[0] } max={ this.state.bet.positions[0] + this.state.bet.positions[1]  } />
			<ButtonGroup>
				<Button color="success" onClick={this.redeemAndUpdate} disabled={this.state.bet.outcome === 0 ? true : false}> <MonetizationOnIcon /> collect </Button>	
				<Button color="info" onClick={async()=>{ await this.getInfo(); }}> <LoopIcon />refresh </Button>	
				<Button color="danger" onClick={this.props.close}> <CancelIcon /> close </Button>	
			</ButtonGroup>											
		</Card>)
	}
}	

export { ContractView }
