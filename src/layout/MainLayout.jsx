import { Outlet } from "react-router-dom";
import Footer from "../components/Footer";
import Header from "../components/Header";
import "../style/mainlayout.css";

const MainLayout = () => {
  return (
    <div className="main-layout">
      <header className="main-layout__header">
        <Header />
      </header>
      <main className="main-layout__content">
        <Outlet />
      </main>
      {/* <footer className="main-layout__footer">
        <Footer />
      </footer> */}
    </div>
  );
};

export default MainLayout;
