import React from 'react';
import { Media, Button, Row, Col } from "reactstrap";


function UserHead(props) {
	function closeUserChat(e){
		e.preventDefault();
		var userChat = document.getElementsByClassName("user-chat");
		if(userChat) {
			userChat[0].classList.remove("user-chat-show");
		}
	}
    const openUserSidebar = (e) => {
        e.preventDefault();
        props.openUserSidebar();
    }

    return (
        <React.Fragment>
            <div className="p-3 p-lg-4 border-bottom">
				<Row className="align-items-center">
					<Col sm={4} xs={8}>
						<Media className="align-items-center">
							<div className="d-block d-lg-none mr-2">
								<a href="/#" onClick={(e) => closeUserChat(e)} className="user-chat-remove text-muted font-size-16 p-2"><i className="ri-arrow-left-s-line"></i></a>
							</div>
							<div className="mr-3">
								<img src={"https://robohash.org/"+props.currentContact.publicKey+"?size=35x35"+props.avatarStyle} className="rounded-circle avatar-xs" alt="currentContactAvatar" />
							</div>
							<Media body className="overflow-hidden">
								<h5 className="font-size-16 mb-0 text-truncate">
									<a href="/#" onClick={(e) => openUserSidebar(e)} className="text-reset user-profile-show">
									{props.currentContact.publicKey} 
									</a> 
								</h5>
							</Media>
							<b id="charCount">#{props.characterCount}</b>
						</Media>
					</Col>
					<Col sm={8} xs={4} >
						<ul className="list-inline user-chat-nav text-right mb-0">
							<li className="list-inline-item d-none d-lg-inline-block">
								<Button type="button" color="none" onClick={(e) => openUserSidebar(e)} className="nav-btn user-profile-show">
									<i className="ri-user-2-line"></i>
								</Button>
							</li>
						</ul>
					</Col>
				</Row>
			</div>
        </React.Fragment>
    );
}

export default UserHead;
