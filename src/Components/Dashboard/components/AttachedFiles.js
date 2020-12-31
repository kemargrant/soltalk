import React from 'react';
import { DropdownMenu, DropdownItem, DropdownToggle, Card, Media, UncontrolledDropdown } from "reactstrap";


function AttachedFiles(props) {
    const files = props.files;
    function t(string){return string}

    return (
        <React.Fragment>
            {
            files.map((file, key) =>
			<Card key={key} className="p-2 border mb-2">
				<Media className="align-items-center">
					<div className="avatar-sm mr-3">
						<div className="avatar-title bg-soft-primary text-primary rounded font-size-20">
							<i className={file.thumbnail}></i>
						</div>
					</div>
					<Media body>
						<div className="text-left">
							<h5 className="font-size-14 mb-1">{file.name}</h5>
							<p className="text-muted font-size-13 mb-0">{file.size}</p>
						</div>
					</Media>

					<div className="ml-4">
						<ul className="list-inline mb-0 font-size-18">
							<li className="list-inline-item">
								<div to="#" className="text-muted px-1">
									<i className="ri-download-2-line"></i>
								</div>
							</li>
							<UncontrolledDropdown className="list-inline-item">
								<DropdownToggle  className="text-muted px-1" tag="a">
									<i className="ri-more-fill"></i>
								</DropdownToggle >
								<DropdownMenu right>
								<DropdownItem>{t('Action')}</DropdownItem>
								<DropdownItem>{t('Another Action')}</DropdownItem>
								<DropdownItem divider />
								<DropdownItem>{t('Delete')}</DropdownItem>
								</DropdownMenu>
							</UncontrolledDropdown>
						</ul>
					</div>
				</Media>
			</Card>
		)
	}
        </React.Fragment>
    );
}

export default AttachedFiles;
