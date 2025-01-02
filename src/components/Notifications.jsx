// src/components/Notifications.jsx

import { useContext } from "react";
import { SocketContext } from "../store/context/Context.jsx";
import "../style/notification.css";

const Notifications = () => {
  const { answerCall, call, callAccepted } = useContext(SocketContext);

  return (
    <>
      {!callAccepted && (
        <div className="notifications-container">
          <h3 className="notification-heading">{call.name} is calling</h3>
          <button className="answer-btn" onClick={answerCall}>
            Answer Call
          </button>
        </div>
      )}
    </>
  );
};

export default Notifications;
