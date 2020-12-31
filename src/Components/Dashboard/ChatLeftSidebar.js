import React from 'react';

import { TabContent, TabPane } from "reactstrap";

//Import Components
//~ import Profile from "./Tabs/Profile";
import Chats from "./Tabs/Chats";
//~ import Groups from "./Tabs/Groups";
import Contacts from "./Tabs/Contacts";
import Settings from "./Tabs/Settings";
import { TransactionHistory } from '../../Components/TransactionHistory';

function ChatLeftSidebar(props) {
    return (
        <React.Fragment>
            <div className="chat-leftsidebar mr-lg-1">

                <TabContent activeTab={props.activeTab}>
                    {/* Start Profile tab-pane */}
                   {/* End Profile tab-pane  */}

                    {/* Start chats tab-pane  */}
                    <TabPane tabId="chat" id="pills-chat">
                        {/* chats content */}
                        <Chats {...props}/>
                    </TabPane>
                    {/* End chats tab-pane */}
                    
                    {/* Start groups tab-pane */}
                    {/* End groups tab-pane */}

                    {/* Start contacts tab-pane */}
                    <TabPane tabId="contacts" id="pills-contacts">
                        {/* Contact content */}
                        <Contacts {...props}/>
                    </TabPane>
                    {/* End contacts tab-pane */}
                    
                    {/* Start settings tab-pane */}
                    <TabPane tabId="settings" id="pills-setting">
                        {/* Settings content */}
                        <Settings {...props}/>
                    </TabPane>
                    {/* End settings tab-pane */}
					{/* Start txHistory tab-pane */}
                    <TabPane tabId="transactionHistory" id="pills-txHistory">
                        {/* Settings content */}
                        <TransactionHistory {...props}/>
                    </TabPane>
                    {/* End settings tab-pane */}                    
                </TabContent>
                {/* end tab content */}
			</div>
        </React.Fragment>
    );
}

export default ChatLeftSidebar;
