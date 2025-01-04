import { createContext, useState } from "react";

const DriverContext = createContext();

export const DriverProvider = ({ children }) => {
  const [driver, setDriver] = useState([
    {
      employeeID: "123",
      driverName: "kupal",
      status: "Available",
      vehicle: "Ambulance",
    },
    {
      employeeID: "456",
      driverName: "Bobo",
      status: "Available",
      vehicle: "Fire Truck",
    },
    {
      employeeID: "789",
      driverName: "Bossing",
      status: "Available",
      vehicle: "Police Cars",
    },
  ]);

  return (
    <DriverContext.Provider value={{ driver, setDriver }}>
      {children}
    </DriverContext.Provider>
  );
};

export default DriverContext;
