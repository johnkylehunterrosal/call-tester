import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const connectToSocketServer = () => {
  const primaryServer = "http://localhost:5000";
  const fallbackServer = "http://192.168.68.53:5000";

  try {
    const socket = io(primaryServer, { timeout: 5000 });
    socket.on("connect_error", () => {
      console.warn(
        `Failed to connect to ${primaryServer}. Trying fallback server.`
      );
      const fallbackSocket = io(fallbackServer, { timeout: 5000 });
      return fallbackSocket;
    });
    return socket;
  } catch (error) {
    console.error("Error connecting to servers:", error);
    return null;
  }
};

const socket = connectToSocketServer();

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

    if (socket) {
      socket.on("me", (id) => setMe(id));

      socket.on("callAccepted", async (signal) => {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(signal)
        );
        setCallAccepted(true);
      });

      socket.on("receiveIceCandidate", ({ candidate }) => {
        if (candidate) {
          peerConnection.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        }
      });

      socket.on("endCall", () => endCall());
    }

    return () => {
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      if (socket) {
        socket.off();
      }
    };
  }, [socket]);
  useEffect(() => {
    // Signal for when a new participant joins
    socket.on("newParticipant", ({ id }) => {
      console.log(`New participant joined: ${id}`);
      if (!peerConnections.current[id]) {
        const pc = createPeerConnection(id);
        sendOffer(pc, id); // Send an offer to the new participant
      }
    });

    // Handle received offers
    socket.on("offer", async ({ from, offer }) => {
      console.log(`Received offer from ${from}`);
      const pc = createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { answer, to: from });
      console.log(`Sent answer to ${from}`);
    });

    // Handle received answers
    socket.on("answer", async ({ from, answer }) => {
      console.log(`Received answer from ${from}`);
      const pc = peerConnections.current[from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`Set remote description for ${from}`);
      }
    });

    // Handle received ICE candidates
    socket.on("candidate", ({ from, candidate }) => {
      console.log(`Received ICE candidate from ${from}`);
      const pc = peerConnections.current[from];
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
          console.error(`Error adding ICE candidate from ${from}:`, err);
        });
      }
    });

    // Cleanup
    return () => {
      socket.off("newParticipant");
      socket.off("offer");
      socket.off("answer");
      socket.off("candidate");
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
      <h1 style={styles.title}>Live Video Call</h1>
      <div style={styles.videoContainer}>
        <div style={styles.videoCard}>
          <video ref={myVideo} autoPlay muted style={styles.video} />
          <h3 style={styles.videoCardName}>{name}</h3>
        </div>
        {callAccepted && (
          <div style={styles.videoCard}>
            <video ref={userVideo} autoPlay style={styles.video} />
            <h3 style={styles.videoCardName}>Agent</h3>
          </div>
        )}
      </div>
      <div style={styles.controls}>
        {!callAccepted && !callEnded && (
          <button
            onClick={startCall}
            style={{ ...styles.button, ...styles.startButton }}
            disabled={!stream}
          >
            Start Call
          </button>
        )}
        {callAccepted && (
          <button
            onClick={endCall}
            style={{ ...styles.button, ...styles.endButton }}
          >
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
    padding: "20px",
    backgroundColor: "gray",
    minHeight: "100vh",
    color: "#fff",
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: "bold",
    marginBottom: "30px",
    textShadow: "0 4px 8px rgba(0, 0, 0, 0.4)",
  },
  videoContainer: {
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: "30px",
  },
  videoCard: {
    position: "relative",
    width: "350px",
    height: "250px",
    borderRadius: "15px",
    background: "rgba(255, 255, 255, 0.1)",
    boxShadow: "0 6px 15px rgba(0, 0, 0, 0.3)",
    overflow: "hidden",
    backdropFilter: "blur(10px)",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  videoCardName: {
    position: "absolute",
    bottom: "10px",
    left: "10px",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    color: "#fff",
    padding: "5px 10px",
    borderRadius: "5px",
    fontSize: "14px",
    textShadow: "0 2px 4px rgba(0, 0, 0, 0.4)",
  },
  controls: {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
  },
  button: {
    padding: "12px 25px",
    fontSize: "16px",
    fontWeight: "bold",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  startButton: {
    backgroundColor: "#4ade80",
    color: "#fff",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
  },
  endButton: {
    backgroundColor: "#ef4444",
    color: "#fff",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
  },
};

export default CallerPage;
