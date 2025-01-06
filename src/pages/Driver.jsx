import { useEffect, useRef, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import DriverContext from "../store/context/Context";

// Establish socket connection
const socket = io("http://localhost:5000");

const DriverPage = () => {
  const { driver } = useContext(DriverContext);
  const [stream, setStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [roomId, setRoomId] = useState(""); // State for the room ID
  const { employeeID } = useParams();
  const myVideo = useRef();
  const remoteVideos = useRef({});
  const peerConnections = useRef({});
  const currentDriver = driver.find((d) => d.employeeID === employeeID);

  useEffect(() => {
    // Get local media stream
    console.log(socket.on("me"));
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (myVideo.current) {
          myVideo.current.srcObject = stream;
        }
      })
      .catch((err) => console.error("Error accessing media devices:", err));

    // Handle new participant joining the room
    socket.on("newParticipant", ({ participantId }) => {
      console.log(`New participant joined: ${participantId}`);
      createPeerConnection(participantId);
    });

    // Handle incoming offers
    socket.on("offer", async ({ from, offer }) => {
      const pc = createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { answer, to: from });
    });

    // Handle incoming answers
    socket.on("answer", async ({ from, answer }) => {
      const pc = peerConnections.current[from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    // Handle incoming ICE candidates
    socket.on("candidate", ({ candidate, from }) => {
      const pc = peerConnections.current[from];
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
          console.error(`Error adding ICE candidate from ${from}:`, err);
        });
      }
    });

    // Cleanup on component unmount
    return () => {
      socket.off("newParticipant");
      socket.off("offer");
      socket.off("answer");
      socket.off("candidate");
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      Object.values(peerConnections.current).forEach((pc) => pc.close());
    };
  }, [roomId]);

  const createPeerConnection = (participantId) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    peerConnections.current[participantId] = pc;

    // Add local stream tracks to peer connection
    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    // Handle incoming remote streams
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setRemoteStreams((prev) => {
        const existingStream = prev.find(
          (s) => s.participantId === participantId
        );
        if (existingStream) return prev; // Avoid duplicates
        return [...prev, { stream: remoteStream, participantId }];
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("candidate", {
          candidate: event.candidate,
          to: participantId,
        });
      }
    };

    return pc;
  };

  const joinRoom = () => {
    if (!roomId.trim()) {
      console.error("Room ID is required");
      return;
    }
    socket.emit("joinRoom", { room: roomId, driver: currentDriver });

    socket.on("roomUsers", ({ users }) => {
      users.forEach((userId) => {
        if (userId !== socket.id) {
          const pc = createPeerConnection(userId);
          sendOffer(pc, userId);
        }
      });
    });
  };

  const sendOffer = async (pc, userId) => {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", { offer, to: userId });
  };

  return (
    <div style={styles.container}>
      <div style={styles.profileCard}>
        <div style={styles.profileHeader}>
          <img
            src={`https://i.pravatar.cc/150?u=${currentDriver.employeeID}`}
            alt={`${currentDriver.driverName}'s avatar`}
            style={styles.avatar}
          />
          <div>
            <h2 style={styles.driverName}>{currentDriver.driverName}</h2>
            <p style={styles.driverRole}>Professional Driver</p>
          </div>
        </div>
        <div style={styles.details}>
          <p>
            <strong>Employee ID:</strong> {currentDriver.employeeID}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            <span
              style={
                currentDriver.status === "Available"
                  ? styles.statusAvailable
                  : styles.statusBusy
              }
            >
              {currentDriver.status}
            </span>
          </p>
        </div>
        <div style={styles.roomSection}>
          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            style={styles.roomInput}
          />
          <button onClick={joinRoom} style={styles.joinButton}>
            Join Room
          </button>
        </div>
        <div style={styles.videoSection}>
          {/* Local Video */}
          <div style={styles.videoCard}>
            <video ref={myVideo} autoPlay muted style={styles.video} />
            <h3 style={styles.videoLabel}>Your Video</h3>
          </div>

          {/* Remote Videos */}
          {remoteStreams.map(({ stream, participantId }) => (
            <div key={participantId} style={styles.videoCard}>
              <video
                ref={(el) => {
                  if (el) {
                    el.srcObject = stream;
                    remoteVideos.current[participantId] = el;
                  }
                }}
                autoPlay
                style={styles.video}
              />
              <h3 style={styles.videoLabel}>Participant: {participantId}</h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: "#f5f7fa",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "'Roboto', sans-serif",
    color: "#333",
  },
  profileCard: {
    backgroundColor: "#ffffff",
    padding: "30px",
    borderRadius: "12px",
    width: "400px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    textAlign: "center",
    position: "relative",
  },
  profileHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "20px",
  },
  avatar: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    marginRight: "15px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  },
  driverName: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#2d3748",
    margin: "0",
  },
  driverRole: {
    fontSize: "14px",
    color: "#718096",
    marginTop: "4px",
  },
  details: {
    fontSize: "16px",
    lineHeight: "1.6",
    color: "#4a5568",
    marginBottom: "20px",
    textAlign: "left",
    borderTop: "1px solid #e2e8f0",
    paddingTop: "15px",
  },
  statusAvailable: {
    color: "#48bb78",
    fontWeight: "bold",
  },
  statusBusy: {
    color: "#e53e3e",
    fontWeight: "bold",
  },
  videoSection: {
    display: "flex",
    flexWrap: "wrap",
    gap: "20px",
    justifyContent: "center",
    marginTop: "20px",
  },
  videoCard: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    boxShadow: "0 6px 10px rgba(0, 0, 0, 0.15)",
    height: "300px",
    width: "300px",
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  videoLabel: {
    position: "absolute",
    bottom: "10px",
    left: "10px",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    color: "#ffffff",
    padding: "5px 10px",
    borderRadius: "5px",
    fontSize: "14px",
    fontWeight: "500",
  },
  roomSection: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "20px",
  },
  roomInput: {
    padding: "10px",
    fontSize: "16px",
    border: "1px solid #ccc",
    borderRadius: "5px",
    marginRight: "10px",
  },
  joinButton: {
    padding: "10px 20px",
    fontSize: "16px",
    color: "#fff",
    backgroundColor: "#3182ce",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};

export default DriverPage;
