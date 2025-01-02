import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // Assuming you're using react-router for navigation
import "../style/login.css";

const Login = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const { username, password } = credentials;
    if (!username || !password) {
      setErrorMessage("Please enter both username and password.");
      return false;
    }
    return true;
  };

  const clickLogin = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const { username, password } = credentials;
      const response = await axios.post("http://localhost:3000/login", {
        username,
        password,
      });

      if (response.data.token) {
        const token = response.data.token;
        alert("Login Successful", "You have successfully logged in.");

        // Check the username and navigate accordingly
        if (username === "caller") {
          navigate("/caller", { state: { token, username } });
        } else if (username === "agent") {
          navigate("/agent", { state: { token, username } });
        } else {
          setErrorMessage("Invalid user type.");
        }
      } else {
        setErrorMessage(response.data.message || "Invalid credentials.");
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Login to Taguig Command Center App</h2>
        {errorMessage && (
          <div className="error-message">{errorMessage}</div>
        )}{" "}
        {/* Display error message */}
        <form onSubmit={clickLogin}>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Enter your username"
              value={credentials.username}
              onChange={handleInputChange}
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              value={credentials.password}
              onChange={handleInputChange}
            />
          </div>
          <button type="submit" className="login-button">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
