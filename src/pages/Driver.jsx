import { useContext, useEffect } from "react";
import { useParams } from "react-router-dom";
import DriverContext from "../store/context/Context";
import { io } from "socket.io-client";

// Establish socket connection
const socket = io("http://localhost:5000");

const DriverPage = () => {
  const { employeeID } = useParams();
  const { driver, setDriver } = useContext(DriverContext);

  // Find the driver by employeeID
  const currentDriver = driver.find((d) => d.employeeID === employeeID);

  // Listen for room notifications and handle the driver's actions
  useEffect(() => {
    // Listen for notifications to join a room
    socket.on("connect", () => {
      console.log("Driver connected with socket ID:", socket.id);
    });
    socket.on("joinRoomNotification", ({ room }) => {
      alert(`You have been requested to join the room: ${room}`);
      console.log(`Received joinRoomNotification for room: ${room}`);
      // The driver will need to manually trigger the joinRoom action if desired.
    });

    return () => {
      socket.off("joinRoomNotification");
    };
  }, []);

  // Function to toggle driver status
  const toggleStatus = () => {
    setDriver((prevDrivers) =>
      prevDrivers.map((d) =>
        d.employeeID === employeeID
          ? { ...d, status: d.status === "Available" ? "Busy" : "Available" }
          : d
      )
    );

    // Optionally notify server about status change (if needed for real-time updates)
    socket.emit("updateDriverStatus", {
      employeeID,
      status: currentDriver?.status === "Available" ? "Busy" : "Available",
    });
  };

  if (!currentDriver) {
    return (
      <div style={styles.notFound}>
        <p>Driver not found</p>
      </div>
    );
  }

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
        <button onClick={toggleStatus} style={styles.statusButton}>
          {currentDriver.status === "Available"
            ? "Set as Busy"
            : "Set as Available"}
        </button>
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
  notFound: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    fontSize: "18px",
    color: "#a0aec0",
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
  statusButton: {
    backgroundColor: "#3182ce",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "12px 20px",
    fontSize: "16px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  statusButtonHover: {
    backgroundColor: "#2b6cb0",
  },
  statusAvailable: {
    color: "#48bb78",
    fontWeight: "bold",
  },
  statusBusy: {
    color: "#e53e3e",
    fontWeight: "bold",
  },
};

export default DriverPage;
