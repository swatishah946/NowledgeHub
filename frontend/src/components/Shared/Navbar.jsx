import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { removeToken, isLoggedIn } from "../../utils/authUtils";
import { toast } from "react-hot-toast";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    removeToken();
    toast.success("You have been logged out.");
    navigate("/login");
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" onClick={closeMenu}>
        NowledgeHub
      </Link>

      {/* Mobile Toggle Button */}
      <button className="mobile-toggle" onClick={toggleMenu}>
        {isMenuOpen ? '✕' : '☰'}
      </button>

      <ul className={`navbar-menu ${isMenuOpen ? 'open' : ''}`}>
        <li className="nav-item">
          <Link to="/dashboard" className="nav-link" onClick={closeMenu}>Dashboard</Link>
        </li>
        <li className="nav-item">
          <Link to="/ai" className="nav-link" onClick={closeMenu}>AI Assistant</Link>
        </li>
        <li className="nav-item">
          <Link to="/chat" className="nav-link" onClick={closeMenu}>Chat</Link>
        </li>
        <li className="nav-item">
          <Link to="/roadmap" className="nav-link" onClick={closeMenu}>Roadmap</Link>
        </li>
        <li className="nav-item">
          <Link to="/quiz" className="nav-link" onClick={closeMenu}>Quiz</Link>
        </li>

        {isLoggedIn() ? (
          <li className="nav-item">
            <button onClick={handleLogout} className="btn-secondary" style={{ marginLeft: '1rem' }}>
              Logout
            </button>
          </li>
        ) : (
          <>
            <li className="nav-item">
              <Link to="/login" className="nav-link" onClick={closeMenu}>Login</Link>
            </li>
            <li className="nav-item">
              <Link to="/register" className="btn-primary" style={{ marginLeft: '1rem' }} onClick={closeMenu}>
                Register
              </Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
