import React, { Component } from 'react';
//Import Components
import LeftSidebarMenu from "./LeftSidebarMenu";
import Dashboard from "../Dashboard/index";
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
			this.props.toggleLoginButtons();
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
                    { this.props.playGame ? <Stage {...this.props} /> : <Dashboard activeTab={this.state.activeTab} avatar1={avatar1} {...this.props} /> }
                </div>
            </React.Fragment>
        );
    }
}

export default Index;
