import React from 'react';
import { Card, Media, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from "reactstrap";

function t(string){return string}

function FileList(props) {

    return (
        <React.Fragment>
            <Card className="p-2 mb-2">
                      <Media className="align-items-center">
                           <div className="avatar-sm mr-3">
								<div className="avatar-title bg-soft-primary text-primary rounded font-size-20">
									<i className="ri-file-text-fill"></i>
								</div>
							</div>
							<Media body>
								<div className="text-left">
									<h5 className="font-size-14 mb-1">{props.fileName}</h5>
									<p className="text-muted font-size-13 mb-0">{props.fileSize}</p>
								</div>
							</Media>

							<div className="ml-4">
								<ul className="list-inline mb-0 font-size-20">
									<li className="list-inline-item">
										<a href="/#" className="text-muted">
											<i className="ri-download-2-line"></i>
										</a>
									</li>
									<UncontrolledDropdown tag="li" className="list-inline-item">
										<DropdownToggle tag="a" className="dropdown-toggle text-muted">
											<i className="ri-more-fill"></i>
										</DropdownToggle>
										<DropdownMenu right>
											<DropdownItem>{t('Share')} <i className="ri-share-line float-right text-muted"></i></DropdownItem>
											<DropdownItem>{t('Delete')} <i className="ri-delete-bin-line float-right text-muted"></i></DropdownItem>
										</DropdownMenu>
									</UncontrolledDropdown>
								</ul>
							</div>
						</Media>
					</Card>
        </React.Fragment>
    );
}

export default FileList;
