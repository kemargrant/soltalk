import React, { Component } from 'react';
import { Media} from "reactstrap";
//simplebar
import SimpleBar from "simplebar-react";

class Chats extends Component {
    constructor(props) {
        super(props);
        this.state = {
            searchChat : "",
            recentChatList : []
        }
        this.createRecentChatList = this.createRecentChatList.bind(this);
        this.proxySetCurrentContact = this.proxySetCurrentContact.bind(this);
    }

	componentDidUpdate(prevProps) {
		if (prevProps !== this.props) {
			if (this.props.MESSAGE_HISTORY && Object.keys(this.props.MESSAGE_HISTORY).length !== Object.keys(prevProps.MESSAGE_HISTORY).length) {
				this.createRecentChatList();
			}
			else if(this.state.recentChatList.length === 0){
				this.createRecentChatList();
			}
			return requestIdleCallback(()=>{
				let contacts = Object.keys(this.props.contacts);
				for(let i = 0;i < contacts.length;i++){
					if(this.props.contacts[contacts[i]].message && this.props.contacts[contacts[i]].message > 0){
						return this.createRecentChatList();
					}
				}
			});
		}
	}

	createRecentChatList(){
		let contacts = this.props.contacts;
		let recentChatList = [];
		Object.keys(contacts).map((solanaPublicKey,index)=>{
			return recentChatList.push({
				publicKey:solanaPublicKey,
				unRead:contacts[solanaPublicKey].message,
				messages:this.props.MESSAGE_HISTORY[solanaPublicKey]
			});
		});
		this.setState({recentChatList});
		return;
	}

    proxySetCurrentContact(evt,chat){
		evt.preventDefault();
		this.props.setCurrentContact( this.props.contacts[chat.publicKey] );
		var userChat = document.getElementsByClassName("user-chat");
        if(userChat[0]) {
            userChat[0].classList.add("user-chat-show");
        }
	}
    
    render() {
        return (
            <React.Fragment>
				<div>
					{/* Start chat-message-list  */}
					<div className="px-2">
						<h5 className="mb-3 px-3 font-size-16">Recent</h5>
						<SimpleBar style={{ maxHeight: "100%" }} className="chat-message-list">

							<ul className="list-unstyled chat-list chat-user-list" id="chat-list">
								{
									this.state.recentChatList && this.state.recentChatList.map((chat, key) =>
										<li key={key} id={"conversation"+key} className={chat.unRead ? "unread" : chat.publicKey === this.props.currentContact.publicKey ? "active" : ""}>
											<a href="/#" onClick={(e)=>{return this.proxySetCurrentContact(e,chat);}}>
												<Media>
													<div className={"chat-user-img align-self-center mr-3"}>
														<img src={"https://robohash.org/"+chat.publicKey+"?size=35x35"+this.props.avatarStyle} className="rounded-circle avatar-xs" alt="chatvia" />
													</div>
													<Media body className="overflow-hidden">
														<h5 className="text-truncate font-size-15 mb-1">{chat.publicKey}</h5>
														<p className="chat-user-message text-truncate mb-0">
															<>
																{
																	chat.messages && (chat.messages.length > 0 && chat.messages[(chat.messages).length - 1].img_src) ? <i className="ri-image-fill align-middle mr-1"></i> : null
																}
																{
																	chat.messages && (chat.messages.length > 0  && chat.messages[(chat.messages).length - 1].audio_src ) ? <i className="ri-file-text-fill align-middle mr-1"></i> : null
																}
																{chat.messages && chat.messages.length > 0 ?  chat.messages[(chat.messages).length - 1].message : null}
														   </>
														</p>
													</Media>
													<div className="font-size-11">{chat.messages && chat.messages.length > 0 ?  this.props.timeAgo.format(new Date(chat.messages[(chat.messages).length - 1].time)) : null}</div>
													{chat.unRead === 0 ? null :
														<div className="unread-message" id={"unRead" + chat.id}>
															<span className="badge badge-soft-danger badge-pill">{chat.messages && chat.messages.length > 0 ? chat.unRead >= 20 ? chat.unRead + "+" : chat.unRead  : ""}</span>
														</div>
													} 
												</Media>
											</a>
										</li>
									)
								}
							</ul>
							</SimpleBar>
					</div>
					{/* End chat-message-list */}
				</div>
            </React.Fragment>
        );
    }
}

export default Chats;
