import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import Login from "./pages/Login";
import CallerPage from "./pages/Caller";
import AgentPage from "./pages/Agent";
import DriverPage from "./pages/Driver";
import { DriverProvider } from "./store/context/Context.jsx";

const App = () => {
  return (
    <DriverProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/caller" element={<MainLayout />}>
            <Route index element={<CallerPage />} />
          </Route>
          <Route path="/agent" element={<MainLayout />}>
            <Route index element={<AgentPage />} />
          </Route>
          <Route path="/driver" element={<MainLayout />}>
            <Route index element={<DriverPage />} />
          </Route>
          <Route path="/driver/:employeeID" element={<MainLayout />}>
            <Route index element={<DriverPage />} />
          </Route>
        </Routes>
      </Router>
    </DriverProvider>
  );
};

export default App;
