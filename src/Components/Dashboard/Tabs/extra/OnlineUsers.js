import React from 'react';

//carousel
import AliceCarousel from 'react-alice-carousel'
import 'react-alice-carousel/lib/alice-carousel.css'

//Import Images
import avatar2 from "../../../assets/images/users/avatar-2.jpg";
import avatar4 from "../../../assets/images/users/avatar-4.jpg";
import avatar5 from "../../../assets/images/users/avatar-5.jpg";
import avatar6 from "../../../assets/images/users/avatar-6.jpg";

function OnlineUsers(props) {
      const responsive = {
        0: { items: 4 },
        1024: { items: 4 },
      }
    return (
        <React.Fragment>
            {/* Start user status */}
            <div className="px-4 pb-4" dir="ltr">
                <AliceCarousel
                    responsive={responsive}
                    buttonsDisabled={true}
                    dotsDisabled = {true}
                    mouseTrackingEnabled
                >
                                        <div className="item">
                                            <div to="#" className="user-status-box">
                                                <div className="avatar-xs mx-auto d-block chat-user-img online">
                                                    <img src={avatar2} alt="user-img" className="img-fluid rounded-circle" />
                                                    <span className="user-status"></span>
                                                </div>

                                                <h5 className="font-size-13 text-truncate mt-3 mb-1">Patrick</h5>
                                            </div>
                                        </div>
                                        <div className="item">
                                            <div to="#" className="user-status-box">
                                                <div className="avatar-xs mx-auto d-block chat-user-img online">
                                                    <img src={avatar4} alt="user-img" className="img-fluid rounded-circle" />
                                                    <span className="user-status"></span>
                                                </div>

                                                <h5 className="font-size-13 text-truncate mt-3 mb-1">Doris</h5>
                                            </div>
                                        </div>

                                        <div className="item">
                                            <div to="#" className="user-status-box">
                                                <div className="avatar-xs mx-auto d-block chat-user-img online">
                                                    <img src={avatar5} alt="user-img" className="img-fluid rounded-circle" />
                                                    <span className="user-status"></span>
                                                </div>

                                                <h5 className="font-size-13 text-truncate mt-3 mb-1">Emily</h5>
                                            </div>
                                        </div>

                                        <div className="item">
                                            <div to="#" className="user-status-box">
                                                <div className="avatar-xs mx-auto d-block chat-user-img online">
                                                    <img src={avatar6} alt="user-img" className="img-fluid rounded-circle" />
                                                    <span className="user-status"></span>
                                                </div>

                                                <h5 className="font-size-13 text-truncate mt-3 mb-1">Steve</h5>
                                            </div>
                                        </div>
                                        

                                        <div className="item">
                                            <div to="#" className="user-status-box">
                                                <div className="avatar-xs mx-auto d-block chat-user-img online">
                                                    <span className="avatar-title rounded-circle bg-soft-primary text-primary">
                                                        T
                                                    </span>
                                                    <span className="user-status"></span>
                                                </div>

                                                <h5 className="font-size-13 text-truncate mt-3 mb-1">Teresa</h5>
                                            </div>
                                        </div>
                                    </AliceCarousel>
                                {/* end user status carousel */}
                            </div>
                            {/* end user status  */}
        </React.Fragment>
    );
}

export default OnlineUsers;
