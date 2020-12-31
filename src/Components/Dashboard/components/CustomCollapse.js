import React from 'react';
import { Collapse, CardBody, CardHeader } from "reactstrap";

function CustomCollapse(props) {
    const { isOpen, toggleCollapse } = props;

   function t(string){return string}

    return (
        <React.Fragment>
			<div to="#" onClick={toggleCollapse} className="text-dark" >
				<CardHeader id="profile-user-headingOne">
					<h5 className="font-size-14 m-0">
						{
							props.iconClass &&<i className={props.iconClass + " mr-2 align-middle d-inline-block"}></i>
						}
						 {t(props.title)}
						<i className={isOpen ? "mdi mdi-chevron-up float-right accor-plus-icon" : "mdi mdi-chevron-right float-right accor-plus-icon"}></i>
					</h5>
				</CardHeader>
			</div>

			<Collapse isOpen={isOpen}>
				<CardBody>
					{props.children}
				</CardBody>
			</Collapse>
        </React.Fragment>
    );
}

export default CustomCollapse;
