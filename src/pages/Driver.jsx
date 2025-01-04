import { useContext } from "react";
import { useParams } from "react-router-dom";
import DriverContext from "../store/context/Context";

const DriverPage = () => {
  const { employeeID } = useParams();
  const { driver, setDriver } = useContext(DriverContext);

  // Find the driver by employeeID
  const currentDriver = driver.find((d) => d.employeeID === employeeID);

  // Function to toggle driver status
  const toggleStatus = () => {
    setDriver((prevDrivers) =>
      prevDrivers.map((d) =>
        d.employeeID === employeeID
          ? { ...d, status: d.status === "Available" ? "Busy" : "Available" }
          : d
      )
    );
  };

  if (!currentDriver) {
    return <p style={{ color: "#fff" }}>Driver not found</p>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.profileCard}>
        <div style={styles.profileHeader}>
          <h2 style={styles.driverName}>{currentDriver.driverName}</h2>
          <button onClick={toggleStatus} style={styles.statusButton}>
            {currentDriver.status === "Available" ? "Answer" : "On Call"}
          </button>
        </div>
        <div style={styles.details}>
          <p>
            <strong>Employee ID:</strong> {currentDriver.employeeID}
          </p>
          <p>
            <strong>Status:</strong> {currentDriver.status}
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: "#1f1f1f",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#ffffff",
  },
  profileCard: {
    backgroundColor: "#2b2b2b",
    padding: "30px",
    borderRadius: "12px",
    width: "400px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.5)",
  },
  profileHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  driverName: {
    fontSize: "24px",
    fontWeight: "bold",
  },
  statusButton: {
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    border: "none",
    borderRadius: "5px",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "14px",
  },
  details: {
    fontSize: "16px",
    lineHeight: "1.6",
  },
};

export default DriverPage;
