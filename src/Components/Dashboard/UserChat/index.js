import React, { useRef } from 'react';
import SimpleBar from "simplebar-react";

//Import Components
import UserProfileSidebar from "../components/UserProfileSidebar";

import UserHead from "./UserHead";
import ImageList from "./ImageList";
import ChatInput from "./ChatInput";

let allMessages = 0;

function UserChat(props) {

    const ref = useRef();

	var chatMessages = []
	if(props.MESSAGE_HISTORY && props.currentContact.publicKey&& props.MESSAGE_HISTORY[props.currentContact.publicKey]){
		chatMessages = props.MESSAGE_HISTORY[props.currentContact.publicKey];
	}

    function scrolltoBottom(){
        if (ref.current && ref.current.el) {
			if(allMessages !== chatMessages.length){
				allMessages = chatMessages.length;
				ref.current.getScrollElement().scrollTop = ref.current.getScrollElement().scrollHeight;
			}
        }
    }
    
    setTimeout(scrolltoBottom,0)

    return (
        <React.Fragment>
			{
				props.currentContact && props.currentContact.publicKey?
            <div className="user-chat w-100 user-chat-show">
                <div className="d-lg-flex">
                    <div className={ props.userSidebar ? "w-70" : "w-100" }>
                        {/* render user head */}
                        <UserHead {...props}/> 
						<SimpleBar
							style={{ maxHeight: "100%" }}
							ref={ref}
							className="chat-conversation p-3 p-lg-4"
							id="messages"
						>
							<ul className="list-unstyled mb-0">
                                {
									chatMessages.map((chat, key) =>  
										<li key={key} className={(chat.txid || chat.txids) ? "right" : ""}>
											<div className="conversation-list">
												{
													//logic for display user name and profile only once, if current and last messaged sent by same receiver
													chatMessages[key+1] ? ((chatMessages[key].txid === chatMessages[key+1].txid) || (chatMessages[key].txid && chatMessages[key+1].txid)) ? 
													<div className="chat-avatar"> <div className="blank-div"></div></div>
													:  
														<div className="chat-avatar">
															{
																chat.txid ?   
																<img src={"https://robohash.org/"+chat.myself+"?size=35x35"+props.avatarStyle} alt="myAvatar"  /> 
																:<img src={"https://robohash.org/"+props.currentContact.publicKey+"?size=35x35"+props.avatarStyle} alt="contactAvatar" />
															}
														</div>
													:   <div className="chat-avatar">
															{
																chat.txid ?   
																<img src={"https://robohash.org/"+chat.myself+"?size=35x35"+props.avatarStyle} alt="myAvatar"  /> 
																:<img src={"https://robohash.org/"+props.currentContact.publicKey+"?size=35x35"+props.avatarStyle} alt="contactAvatar" />
															}
														</div>
												}
												<div className="user-chat-content">
													<div className="ctext-wrap">
														<div className="ctext-wrap-content">
															{
																chat.message && <p className="mb-0">{chat.message}</p>
															}
															{
																chat.img_src && <ImageList images={chat.img_src} />
															}
															{
																chat.audio_src && <audio src={chat.audio_src} controls/>
															}
															<p className="chat-time mb-0"><i className="ri-time-line align-middle"></i> <span className="align-middle">{props.timeAgo.format(chat.time)}</span></p>
														</div>
														{/*file dropdown here*/}
														
													</div>
													 <div className="conversation-name">
														{ (chat.txid || chat.txids )? chat.myself.slice(0,5) : (props.currentContact && props.currentContact.publicKey).slice(0,5) }
													 </div>
												</div>
											</div>
										</li>)
                                }
                            </ul>
                        </SimpleBar>    
                        <ChatInput onaddMessage={scrolltoBottom} {...props}/>
                    </div>
                    <UserProfileSidebar {...props}/>
                </div>
            </div>
            : null
		}
        </React.Fragment>
    );
}

export default UserChat;

