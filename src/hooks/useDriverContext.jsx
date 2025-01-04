import { useContext } from "react";
import DriverContext from "../store/context/Context.jsx";

const useDriverContext = () => {
  const context = useContext(DriverContext);

  if (!context) {
    throw new Error("useDriverContext must be used within a DriverProvider");
  }

  return context;
};

export default useDriverContext;
