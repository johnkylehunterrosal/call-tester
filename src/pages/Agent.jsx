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

  useEffect(() => {
    socket.on("updateIncomingCalls", ({ answeredCallId, remainingCalls }) => {
      setIncomingCalls((prev) =>
        prev.filter((call) => call.callerId !== answeredCallId)
      );
      console.log("Updated incoming calls across ports:", remainingCalls);
    });

    return () => {
      socket.off("updateIncomingCalls");
    };
  }, []); // Run when room changes

  const handleAnswerCall = async (callerId, signal) => {
    // Call handling logic (same as your existing code)
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
        <h2 style={styles.driversTitle}>Available Drivers</h2>
        {availableDrivers.length > 0 ? (
          availableDrivers.map((driver) => (
            <div key={driver.employeeID} style={styles.driverCard}>
              <h3 style={styles.driverName}>{driver.driverName}</h3>
              <p style={styles.driverInfo}>
                <strong>Employee ID:</strong> {driver.employeeID}
              </p>
              <p style={styles.driverStatus}>
                <strong>Status:</strong> {driver.status}
              </p>
              <button style={styles.assignButton}>Join Call</button>
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
    backgroundColor: "#1f1f1f",
    color: "#ffffff",
    height: "100vh", // Full-screen height
  },
  sidebar: {
    width: "300px",
    backgroundColor: "#2b2b2b",
    color: "#ffffff",
    padding: "20px",
    borderRight: "1px solid #444",
    flexShrink: 0,
    overflowY: "auto",
  },
  mainContent: {
    flex: 1,
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center", // Center the video section
    justifyContent: "center",
    overflowY: "auto",
  },
  driversSidebar: {
    width: "300px",
    backgroundColor: "#2b2b2b",
    color: "#ffffff",
    padding: "20px",
    borderLeft: "1px solid #444",
    flexShrink: 0,
    overflowY: "auto",
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
  driversTitle: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#3b82f6",
    marginBottom: "10px",
  },
  driverCard: {
    backgroundColor: "#2b2b2b",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
    textAlign: "center",
    marginBottom: "10px",
  },
  driverName: {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "10px",
  },
  driverInfo: {
    fontSize: "16px",
    marginBottom: "5px",
  },
  driverStatus: {
    fontSize: "16px",
    color: "#10b981",
    marginBottom: "10px",
  },
  assignButton: {
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    border: "none",
    borderRadius: "5px",
    padding: "10px 20px",
    cursor: "pointer",
  },
};

export default JoinCallPage;
