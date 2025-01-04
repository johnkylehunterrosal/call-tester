import { useEffect, useRef, useState, useContext } from "react";
import io from "socket.io-client";
import DriverContext from "../store/context/Context"; // Import the driver context

// Function to dynamically connect to the server with fallback
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

const JoinCallPage = () => {
  const [me, setMe] = useState("");
  const [stream, setStream] = useState(null);
  const [incomingCalls, setIncomingCalls] = useState([]);
  const [activeCalls, setActiveCalls] = useState([]);
  const [roomDetails, setRoomDetails] = useState(null); // Room details
  const [room, setRoom] = useState("default-room"); // Default room
  const myVideo = useRef();
  const streamsRef = useRef({});
  const peerConnectionsRef = useRef({});

  const { driver } = useContext(DriverContext); // Access the driver context
  const availableDrivers = driver.filter((d) => d.status === "Available"); // Filter available drivers

  useEffect(() => {
    if (!socket) {
      console.error("Socket is not initialized.");
      return;
    }

    // Access media devices
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (myVideo.current) {
          myVideo.current.srcObject = stream;
        }
      })
      .catch((err) => console.error("Error accessing media devices:", err));

    // Join a room
    socket.emit("joinRoom", room);

    // Listen for room events
    socket.on("roomJoined", (data) => {
      console.log("Joined room:", data.room);
    });

    socket.on("roomUsers", (data) => {
      console.log("Users in room:", data.users);
    });

    socket.on("me", (id) => setMe(id));
    socket.on("callAllUsers", ({ from, signalData }) => {
      setIncomingCalls((prev) => [
        ...prev,
        { callerId: from, signal: signalData },
      ]);
    });

    socket.on("receiveIceCandidate", ({ candidate, from }) => {
      if (candidate && peerConnectionsRef.current[from]) {
        peerConnectionsRef.current[from]
          .addIceCandidate(new RTCIceCandidate(candidate))
          .catch((err) =>
            console.error(`Error adding ICE candidate from ${from}:`, err)
          );
      }
    });

    // Listen for room details after answering a call
    socket.on("roomDetails", ({ roomName, users }) => {
      console.log(`Room ID: ${roomName}`);
      console.log(`Users in room:`, users);
      setRoomDetails({ roomName, users });
    });

    return () => {
      // Cleanup on component unmount
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      socket.off();
    };
  }, [room]);

  const handleDriverJoin = (driver) => {
    if (!roomDetails?.roomName) {
      console.error("Room ID is not defined.");
      return;
    }

    // Emit a request to the server to notify the driver
    socket.emit("requestDriverJoin", {
      driverId: driver.employeeID,
      room: roomDetails.roomName,
    });
    console.log(
      `Requested ${driver.driverName} to join room: ${roomDetails.roomName}`
    );
  };

  const handleAnswerCall = async (callerId, signal) => {
    try {
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      peerConnectionsRef.current[callerId] = peerConnection;

      // Add local tracks to peer connection
      if (stream) {
        stream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, stream);
        });
      }

      // Handle remote track
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

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("sendIceCandidate", {
            candidate: event.candidate,
            to: callerId,
          });
        }
      };

      // Connection state logging
      peerConnection.onconnectionstatechange = () => {
        console.log(
          `Connection state for caller ${callerId}:`,
          peerConnection.connectionState
        );
      };

      // Set remote description
      if (signal?.type && signal?.sdp) {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(signal)
        );
      } else {
        console.error("Invalid signal received:", signal);
        return;
      }

      // Create and set local description (answer)
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Send the answer to the caller
      socket.emit("answerCall", { signal: answer, to: callerId });

      // Update active calls
      setActiveCalls((prev) => [...prev, callerId]);
      setIncomingCalls((prev) =>
        prev.filter((call) => call.callerId !== callerId)
      );
    } catch (error) {
      console.error("Error answering call:", error);
    }
  };

  return (
    <div style={styles.container}>
      {/* Incoming Calls Section */}
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
        {roomDetails && (
          <div style={styles.roomDetails}>
            <h3>Room Details</h3>
            <p>
              <strong>Room ID:</strong> {roomDetails.roomName}
            </p>
            <p>
              <strong>Users:</strong> {roomDetails.users.join(", ")}
            </p>
          </div>
        )}
      </div>

      {/* Video Streams Section */}
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

      {/* Available Drivers Section */}
      <div style={styles.driversSidebar}>
        <h2 style={styles.driversTitle}>Available Responder</h2>

        {availableDrivers.length > 0 ? (
          availableDrivers.map((driver) => (
            <div key={driver.employeeID} style={styles.driverCard}>
              <h3 style={styles.driverName}>
                <strong>Driver Name:</strong> {driver.driverName}
              </h3>
              <p style={styles.driverInfo}>
                <strong>Employee ID:</strong> {driver.employeeID}
              </p>
              <p style={styles.driverInfo}>
                <strong>Vehicle:</strong> {driver.vehicle}
              </p>
              <p style={styles.driverStatus}>
                <strong>Status:</strong> {driver.status}
              </p>
              <button
                style={styles.assignButton}
                onClick={() => handleDriverJoin(driver)}
              >
                Request to Join
              </button>
            </div>
          ))
        ) : (
          <p style={styles.noDrivers}>No drivers are available</p>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    backgroundColor: "#f5f7fa",
    color: "#333",
    height: "100vh",
    fontFamily: "'Roboto', sans-serif",
    overflow: "hidden",
  },
  sidebar: {
    width: "300px",
    backgroundColor: "#1a202c",
    color: "#ffffff",
    padding: "20px",
    borderRight: "1px solid #2d3748",
    flexShrink: 0,
    overflowY: "auto",
  },
  sidebarTitle: {
    fontSize: "20px",
    fontWeight: "600",
    marginBottom: "15px",
    color: "#63b3ed",
  },
  callCard: {
    marginBottom: "15px",
    padding: "15px",
    borderRadius: "10px",
    backgroundColor: "#2d3748",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)",
  },
  button: {
    backgroundColor: "#3182ce",
    color: "#ffffff",
    border: "none",
    borderRadius: "5px",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.3s",
  },
  buttonHover: {
    backgroundColor: "#2b6cb0",
  },
  noCalls: {
    fontStyle: "italic",
    color: "#a0aec0",
    textAlign: "center",
    marginTop: "20px",
  },
  mainContent: {
    width: "100%",
    flex: 1,
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    backgroundColor: "gray",
  },
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "20px",
    justifyContent: "center",
  },
  videoCard: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    boxShadow: "0 6px 10px rgba(0, 0, 0, 0.15)",
    height: "400px",
    width: "400px",
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: "100%",
    borderRadius: "10px",
    objectFit: "cover",
  },
  videoCardName: {
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
  driversSidebar: {
    width: "300px",
    backgroundColor: "#1a202c",
    color: "#ffffff",
    padding: "20px",
    borderLeft: "1px solid #2d3748",
    flexShrink: 0,
    overflowY: "auto",
  },
  driversTitle: {
    fontSize: "20px",
    fontWeight: "600",
    marginBottom: "15px",
    color: "#63b3ed",
  },
  driverCard: {
    backgroundColor: "#2d3748",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)",
    textAlign: "center",
    marginBottom: "15px",
    transition: "all 0.3s",
  },
  driverCardHover: {
    transform: "scale(1.02)",
  },
  driverName: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: "10px",
  },
  driverInfo: {
    fontSize: "14px",
    color: "#cbd5e0",
    marginBottom: "5px",
  },
  driverStatus: {
    fontSize: "14px",
    color: "#48bb78",
    marginBottom: "15px",
    fontWeight: "500",
  },
  assignButton: {
    backgroundColor: "#3182ce",
    color: "#ffffff",
    border: "none",
    borderRadius: "5px",
    padding: "10px 20px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.3s",
  },
  assignButtonHover: {
    backgroundColor: "#2b6cb0",
  },
  roomIDContainer: {
    marginTop: "10px",
    textAlign: "left",
  },
  roomIDLabel: {
    fontSize: "14px",
    color: "#a0aec0",
    marginBottom: "5px",
    display: "block",
  },
  roomIDInput: {
    width: "100%",
    padding: "8px",
    borderRadius: "5px",
    border: "1px solid #cbd5e0",
    marginBottom: "10px",
    backgroundColor: "#edf2f7",
    color: "#2d3748",
  },
  noDrivers: {
    fontStyle: "italic",
    color: "#a0aec0",
    textAlign: "center",
  },
};

export default JoinCallPage;
