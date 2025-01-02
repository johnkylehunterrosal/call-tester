import { Link, useNavigate } from "react-router-dom";
import "../style/header.css";

const Header = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <header
      style={{
        padding: "10px",
        background: "#f5f5f5",
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <h1>Taguig Emergency Web App </h1>
      <nav style={{ display: "flex", gap: "15px" }}>
        <Link to="/caller" style={{ textDecoration: "none", color: "blue" }}>
          Citizen
        </Link>
        <Link to="/agent" style={{ textDecoration: "none", color: "blue" }}>
          Taguig Command Center
        </Link>
        <button
          onClick={handleLogout}
          style={{
            padding: "5px 10px",
            background: "red",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </nav>
    </header>
  );
};

export default Header;
