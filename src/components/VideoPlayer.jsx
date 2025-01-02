import { useContext } from "react";
import { SocketContext } from "../store/context/Context.jsx";
import "../style/video-player.css";

const VideoPlayer = () => {
  const { name, callAccepted, myVideo, userVideo, callEnded, stream, call } =
    useContext(SocketContext);

  return (
    <div className="video-player-container">
      {stream && (
        <div className="video-container">
          <h5 className="video-title">{name || "My Name"}</h5>
          <video
            className="video-element"
            playsInline
            muted
            ref={myVideo}
            autoPlay
          />
        </div>
      )}
      {callAccepted && !callEnded && (
        <div className="video-container">
          <h5 className="video-title">{call.name || "User Name"}</h5>
          <video
            className="video-element"
            playsInline
            ref={userVideo}
            autoPlay
          />
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
