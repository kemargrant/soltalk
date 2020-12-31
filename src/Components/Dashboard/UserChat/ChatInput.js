import React, { useState } from 'react';
import { Button, Input, Row, Col, UncontrolledTooltip, ButtonDropdown, DropdownToggle, DropdownMenu, Label, Form } from "reactstrap";
import { Picker } from 'emoji-mart'
import 'emoji-mart/css/emoji-mart.css'
import { Recorder } from '../../../Components/Recorder';

function ChatInput(props) {
    const [isOpen, setisOpen] = useState(false);
    const toggle = () => setisOpen(!isOpen);

    //function for add emojis
    const addEmoji = e => {
        let emoji = e.native;
        document.getElementById("newMessage").value += emoji;
    };

    return (
        <React.Fragment>
            <div className="p-3 p-lg-4 border-top mb-0">
				<Form onSubmit={(e) => {e.preventDefault();}} >
					<Row noGutters>
						<Col>
							<div>
								<Input id="newMessage" onKeyDown={props.messageKeyDown} type="text" className="form-control form-control-lg bg-light border-light" placeholder="Enter Message..." />
							</div>
						</Col>
						<Col xs="auto">
							<div className="chat-input-links ml-md-3">
								<ul className="list-inline mb-0">
									<li className="list-inline-item">
									<ButtonDropdown className="emoji-dropdown" direction="up" isOpen={isOpen} toggle={toggle}>
										<DropdownToggle id="emoji" color="link" className="text-decoration-none font-size-16 btn-lg waves-effect">
											<i className="ri-emotion-happy-line"></i>
										</DropdownToggle>
										<DropdownMenu className="dropdown-menu-lg-right">
											<Picker onSelect={addEmoji} />
										</DropdownMenu>
										</ButtonDropdown>
										<UncontrolledTooltip target="emoji" placement="top">
											Emoji
										</UncontrolledTooltip>
									</li>
									<li className="list-inline-item input-file">
										<Label id="vnote" className="btn btn-link text-decoration-none font-size-16 btn-lg waves-effect">
											<Recorder uploadAudioFile={props.uploadAudioFile} color="primary" />
										</Label>   
										<UncontrolledTooltip target="vnote" placement="top">
											Voice Note
										</UncontrolledTooltip>
									</li>
									<li className="list-inline-item">
										<Button onClick={props.sendMessage} color="primary" className="font-size-16 btn-lg chat-send waves-effect waves-light">
											<i className="ri-send-plane-2-fill"></i>
										</Button>
									</li>
								</ul>
							</div>
						</Col>
					</Row>
				</Form>
			</div>
        </React.Fragment>
    );
}

export default ChatInput;
