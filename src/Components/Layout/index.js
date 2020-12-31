import React, { Component } from 'react';
import { Button } from "reactstrap";
//Import Components
import LeftSidebarMenu from "./LeftSidebarMenu";
import Dashboard from "../Dashboard/index";
import { SecureWallet } from '../../Components/SecureWallet';
import { Stage } from '../../Components/Stage';


class Index extends Component {
    constructor(props) {
        super(props);
        this.state={
			activeTab:"settings",
		};
        this.setTab = this.setTab.bind(this);
    }
    
    componentDidMount(){
		if(window.location.pathname === "/sol-survivor"){
			this.setTab({activeTab:"games"});
			this.props.togglePlayGame();
		}
    }
    
    setTab(activeTab){
		return this.setState({activeTab});
	}

    render() {
		let avatar1;
		if(this.props.localPayerAccount){
			avatar1 = "https://robohash.org/"+this.props.localPayerAccount.publicKey.toBase58()+"?size=720x720"+this.props.avatarStyle;
		}
		else if(this.props.payerAccount){
			avatar1 = "https://robohash.org/"+this.props.payerAccount.toBase58()+"?size=720x720"+this.props.avatarStyle;
		}
		else{
			avatar1 = "./images/nouser.png";
		}		
        return (
            <React.Fragment>
                <div className="layout-wrapper d-lg-flex">
                    {/* left sidebar menu */}
                    <LeftSidebarMenu setActiveTab={this.setTab} activeTab={this.state.activeTab} avatar1={avatar1}  {...this.props} />
                    { this.props.playGame ?
						<div>
						<AuxLogin {...this.props} />
						<Stage {...this.props} /> 
						</div>
						: 
						<Dashboard activeTab={this.state.activeTab} avatar1={avatar1} {...this.props} /> 
					}
                </div>
            </React.Fragment>
        );
    }
}

function AuxLogin(props){
	return(<div>{
			(!props.payerAccount && !props.localPayerAccount) ?
			<div className="auxLogin">
				<Button blk block className="btn btn-block" onClick={async()=>{return await props.connectWallet()}}><i className="ri-login-circle-line"></i> SOLLET </Button>
				<br/>
				<SecureWallet importKey={props.importKey} notify={props.notify}/>
			</div>
			:null
		}</div>)
}

export default Index;
