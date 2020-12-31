import React, { Component } from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, UncontrolledTooltip, Form, FormGroup, Label, Input, Collapse, CardHeader, CardBody, Alert, InputGroup, InputGroupAddon, Media, Card, Badge } from 'reactstrap';

//simple bar
import SimpleBar from "simplebar-react";

//components
import SelectContact from "../components/SelectContact";

//actions
//~ import { createGroup } from "../../../redux/actions";
function t(string){return string}

class Groups extends Component {
    constructor(props) {
        super(props);
        this.state = {
            modal : false,
            isOpenCollapse : false,
            groups : this.props.groups ? this.props.groups : [] ,
            selectedContact : [],
            isOpenAlert : false,
            message : "",
            groupName : "",
            groupDesc : ""
        }
        this.toggle = this.toggle.bind(this);
        this.toggleCollapse = this.toggleCollapse.bind(this);
        this.createGroup = this.createGroup.bind(this);
        this.handleCheck = this.handleCheck.bind(this);
        this.handleChangeGroupName = this.handleChangeGroupName.bind(this);
        this.handleChangeGroupDesc = this.handleChangeGroupDesc.bind(this);
    }

    toggle() {
        this.setState({ modal : !this.state.modal });
    }

    toggleCollapse() {
        this.setState({ isOpenCollapse : !this.state.isOpenCollapse });
    }

    componentDidUpdate(prevProps) {
        if (prevProps !== this.props) {
          this.setState({
            groups : this.props.groups
          });
        }
    }

    createGroup(){
        if(this.state.selectedContact.length > 2) {
            // gourpId : 5, name : "#Project-aplha", profilePicture : "Null", isGroup : true, unRead : 0, isNew : true, desc : "project related Group",
            var obj = {
                gourpId : this.state.groups.length+1,
                name : "#" + this.state.groupName,
                profilePicture : "Null",
                isGroup : true,
                unRead : 0,
                isNew : true,
                desc : this.state.groupDesc,
                members : this.state.selectedContact
            }
            //call action for creating a group
            this.props.createGroup(obj);
            this.toggle();

        } else if(this.state.selectedContact.length === 1) {
            this.setState({message : "Minimum 2 members required!!!", isOpenAlert: true});
        } else {
            this.setState({message : "Please Select Members!!!", isOpenAlert: true});
        }
        setTimeout(
            function() {
                this.setState({ isOpenAlert: false });
            }
            .bind(this),
            3000
        );
    }

    handleCheck(e, contactId) {
        var selected = this.state.selectedContact;
        var obj;
        if(e.target.checked) {
            obj = {
                id : contactId,
                name : e.target.value 
            };
            selected.push(obj);
            this.setState({selectedContact : selected})
        }
    }

    handleChangeGroupName(e) {
        this.setState({groupName : e.target.value});
    }

    handleChangeGroupDesc(e) {
        this.setState({groupDesc : e.target.value});
    }
    
