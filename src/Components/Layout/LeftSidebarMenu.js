import React from 'react';
import { Nav, NavItem, NavLink, UncontrolledTooltip } from "reactstrap";
import classnames from "classnames";

var prevTab;
function LeftSidebarMenu(props) {
    const activeTab = props.activeTab;

    const toggleTab = tab => {
		console.log(tab,prevTab);
		if(tab === prevTab){return}
        if(tab === "games" || prevTab === "games"){
			props.togglePlayGame();
		}
		//The case where we are dropped directly into the game
		else if(!prevTab && tab !== "games"){
			if(window.location.pathname === "/sol-survivor"){
				props.togglePlayGame();
			}
		}
		prevTab = tab;
		props.setActiveTab(tab);
    }

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
                            <NavLink id="pills-chat-tab" className={classnames({ active: activeTab === 'chat' })} onClick={() => { toggleTab('chat'); }}>
                                <i className="ri-message-3-line"></i>
                            </NavLink>
                        </NavItem>
                        <UncontrolledTooltip target="Chats" placement="top">
                        Chats
                        </UncontrolledTooltip>
                        
                        <NavItem id="Games">
                            <NavLink id="pills-games-tab" className={classnames({ active: activeTab === 'games' })} onClick={() => { toggleTab('games'); }}>
                                <i className="ri-gamepad-line"></i>
                            </NavLink>
                        </NavItem>
                        <UncontrolledTooltip target="Games" placement="top">
                        Games
                        </UncontrolledTooltip>
                        
                        <NavItem id="Contacts">
                            <NavLink id="pills-contacts-tab" className={classnames({ active: activeTab === 'contacts' })} onClick={() => { toggleTab('contacts'); }}>
                                <i className="ri-contacts-line"></i>
                            </NavLink>
                        </NavItem>
                        <UncontrolledTooltip target="Contacts" placement="top">
                        Contacts
                        </UncontrolledTooltip>
                        <NavItem id="Settings">
                            <NavLink id="pills-setting-tab" className={classnames({ active: activeTab === 'settings' })} onClick={() => { toggleTab('settings'); }}>
                                <i className="ri-settings-2-line"></i>
                            </NavLink>
                        </NavItem>
                        <UncontrolledTooltip target="Settings" placement="top">
                            Settings
                        </UncontrolledTooltip>
                        <NavItem id="TransactionHistory">
                            <NavLink id="pills-transactionHistory-tab" className={classnames({ active: activeTab === 'transactionHistory' })} onClick={() => { toggleTab('transactionHistory'); }}>
                                <i className="ri-file-list-line"></i>
                            </NavLink>
                        </NavItem>
                        <UncontrolledTooltip target="TransactionHistory" placement="top">
                            Transactions
                        </UncontrolledTooltip>                        
                        {
							(props.rsaKeyPair && props.rsaKeyPair.publicKey && ( props.localPayerAccount || props.payerAccount ) ) ? 
								<NavItem id="Presence">
									<NavLink id="pills-wifi-tab" onClick={props.broadcastPresence}>
										<i className="ri-broadcast-line"></i>
									</NavLink>
								</NavItem>
							:null
						}
						{
							(props.rsaKeyPair && props.rsaKeyPair.publicKey && ( props.localPayerAccount || props.payerAccount ) ) ? 
								<UncontrolledTooltip target="Presence" placement="top">
									Broadcast Presence
								</UncontrolledTooltip>	
							:null
						}
						{
							( props.activeTab === "games" || (window.location.pathname === "/sol-survivor" && !prevTab) )? 
								<NavItem id="gameHelp">
									<NavLink id="pills-wizard-tab" onClick={props.toggleSurvivorHelpOpen}>
										<i className="ri-question-line"></i>
									</NavLink>
								</NavItem>
							:null
						}
						{
							props.activeTab === "games" ? 
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

export default LeftSidebarMenu;
