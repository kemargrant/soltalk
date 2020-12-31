import React, { Component } from 'react';
import { Input, Label } from "reactstrap";

//use sortedContacts variable as global variable to sort contacts
let sortedContacts = [
    { group : "A",
        children : [{ id : 0, name : "Demo"}]
    }
]

class SelectContact extends Component {
    constructor(props) {
        super(props);
        this.state = {
            contacts : this.props.contacts
        }
        this.sortContact = this.sortContact.bind(this);
    }

    componentDidUpdate(prevProps) {
        if (prevProps !== this.props) {
          this.setState({
            contacts : this.props.contacts
          });
        }
    }

    sortContact(){
        let data = this.state.contacts.reduce((r, e) => {
            try {
                // get first letter of name of current element
                let group = e.name[0];
                // if there is no property in accumulator with this letter create it
                if(!r[group]) r[group] = {group, children: [e]}
                // if there is push current element to children array for that letter
                else r[group].children.push(e);
            } catch (error) {
                return sortedContacts;
            }
            // return accumulator
            return r;
        }, {})
          
        // since data at this point is an object, to get array of values
        // we use Object.values method
        let result = Object.values(data);
        this.setState({contacts : result});
        sortedContacts = result;
        return result;
    }

    componentDidMount(){
        this.sortContact();
    }

    componentWillUnmount(){
        this.sortContact();
    }
    
    render() {
        return (
            
            <React.Fragment>
                                {
                                    sortedContacts.map((contact, key) => 
                                        <div key={key}>
                                            <div className="p-3 font-weight-bold text-primary">
                                                {contact.group}
                                            </div>

                                            <ul className="list-unstyled contact-list">
                                                {
                                                    contact.children.map((child, keyChild) =>
                                                    
                                                        <li key={keyChild}>
                                                            <div className="custom-control custom-checkbox">
                                                                <Input type="checkbox" className="custom-control-input" onChange={(e) => this.props.handleCheck(e, child.id)} id={"memberCheck"+child.id} value={child.name} />
                                                                <Label className="custom-control-label" htmlFor={"memberCheck"+child.id}>{child.name}</Label>
                                                            </div>
                                                        </li>
                                                    )
                                                }
                                            </ul>
                                    </div>
                                    )
                                }
        </React.Fragment>
        );
    }
}

export default SelectContact;
