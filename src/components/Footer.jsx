const Footer = () => {
  return (
    <footer style={footerStyle}>
      <div style={contentStyle}>
        <p>© 2024 Your Company. All Rights Reserved.</p>
        <p>
          <a href="/privacy" style={linkStyle}>
            Privacy Policy
          </a>{" "}
          |
          <a href="/terms" style={linkStyle}>
            {" "}
            Terms of Service
          </a>
        </p>
      </div>
    </footer>
  );
};

const footerStyle = {
  position: "fixed",
  bottom: 0,
  width: "100%",
  backgroundColor: "#282c34",
  color: "#fff",
  textAlign: "center",
  padding: "10px 0",
  fontSize: "14px",
  boxShadow: "0 -2px 5px rgba(0, 0, 0, 0.1)",
};

const contentStyle = {
  margin: "0 auto",
  maxWidth: "1200px",
};

const linkStyle = {
  color: "#61dafb",
  textDecoration: "none",
  margin: "0 5px",
};

export default Footer;
