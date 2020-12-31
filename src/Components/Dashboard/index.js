import React, { Component } from 'react';
import "../../assets/scss/themes.scss";

//Import Components
import ChatLeftSidebar from "./ChatLeftSidebar";
import UserChat from "./UserChat/";

class Index extends Component {
    constructor(props) {
        super(props);
        this.state = { 
			userSidebar:false,
		}
		this.closeUserSidebar = this.closeUserSidebar.bind(this);
		this.openUserSidebar = this.openUserSidebar.bind(this);
	}
	
	closeUserSidebar(){
		return this.setState({userSidebar:!this.state.userSidebar});
	}
	
	openUserSidebar(){
		return this.setState({userSidebar:!this.state.userSidebar});
	}	
	
    render() {
        return (
            <React.Fragment>
                <ChatLeftSidebar openUserSidebar={this.openUserSidebar} userSidebar={this.state.userSidebar} {...this.props}/>
				<UserChat 
					closeUserSidebar={this.closeUserSidebar}
					openUserSidebar={this.openUserSidebar}
					userSidebar={this.state.userSidebar}
					{...this.props} 
				/>
            </React.Fragment>
        );
    }
}

export default Index;