    render() {
        return (
            <React.Fragment>
            <div>
                            <div className="p-4">
                                <div className="user-chat-nav float-right">
                                    <div  id="create-group">
                                        {/* Button trigger modal */}
                                        <Button onClick={this.toggle} type="button" color="link" className="text-decoration-none text-muted font-size-18 py-0">
                                            <i className="ri-group-line mr-1"></i>
                                        </Button>
                                    </div>
                                    <UncontrolledTooltip target="create-group" placement="bottom">
                                        Create group
                                    </UncontrolledTooltip>

                                </div>
                                <h4 className="mb-4">{t('Groups')}</h4>

                                {/* Start add group Modal */}
                                <Modal isOpen={this.state.modal} centered toggle={this.toggle}>
                                            <ModalHeader tag="h5" className="modal-title font-size-16" toggle={this.toggle}>{t('Create New Group')}</ModalHeader>
                                            <ModalBody className="p-4">
                                                <Form>
                                                    <FormGroup className="mb-4">
                                                        <Label htmlFor="addgroupname-input">{t('Group Name')}</Label>
                                                        <Input type="text" className="form-control" id="addgroupname-input" value={this.state.groupName} onChange={(e) => this.handleChangeGroupName(e)} placeholder="Enter Group Name" />
                                                    </FormGroup>
                                                    <FormGroup className="mb-4">
                                                        <Label>{t('Group Members')}</Label>
                                                        <Alert isOpen={this.state.isOpenAlert} color="danger">
                                                            {this.state.message}
                                                        </Alert>
                                                        <div className="mb-3">
                                                            <Button color="light" size="sm" type="button" onClick={this.toggleCollapse}>
                                                                {t('Select Members')}
                                                            </Button>
                                                        </div>

                                                        <Collapse isOpen={this.state.isOpenCollapse} id="groupmembercollapse">
                                                            <Card className="border">
                                                                <CardHeader>
                                                                    <h5 className="font-size-15 mb-0">{t('Contacts')}</h5>
                                                                </CardHeader>
                                                                <CardBody className="p-2">
                                                                    <SimpleBar style={{maxHeight: "150px"}}>
                                                                        {/* contacts */}
                                                                        <div id="addContacts">
                                                                            <SelectContact handleCheck={this.handleCheck} />
                                                                        </div>
                                                                    </SimpleBar>
                                                                </CardBody>
                                                            </Card>
                                                        </Collapse>
                                                    </FormGroup>
                                                    <FormGroup>
                                                        <Label htmlFor="addgroupdescription-input">Description</Label>
                                                        <textarea className="form-control" id="addgroupdescription-input" value={this.state.groupDesc} onChange={(e) => this.handleChangeGroupDesc(e)} rows="3" placeholder="Enter Description"></textarea>
                                                    </FormGroup>
                                                </Form>
                                            </ModalBody>
                                            <ModalFooter>
                                                <Button type="button" color="link" onClick={this.toggle}>{t('Close')}</Button>
                                                <Button type="button" color="primary" onClick={this.createGroup}>Create Group</Button>
                                            </ModalFooter>
                                </Modal>
                                {/* End add group Modal */}

                                <div className="search-box chat-search-box">
                                    <InputGroup size="lg" className="bg-light rounded-lg">
                                        <InputGroupAddon addonType="prepend">
                                            <Button color="link" className="text-decoration-none text-muted pr-1" type="button">
                                                <i className="ri-search-line search-icon font-size-18"></i>
                                            </Button>
                                        </InputGroupAddon>
                                        <Input type="text" className="form-control bg-light" placeholder="Search groups..." />
                                    </InputGroup>
                                </div>
                                {/* end search-box */}
                            </div>

                            {/* Start chat-group-list */}
                            <SimpleBar style={{ maxHeight: "100%" }} className="p-4 chat-message-list chat-group-list">


                                <ul className="list-unstyled chat-list">
                                    {
                                       this.state.groups && this.state.groups.map((group, key) =>
                                            <li key={key} >
                                                <div to="#">
                                                    <Media className="align-items-center">
                                                        <div className="chat-user-img mr-3">
                                                            <div className="avatar-xs">
                                                                <span className="avatar-title rounded-circle bg-soft-primary text-primary">
                                                                    {group.name.charAt(1)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <Media body className="overflow-hidden">
                                                            <h5 className="text-truncate font-size-14 mb-0">
                                                                {group.name}
                                                                {
                                                                    group.unRead !== 0
                                                                    ?   <Badge color="none" pill className="badge-soft-danger float-right">
                                                                        {
                                                                            group.unRead >= 20 ? group.unRead + "+" : group.unRead
                                                                        }
                                                                        </Badge>
                                                                    :   null
                                                                }

                                                                {
                                                                    group.isNew && <Badge color="none" pill className="badge-soft-danger float-right">New</Badge>
                                                                }
                                                                
                                                            </h5>
                                                        </Media>
                                                    </Media>
                                                </div>
                                            </li>
                                        )
                                    }
                                </ul>
                            </SimpleBar>
                            {/* End chat-group-list */}
                        </div>
        </React.Fragment>
        );
    }
}

const mapStateToProps = (state) => {
    const { groups, active_user } = state.Chat;
    return { groups,active_user };
};

export default Groups;
//~ export default (connect(mapStateToProps, { createGroup })(withTranslation()(Groups)));
