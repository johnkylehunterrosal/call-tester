import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io.connect("http://localhost:5000");

const JoinCallPage = () => {
  const [me, setMe] = useState("");
  const [stream, setStream] = useState(null);
  const [incomingCalls, setIncomingCalls] = useState([]);
  const [activeCalls, setActiveCalls] = useState([]);
  const myVideo = useRef();
  const streamsRef = useRef({});
  const peerConnectionsRef = useRef({});

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
    socket.on("callAllUsers", ({ from, signalData }) => {
      setIncomingCalls((prev) => [
        ...prev,
        { callerId: from, signal: signalData },
      ]);
    });

    socket.on("receiveIceCandidate", ({ candidate, from }) => {
      if (candidate && peerConnectionsRef.current[from]) {
        peerConnectionsRef.current[from].addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      }
    });

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      socket.off();
    };
  }, []);

  const handleAnswerCall = async (callerId, signal) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    peerConnectionsRef.current[callerId] = peerConnection;
    if (stream) {
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });
    }

    peerConnection.ontrack = (event) => {
      const assignStreamToVideo = () => {
        if (streamsRef.current[callerId]) {
          streamsRef.current[callerId].srcObject = event.streams[0];
        } else {
          setTimeout(assignStreamToVideo, 100);
        }
      };
      assignStreamToVideo();
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("sendIceCandidate", {
          candidate: event.candidate,
          to: callerId,
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log(
        `Connection state for caller ${callerId}:`,
        peerConnection.connectionState
      );
    };

    if (signal && signal.type && signal.sdp) {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(signal)
      );
    }

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit("answerCall", { signal: answer, to: callerId });

    setActiveCalls((prev) => [...prev, callerId]);
    setIncomingCalls((prev) =>
      prev.filter((call) => call.callerId !== callerId)
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h2 style={styles.sidebarTitle}>Incoming Calls</h2>
        {incomingCalls.length > 0 ? (
          incomingCalls.map(({ callerId, signal }) => (
            <div key={callerId} style={styles.callCard}>
              <p>Call from: {callerId}</p>
              <button
                onClick={() => handleAnswerCall(callerId, signal)}
                style={styles.button}
              >
                Answer
              </button>
            </div>
          ))
        ) : (
          <p style={styles.noCalls}>No incoming calls</p>
        )}
      </div>
      <div style={styles.mainContent}>
        <div style={styles.gridContainer}>
          <div style={styles.videoCard}>
            <video ref={myVideo} autoPlay muted style={styles.video} />
            <h3 style={styles.videoCardName}>Agent</h3>
          </div>
          {activeCalls.map((callerId) => (
            <div key={callerId} style={styles.videoCard}>
              <video
                ref={(el) => {
                  if (el) {
                    streamsRef.current[callerId] = el;
                  }
                }}
                autoPlay
                style={styles.video}
              />
              <h3 style={styles.videoCardName}>Taguig Citizen</h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    backgroundColor: "#1f1f1f",
    height: "100vh",
  },
  sidebar: {
    width: "300px",
    backgroundColor: "#2b2b2b",
    color: "#ffffff",
    padding: "20px",
    borderRight: "1px solid #444",
  },
  sidebarTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "20px",
  },
  mainContent: {
    flex: 1,
    padding: "20px",
    display: "flex",
    flexDirection: "column",
  },
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "20px",
  },
  videoCard: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#333",
    borderRadius: "10px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
    height: "400px",
    width: "400px",
  },
  video: {
    width: "100%",
    height: "100%",
    borderRadius: "10px",
  },
  videoCardName: {
    position: "absolute",
    bottom: "45px",
    left: "15px",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    color: "#fff",
    padding: "5px 10px",
    borderRadius: "5px",
    fontSize: "14px",
  },
  callCard: {
    marginBottom: "10px",
    padding: "10px",
    borderRadius: "8px",
    backgroundColor: "#444",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    border: "none",
    borderRadius: "5px",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "14px",
  },
  noCalls: {
    fontStyle: "italic",
    color: "#999",
  },
};

export default JoinCallPage;
