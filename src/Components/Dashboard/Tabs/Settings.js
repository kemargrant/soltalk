import React, { useState } from 'react';
import { Dropdown, DropdownMenu, DropdownItem, DropdownToggle, Card, Media, Button,Input, Label } from "reactstrap";
import { ScanQR } from '../../../Components/ScanQR';
import { SecureWallet } from '../../../Components/SecureWallet';
import SimpleBar from "simplebar-react";

//Import components
import CustomCollapse from "../components/CustomCollapse";

//Import Images

function Settings(props) {
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [isOpen1, setIsOpen1] = useState(true);
	const [isOpen2, setIsOpen2] = useState(false);
	const [isOpen3, setIsOpen3] = useState(false);
	const [isOpen4, setIsOpen4] = useState(false);

	function t(string){return string}
	
	let address = "";
	if( props.payerAccount ){address = props.payerAccount.toBase58() }
	else if(props.localPayerAccount){address = props.localPayerAccount.publicKey.toBase58() ;}
	
	const toggleCollapse1 = () => {
		setIsOpen1(!isOpen1);
		setIsOpen2(false);
		setIsOpen3(false);
		setIsOpen4(false);
	};

	const toggleCollapse2 = () => {
		setIsOpen2(!isOpen2);
		setIsOpen1(false);
		setIsOpen3(false);
		setIsOpen4(false);
	};

	const toggleCollapse3 = () => {
		setIsOpen3(!isOpen3);
		setIsOpen1(false);
		setIsOpen2(false);
		setIsOpen4(false);
	};

	const toggleCollapse4 = () => {
		setIsOpen4(!isOpen4);
		setIsOpen1(false);
		setIsOpen3(false);
		setIsOpen2(false);
	};

	const toggle = () => setDropdownOpen(!dropdownOpen);
	const proxyChangeNetwork = (evt)=>{
		if(evt.currentTarget.checked){ return props.changeNetwork("api.mainnet-beta");}
		return props.changeNetwork("testnet");
	}
		
    return (<React.Fragment>
            <div>
				<div className="px-4 pt-4">
					<h4 className="mb-0">{t('Settings')}</h4>
				</div>
				{
					props.showSolanaQR ?
					<img alt="userQRCode" className="desktopQR" src={props.solanaQRURL}/>
					:null
				}
				<div className="text-center border-bottom p-4">
					<div className="mb-4 profile-user">
						<img src={props.avatar1} className="rounded-circle avatar-lg img-thumbnail" alt="chatvia" /> 
					</div>
					<h5 className="font-size-16 mb-1 text-truncate"> {address} </h5>
					{
						(!props.payerAccount && !props.localPayerAccount) ?
						<Dropdown isOpen={dropdownOpen} toggle={toggle} className="d-inline-block mb-1">
							<DropdownToggle tag="a" className="text-muted pb-1 d-block" >
								{t('CONNECT')} <i className="mdi mdi-chevron-down"></i>
							</DropdownToggle>
							
							<DropdownMenu>
								<DropdownItem onClick={async()=>{return await props.connectWallet()}}> <i className="ri-login-circle-line"></i> {t('SOLLET')} </DropdownItem>
								<SecureWallet importKey={props.importKey} notify={props.notify}/>
							</DropdownMenu>
						</Dropdown>
						:null
					}
				</div>
				{/* End profile user */}

				{/* Start User profile description */}
				<SimpleBar style={{ maxHeight: "100%" }} className="p-4 user-profile-desc">
					<div id="profile-setting-accordion" className="custom-accordion">
						<Card className="shadow-none border mb-2">
							<CustomCollapse
								title = "Info"
								isOpen={isOpen1}
								toggleCollapse={toggleCollapse1}
							>
								<div>
									<p className="text-muted mb-1">{t('Address')}</p>
									<h5 className="font-size-14">{address}</h5>
								</div>
								<div className="mt-4">
									<p className="text-muted mb-1">{t('Balance')}</p>
									<h5 className="font-size-14">
										{props.payerAccount? props.payerAccountBalance : null}
										{props.localPayerAccount ? props.localPayerBalance : null} sol	
									</h5>
								</div>
								<div className="mt-4">
									<Media className="align-items-center">
										<Media body className="overflow-hidden">
											<h5 className="font-size-13 mb-0 text-truncate">{props.defaultNetwork.toUpperCase()}</h5>
										</Media>
										<div className="ml-2">
											<div className="custom-control custom-switch">
												<Input type="checkbox" 
													className="custom-control-input" 
													id="networkSwitch" 
													checked={props.defaultNetwork === "api.mainnet-beta" ? true : false}
													onClick={proxyChangeNetwork}
													onChange={function(){}}
												/>
												<Label className="custom-control-label" htmlFor="networkSwitch"></Label>
											</div>
										</div>
									</Media>
								</div>
								<div className="mt-4">
									<p className="text-muted mb-1">{t('Program')}</p>
									<h5 className="font-size-14 mb-0">{props.defaultProgram}</h5>
								</div>
								<div className="mt-4">
									<p className="text-muted mb-1">{t('Account')}</p>
									<h5 className="font-size-14 mb-0">{props.defaultChannel}</h5>
								</div>
							</CustomCollapse>
						</Card>
						{/* end profile card */}

						<Card className="shadow-none border mb-2">
							<CustomCollapse
								title = "Options"
								isOpen={isOpen2}
								toggleCollapse={toggleCollapse2}
							>
								<div className="py-3 border-top">
									<Media className="align-items-center">
										<Media body className="overflow-hidden">
											<h5 className="font-size-13 mb-0 text-truncate">{t('Auto Save Messages')}</h5>
										</Media>
										<div className="ml-2">
											<div className="custom-control custom-switch">
												<Input 
													type="checkbox" 
													className="custom-control-input" 
													id="autoSaveSwitch" 
													checked={props.autoSaveHistory ? true : false} 				
													onClick={props.updateAutoSaveHistory}
													onChange={function(){}}
												/>
												<Label className="custom-control-label" htmlFor="autoSaveSwitch"></Label>
											</div>
										</div>
									</Media>
								</div>
								<div className="py-3 border-top">
									<Media className="align-items-center">
										<Media body className="overflow-hidden">
											<h5 className="font-size-13 mb-0 text-truncate">{t('Auto Sign Transactions')}</h5>
										</Media>
										<div className="ml-2">
											<div className="custom-control custom-switch">
												<Input 
													type="checkbox" 
													className="custom-control-input" 
													id="autoSignSwitch" 
													checked={props.autoSign ? true : false}
													onClick={async()=>{await props.updateAutoSign(); }}
													onChange={function(){}}
												/>
												<Label className="custom-control-label" htmlFor="autoSignSwitch"></Label>
											</div>
										</div>
									</Media>
								</div>
								<div className="py-3 border-top">
									<Media className="align-items-center">
										<Media body className="overflow-hidden">
											<h5 className="font-size-13 mb-0 text-truncate">{t('Avatar Style')}</h5>
										</Media>
										<div className="ml-2">
											<div className="custom-control custom-switch">
												<Input type="checkbox" 
													className="custom-control-input" 
													id="avatarStyleSwitch" 
													checked={props.avatarStyle === "" ? true : false}
													onClick={props.updateAvatarStyle}
													onChange={function(){}}
												/>
												<Label className="custom-control-label" htmlFor="avatarStyleSwitch"></Label>
											</div>
										</div>
									</Media>
								</div>
								<div className="py-3 border-top">
									<Media className="align-items-center">
										<Media body className="overflow-hidden">
											<h5 className="font-size-13 mb-0 text-truncate">{t('Background Music')}</h5>
										</Media>
										<div className="ml-2">
											<div className="custom-control custom-switch">
												<Input type="checkbox" 
													className="custom-control-input" 
													id="enableMusicSwitch" 
													checked={props.enableMusic === true ? true : false}
													onClick={props.updateEnableMusic}
													onChange={function(){}}
												/>
												<Label className="custom-control-label" htmlFor="enableMusicSwitch"></Label>
											</div>
										</div>
									</Media>
								</div>								
								<div className="py-3 border-top">
									<Media className="align-items-center">
										<Media body className="overflow-hidden">
											<h5 className="font-size-13 mb-0 text-truncate">{t('QR')}</h5>
										</Media>
										<div className="ml-2">
											<Button color="secondary" onClick={props.toggleShowSolanaQR}> { props.showSolanaQR ? "Hide" : "View" } </Button>
										</div>
										<div className="ml-2">
											<Button color="primary">
												<ScanQR title={"Scan"} addContact={props.addContact} avatarStyle={props.avatarStyle} sendSol={props.sendSol}/>
											</Button>
										</div>
									</Media>
								</div>																
							</CustomCollapse>
						</Card>
						{/* end Privacy card */}

						<Card className="shadow-none border mb-2">
							<CustomCollapse
								title = "Data"
								isOpen={isOpen3}
								toggleCollapse={toggleCollapse3}
							>
								<div>
									<Media className="align-items-center">
										<Media body className="overflow-hidden">
											<h5 className="font-size-13 mb-0 text-truncate">{t('Import')}</h5>
										</Media>
										<Button onClick={props.importRSAKeys_JSON}>
											RSA  <i className="ri-key-fill mr-1 align-middle"></i>
										</Button>
									</Media>
								</div>
								{
									props.rsaKeyPair?
									<div>

										<Media className="align-items-center">
											<Media body className="overflow-hidden">
												<h5 className="font-size-13 mb-0 text-truncate">{t('Export')}</h5>
											</Media>
											<Button onClick={props.exportRSAKeys}>
												RSA  <i className="ri-key-fill mr-1 align-middle"></i>
											</Button>
										</Media>
									</div>	
									:null
								}
								{
									props.localPayerAccount?
									<div>
										<Media className="align-items-center">
											<Media body className="overflow-hidden">
												<h5 className="font-size-13 mb-0 text-truncate">{t('Export')}</h5>
											</Media>
											<Button onClick={props.exportPrivateKey}>
												Private  <i className="ri-key-fill mr-1 align-middle"></i>
											</Button>
										</Media>
									</div>
									:null
								}
								<div>
									<Media className="align-items-center">
										<Media body className="overflow-hidden">
											<h5 className="font-size-13 mb-0 text-truncate">{t('Delete')}</h5>
										</Media>
										<Button onClick={props.deleteMessageHistory}>
											Message History  <i className="ri-trash-fill mr-1 align-middle"></i>
										</Button>
									</Media>
								</div>
								{ 
									props.localPayerAccount?
									<div>
										<Media className="align-items-center">
											<Media body className="overflow-hidden">
												<h5 className="font-size-13 mb-0 text-truncate">{t('Delete')}</h5>
											</Media>
											<Button onClick={props.removeImportedAccount}>
												Local Account  <i className="ri-trash-fill mr-1 align-middle"></i>
											</Button>
										</Media>
									</div>
									:null
								}
								{ 
									props.rsaKeyPair?
									<div>
										<Media className="align-items-center">
											<Media body className="overflow-hidden">
												<h5 className="font-size-13 mb-0 text-truncate">{t('Delete')}</h5>
											</Media>
											<Button onClick={props.removeRSAKeys}>
												RSA <i className="ri-key-fill mr-1 align-middle"></i>
											</Button>
										</Media>
									</div>
									:null
								}
								{
									(!props.rsaKeyPair && ( props.localPayerAccount || props.payerAccount ) ) ? 
									<div>
										<Media className="align-items-center">
											<Media body className="overflow-hidden">
												<h5 className="font-size-13 mb-0 text-truncate">{t('Delete')}</h5>
											</Media>
											<Button onClick={props.createRSAKeyPair}>
												Create RSA <i className="ri-key-fill mr-1 align-middle"></i>
											</Button>
										</Media>
									</div>
									:null
								}	
							</CustomCollapse>
						</Card>
						{/* end Security card */}

						<Card className="shadow-none border mb-2">
							<CustomCollapse
								title = "About"
								isOpen={isOpen4}
								toggleCollapse={toggleCollapse4}
							>
								<div>
									<div className="py-3">
										<h5 className="font-size-13 mb-0">
											<div to="#" className="text-body d-block">
												<a href="https://www.sol-talk.com/robohash.org">Robots lovingly delivered by Robohash.org</a>
												<a href="https://www.fesliyanstudios.com/royalty-free-music/download/dragon-boss-fight/993"> Dragon Boss Fight by David Fesliyan</a>
											</div>
										</h5>
									</div>
								</div>
							</CustomCollapse>
						</Card>
						{/* end Help card */}
					</div>
					{/* end profile-setting-accordion */}
				</SimpleBar>
				{/* End User profile description */}
			</div>
        </React.Fragment>);
}

export default Settings;
