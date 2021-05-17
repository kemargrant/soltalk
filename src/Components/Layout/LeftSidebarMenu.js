import React, { Component } from 'react';
import { Nav, NavItem, NavLink, UncontrolledTooltip } from "reactstrap";
import classnames from "classnames";

class LeftSidebarMenu extends Component {
	 constructor(props) {
        super(props);
        this.toggleTab = this.toggleTab.bind(this);
    }
    
    toggleTab(tab){
		if(tab !== "games"){
			window.history.pushState("", "sol-talk", "/");
		}
		this.props.setActiveTab(tab);
		return;
    }
	render(){
		return (
			<React.Fragment>
				<div className="side-menu flex-lg-column mr-lg-1">
					{/* LOGO */}
					
					<div className="navbar-brand-box">
						<div to="/" className="logo logo-dark">
							<span className="logo-sm">
								<img src="./logo192.png" alt="logo" height="30" />
							</span>
						</div>

						<div to="/" className="logo logo-light">
							<span className="logo-sm">
								<img src="./logo192.png" alt="logo" height="30" />
							</span>
						</div>
					</div>
					{/* end navbar-brand-box  */}

					{/* Start side-menu nav */}
					<div className="flex-lg-column my-auto">
						<Nav pills className="side-menu-nav justify-content-center" role="tablist">
							<NavItem id="Chats">
								<NavLink id="pills-chat-tab" className={classnames({ active: this.props.activeTab === 'chat' })} onClick={() => { this.toggleTab('chat'); }}>
									<i className="ri-message-3-line"></i>
								</NavLink>
							</NavItem>
							<UncontrolledTooltip target="Chats" placement="top">
							Chats
							</UncontrolledTooltip>
							
							<NavItem id="Games">
								<NavLink id="pills-games-tab" className={classnames({ active: this.props.activeTab === 'games' })} onClick={() => { this.toggleTab('games'); }}>
									<i className="ri-gamepad-line"></i>
								</NavLink>
							</NavItem>
							<UncontrolledTooltip target="Games" placement="top">
							Games
							</UncontrolledTooltip>
							
							<NavItem id="Contacts">
								<NavLink id="pills-contacts-tab" className={classnames({ active: this.props.activeTab === 'contacts' })} onClick={() => { this.toggleTab('contacts'); }}>
									<i className="ri-contacts-line"></i>
								</NavLink>
							</NavItem>
							<UncontrolledTooltip target="Contacts" placement="top">
							Contacts
							</UncontrolledTooltip>
							<NavItem id="Settings">
								<NavLink id="pills-setting-tab" className={classnames({ active: this.props.activeTab === 'settings' })} onClick={() => { this.toggleTab('settings'); }}>
									<i className="ri-settings-2-line"></i>
								</NavLink>
							</NavItem>
							<UncontrolledTooltip target="Settings" placement="top">
								Settings
							</UncontrolledTooltip>
							<NavItem id="TransactionHistory">
								<NavLink id="pills-transactionHistory-tab" className={classnames({ active: this.props.activeTab === 'transactionHistory' })} onClick={() => { this.toggleTab('transactionHistory'); }}>
									<i className="ri-file-list-line"></i>
								</NavLink>
							</NavItem>
							<UncontrolledTooltip target="TransactionHistory" placement="top">
								Transactions
							</UncontrolledTooltip>  
							<NavItem id="NFT">
								<NavLink id="pills-transactionHistory-tab" className={classnames({ active: this.props.activeTab === 'NFT' })} onClick={() => { this.toggleTab('NFT'); }}>
									<i className="ri-medal-fill"></i>
								</NavLink>
							</NavItem>
							<UncontrolledTooltip target="NFT" placement="top">
								NFT
							</UncontrolledTooltip>                        							                      
							{
								(this.props.rsaKeyPair && this.props.rsaKeyPair.publicKey && ( this.props.localPayerAccount || this.props.payerAccount ) ) ? 
									<NavItem id="Presence">
										<NavLink id="pills-wifi-tab" onClick={this.props.broadcastPresence}>
											<i className="ri-broadcast-line"></i>
										</NavLink>
									</NavItem>
								:null
							}
							{
								(this.props.rsaKeyPair && this.props.rsaKeyPair.publicKey && ( this.props.localPayerAccount || this.props.payerAccount ) ) ? 
									<UncontrolledTooltip target="Presence" placement="top">
										Broadcast Presence
									</UncontrolledTooltip>	
								:null
							}
							{
								this.props.activeTab === "games"? 
									<NavItem id="gameHelp">
										<NavLink id="pills-wizard-tab" onClick={this.props.toggleSurvivorHelpOpen}>
											<i className="ri-question-line"></i>
										</NavLink>
									</NavItem>
								:null
							}
							{
								this.props.activeTab === "games" ? 
									<UncontrolledTooltip target="gameHelp" placement="top">
										How to Play
									</UncontrolledTooltip>	
								:null
							}													
						</Nav>
					</div>
					{/* end side-menu nav */}

					<div className="flex-lg-column d-none d-lg-block">
						<Nav className="side-menu-nav justify-content-center">
							<div id="gitLink"> <a className="github-button" href="https://github.com/kemargrant/soltalk" data-icon="octicon-star" aria-label="Star soltalk on GitHub" data-size="large" >Star</a></div>
						</Nav>
					</div>
					{/* Side menu user */}
				</div>
			</React.Fragment>
		);
	}
}

export default LeftSidebarMenu;
