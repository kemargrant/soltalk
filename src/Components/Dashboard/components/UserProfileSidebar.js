import React, { useState } from 'react';
import { Button, Card } from "reactstrap";

//Simple bar
import SimpleBar from "simplebar-react";

//components
import CustomCollapse from "./CustomCollapse";

function t(string){return string}

function UserProfileSidebar(props) {
    const [isOpen1, setIsOpen1] = useState(true);

    const toggleCollapse1 = () => {
        setIsOpen1(!isOpen1);
    };

    // closes sidebar
    const closeuserSidebar=()=> {
        props.closeUserSidebar();
    }

    return (
        <React.Fragment>
           <div style={{display: (props.userSidebar === true)  ? "block" : "none"}} className="user-profile-sidebar">
			   <div className="px-3 px-lg-4 pt-3 pt-lg-4">
					<div className="user-chat-nav text-right">
						<Button color="none" type="button" onClick={closeuserSidebar} className="nav-btn" id="user-profile-hide">
							<i className="ri-close-line"></i>
						</Button>
					</div>
				</div>
				<div className="text-center p-4 border-bottom">
					<div className="mb-4 d-flex justify-content-center">
						<img src={"https://robohash.org/"+props.currentContact.publicKey+"?size=96x96"+props.avatarStyle} className="rounded-circle avatar-lg img-thumbnail" alt="chatAvatar" />                                
					</div>
					<h5 className="font-size-16 mb-1 text-truncate">{props.currentContact.publicKey}</h5>
				</div>
				{/* End profile user */}

				{/* Start user-profile-desc */}
				<SimpleBar style={{ maxHeight: "100%" }} className="p-4 user-profile-desc">
					<div className="text-muted">
						<p className="mb-4"> </p>
					</div>
					<div id="profile-user-accordion" className="custom-accordion">
						<Card className="shadow-none border mb-2">
							{/* import collaps */}
								<CustomCollapse
									title = "Contact Information"
									iconClass = "ri-user-2-line"
									isOpen={isOpen1}
									toggleCollapse={toggleCollapse1}
								>
									<div>
										<p className="text-muted mb-1">{t('Address')}</p>
										<h5 className="font-size-14"> {props.currentContact.publicKey}</h5>
									</div>                                            <div>
										<p className="text-muted mb-1">{t('RSA Public Key')}</p>
										<h5 className="font-size-14"> {props.currentContact.chatPublicKey}</h5>
									</div>
								</CustomCollapse>
						</Card>
						{/* End About card */}
					</div>
				</SimpleBar>
				{/* end user-profile-desc */}
			</div>
        </React.Fragment>
    );
}

export default UserProfileSidebar;
