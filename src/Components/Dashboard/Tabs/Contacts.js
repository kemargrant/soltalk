import React, { Component } from 'react';
import { UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem, 
	Media, Button, Modal, ModalHeader, ModalBody, ModalFooter, UncontrolledTooltip, 
	Form, FormGroup, Label, Input, InputGroup, InputGroupAddon, 
	Badge} from 'reactstrap';
import SimpleBar from "simplebar-react";

class Contacts extends Component {
    constructor(props) {
        super(props);
        this.state={
            modal : false,
            contacts : this.props.contacts ? this.props.contacts : {},
            sortedContacts : []
        }
        this.proxyAddContact = this.proxyAddContact.bind(this);
        this.proxyRemoveContact = this.proxyRemoveContact.bind(this);
        this.toggle = this.toggle.bind(this);
        this.updateContacts = this.updateContacts.bind(this);
        this.sortContact = this.sortContact.bind(this);
    }
	proxyAddContact(){
		let solanaPublicKey = document.getElementById("new_contact_key").value;
		let rsaPublicKey = document.getElementById("new_chat_key").value;
		if(solanaPublicKey.value && !rsaPublicKey.value){rsaPublicKey = "";}
		if(!solanaPublicKey){
			return this.props.notify("Solana Public Key Required","Error")
		}
		return this.props.addContact(solanaPublicKey,rsaPublicKey)
		.then(()=>this.sortContact())
		.then(this.toggle)
		.catch(console.warn)
	}
	
	proxyRemoveContact(solanaPublicKey){
		this.props.removeContact(solanaPublicKey);
		this.props.getContacts()
		.then(()=>this.sortContact())
		.catch(console.warn);
	}
	
    toggle() {
        this.setState({modal : !this.state.modal});
    }

    sortContact(evt){
		if(this.props.contacts){
			let c = [];
			if(evt && evt.currentTarget.value && evt.currentTarget.value !== ""){
				evt.preventDefault();
				Object.keys(this.props.contacts).map((contact)=>{
					if(contact.toLowerCase().search(evt.currentTarget.value) > - 1){
						c.push(this.props.contacts[contact]);
					}
					return 0;
				});
			}
			else{
				Object.keys(this.props.contacts).map((contact)=>{
					return c.push(this.props.contacts[contact]);
				});
				
			}
			this.setState({sortedContacts:c});
		}
    }

    componentDidMount(){
		this.props.getContacts()
		.then((contacts)=>{
			//Merge Unsaved Contacts
			for(let i = 0;i < this.props.potentialContacts.length;i++){
				contacts[ this.props.potentialContacts[i].publicKey ] = this.props.potentialContacts[i];
			}
			return this.updateContacts(contacts)
		})
		.then(this.sortContact)
        .catch(console.warn)
    }

	updateContacts(contacts){
		return this.setState({contacts});
	}
	
	viewContact(contact){
		this.props.setCurrentContact(contact);
		console.warn(this.props.userSidebar);
		if(!this.props.userSidebar){
			this.props.openUserSidebar();
		}
	}

