import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io.connect("http://localhost:5000");

const CallerPage = () => {
  const [me, setMe] = useState("");
  const [stream, setStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("Caller");
  const myVideo = useRef();
  const userVideo = useRef();
  const peerConnection = useRef();

  const iceServers = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302", // Google's free STUN server
      },
    ],
  };

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (myVideo.current) {
          myVideo.current.srcObject = stream;
        }
      })
      .catch((err) => console.error("Error accessing media devices:", err));

    socket.on("me", (id) => setMe(id));

    socket.on("callAccepted", async (signal) => {
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(signal)
      );
      setCallAccepted(true);
    });

    socket.on("receiveIceCandidate", ({ candidate }) => {
      if (candidate) {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on("endCall", () => endCall());

    return () => {
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      socket.off();
    };
  }, []);

  const startCall = async () => {
    if (!stream) return;

    peerConnection.current = new RTCPeerConnection(iceServers);

    peerConnection.current.ontrack = (event) => {
      if (userVideo.current) {
        userVideo.current.srcObject = event.streams[0];
      }
    };

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("sendIceCandidate", {
          candidate: event.candidate,
          to: "all",
        });
      }
    };

    stream.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, stream);
    });

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    socket.emit("callAllUsers", { signalData: offer, from: me, name });
    setCallAccepted(true);
  };

  const endCall = () => {
    setCallEnded(true);
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    socket.emit("endCall");
    if (userVideo.current) {
      userVideo.current.srcObject = null;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.videoContainer}>
        <div style={styles.videoWrapper}>
          <video ref={myVideo} autoPlay muted style={styles.video} />
          <div style={styles.nameTag}>{name}</div>
        </div>
        {callAccepted && (
          <div style={styles.videoWrapper}>
            <video ref={userVideo} autoPlay style={styles.video} />
            <div style={styles.nameTag}>Agent</div>
          </div>
        )}
      </div>
      <div style={styles.controls}>
        {!callAccepted && !callEnded && (
          <button onClick={startCall} style={styles.button} disabled={!stream}>
            Start Call
          </button>
        )}
        {callAccepted && (
          <button onClick={endCall} style={styles.endButton}>
            End Call
          </button>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    backgroundColor: "#202124",
    minHeight: "100vh",
    color: "#fff",
  },
  videoContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "20px",
    marginBottom: "20px",
  },
  videoWrapper: {
    position: "relative",
  },
  video: {
    width: "400px",
    height: "300px",
    borderRadius: "10px",
    backgroundColor: "#000",
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)",
  },
  nameTag: {
    position: "absolute",
    bottom: "10px",
    left: "10px",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    color: "#fff",
    padding: "5px 10px",
    borderRadius: "5px",
    fontSize: "14px",
  },
  controls: {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
  },
  button: {
    padding: "10px 20px",
    fontSize: "16px",
    color: "#fff",
    backgroundColor: "#0d6efd",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    transition: "background-color 0.3s",
  },
  endButton: {
    padding: "10px 20px",
    fontSize: "16px",
    color: "#fff",
    backgroundColor: "#dc3545",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    transition: "background-color 0.3s",
  },
};

export default CallerPage;
