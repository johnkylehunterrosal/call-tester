import { useState, useContext } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { BiClipboard, BiPhoneCall, BiPhoneOff } from "react-icons/bi";
import { SocketContext } from "../store/context/Context.jsx";
import "../style/options.css";

const Options = () => {
  const { me, callAccepted, name, setName, callEnded, leaveCall, callUser } =
    useContext(SocketContext);
  const [idToCall, setIdToCall] = useState("");

  return (
    <div className="options-container">
      <div className="options-box">
        <form className="form">
          <div className="form-section">
            <h6 className="section-title">Account Info</h6>
            <label className="form-label">Username</label>
            <input
              className="form-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <CopyToClipboard text={me}>
              <button
                className="btn copy-btn"
                type="button" // This prevents the form submission
                onClick={(e) => e.preventDefault()}
              >
                <BiClipboard className="icon" />
                Copy ID
              </button>
            </CopyToClipboard>
          </div>
          <div className="form-section">
            <h6 className="section-title">Make a Call</h6>
            <label className="form-label">User ID to Call</label>
            <input
              className="form-input"
              type="text"
              value={idToCall}
              onChange={(e) => setIdToCall(e.target.value)}
            />
            {callAccepted && !callEnded ? (
              <button className="btn hangup-btn" onClick={leaveCall}>
                <BiPhoneOff className="icon" />
                Hang Up
              </button>
            ) : (
              <button
                className="btn call-btn"
                onClick={() => callUser(idToCall)}
                type="button"
              >
                <BiPhoneCall className="icon" />
                Call
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Options;