    render() {
        function t(string){return string}
        return (
            <React.Fragment>
				<div>
				<div className="p-4">
					<div className="user-chat-nav float-right">
						<div id="add-contact">
							{/* Button trigger modal */}
							<Button type="button" color="link" onClick={this.toggle} className="text-decoration-none text-muted font-size-18 py-0">
								<i className="ri-user-add-line"></i>
							</Button>
						</div>
						<UncontrolledTooltip target="add-contact" placement="bottom">Add Contact</UncontrolledTooltip>
					</div>
					<h4 className="mb-4">Contacts</h4>
					{/* Start Add contact Modal */}
					<Modal isOpen={this.state.modal} centered toggle={this.toggle}>
						<ModalHeader tag="h5" className="font-size-16" toggle={this.toggle}>
							{t('Add Contacts')}
						</ModalHeader>
						<ModalBody className="p-4">
							<Form>
								<FormGroup className="mb-4">
									<Label htmlFor="addcontactaddress-input">{t('Solana Public Key')}</Label>
									<Input type="text" className="form-control" id="new_contact_key" placeholder="Solana Address" />
								</FormGroup>
								<FormGroup>
									<Label htmlFor="addcontact-rsa-input">{t('RSA Public Key')}</Label>
									<textarea className="form-control" id="new_chat_key" rows="3" placeholder="Enter RSA Public Key"></textarea>
								</FormGroup>
							</Form>
						</ModalBody>
						<ModalFooter>
							<Button type="button" color="link" onClick={this.toggle}>Close</Button>
							<Button type="button" color="primary" onClick={this.proxyAddContact}>Add</Button>
						</ModalFooter>
					</Modal>
					{/* End Add contact Modal */}

					<div className="search-box chat-search-box">
						<InputGroup size="lg" className="bg-light rounded-lg">
							<InputGroupAddon addonType="prepend">
								<Button color="link" className="text-decoration-none text-muted pr-1" type="button">
									<i className="ri-search-line search-icon font-size-18"></i>
								</Button>
							</InputGroupAddon>
							<Input type="text" className="form-control bg-light " placeholder={t('Search contacts..')} onKeyUp={this.sortContact}/>
						</InputGroup>
					</div>
					{/* End search-box */}
				</div>
				{/* end p-4 */}

				{/* Start contact lists */}
				<SimpleBar style={{ maxHeight: "100%" }} id="chat-room" className="p-4 chat-message-list chat-group-list">
					<ul className="list-unstyled contact-list">
					{
						this.state.sortedContacts.map((contact, key) => 
							<li key={key}>
								<Media className="align-items-center">
									<div className="contact-avatar">
										<img src={"https://robohash.org/"+contact.publicKey+"?size=50x50"+this.props.avatarStyle} alt="contact avatar"/>
									</div>
									<Media body>
										<h5 className="font-size-15 m-0">{contact.publicKey.slice(0,21)}</h5>
										<h5 className="font-size-15 m-0">{contact.publicKey.slice(21)}</h5>
									</Media>
									<UncontrolledDropdown>
										<DropdownToggle tag="a" className="text-muted">
										<i className="ri-more-2-fill"></i>
										</DropdownToggle>
										<DropdownMenu right>
											<DropdownItem onClick={()=>{this.viewContact(contact)}}>{t('View')} <i className="ri-eye-line float-right text-muted"></i></DropdownItem>
											<DropdownItem onClick={()=>{this.proxyRemoveContact(contact.publicKey)}}>{t('Remove')} <i className="ri-delete-bin-line float-right text-muted"></i></DropdownItem>
										</DropdownMenu>
									</UncontrolledDropdown>
								</Media>
							</li>
						)
					}
					{
						this.props.potentialContacts.map((contact, key) => 
							<li key={key}>
								<Badge color="danger"> ??? </Badge>
								<Media className="align-items-center">
									<div className="contact-avatar">
										<img src={"https://robohash.org/"+contact.publicKey+"?size=50x50"+this.props.avatarStyle} alt="contact avatar"/>
									</div>
									<Media body>
										<h5 className="font-size-15 m-0">{contact.publicKey.slice(0,21)}</h5>
										<h5 className="font-size-15 m-0">{contact.publicKey.slice(21)}</h5>
									</Media>
									<UncontrolledDropdown>
										<DropdownToggle tag="a" className="text-muted">
										<i className="ri-more-2-fill"></i>
										</DropdownToggle>
										<DropdownMenu right>
											<DropdownItem onClick={()=>{this.proxyAddContact(contact.publicKey,contact.chatPublicKey)}}>{t('ADD')} <i className="ri-add-circle-line float-right text-muted"></i></DropdownItem>
										</DropdownMenu>
									</UncontrolledDropdown>
								</Media>
							</li>
						)
					}
					</ul>

				</SimpleBar>
				{/* end contact lists */}
			</div>
        </React.Fragment>
        );
    }
}

export default Contacts;
