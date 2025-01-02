import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import Login from "./pages/Login";
import CallerPage from "./pages/Caller";
import AgentPage from "./pages/Agent";
// import { ContextProvider } from "./store/context/Context.jsx";

const App = () => {
  return (
    // <ContextProvider>
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/caller" element={<MainLayout />}>
          <Route index element={<CallerPage />} />
        </Route>
        <Route path="/agent" element={<MainLayout />}>
          <Route index element={<AgentPage />} />
        </Route>
      </Routes>
    </Router>
    // </ContextProvider>
  );
};

export default App;
