import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import "./navbar.css";

export default function NavBar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobile = () => setIsMobileMenuOpen(false);
  const toggleMobile = () => setIsMobileMenuOpen(v => !v);

  return (
    <nav className="navbar tone-indigo">{/* change "tone-*" si tu veux une autre palette */}
      <div className="navbar-container">
        {/* Brand */}
        <div className="navbar-brand">
          <h2>FoxyTable</h2>
        </div>

        {/* Desktop navigation */}
        <div className="navbar-nav" role="navigation" aria-label="Primary">
          <NavLink
            to="/table"
            className={({ isActive }) => `nav-button ${isActive ? "active" : ""}`}
            onClick={closeMobile}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-text">Tableau</span>
          </NavLink>

          <NavLink
            to="/agile"
            className={({ isActive }) => `nav-button ${isActive ? "active" : ""}`}
            onClick={closeMobile}
          >
            <span className="nav-icon">🗂️</span>
            <span className="nav-text">Agile</span>
          </NavLink>

          <NavLink
            to="/semaine"
            className={({ isActive }) => `nav-button ${isActive ? "active" : ""}`}
            onClick={closeMobile}
          >
            <span className="nav-icon">📅</span>
            <span className="nav-text">Semainier</span>
          </NavLink>

          <NavLink
            to="/login"
            className="nav-button"
            onClick={closeMobile}
          >
            <span className="nav-icon">🔐</span>
            <span className="nav-text">Connexion</span>
          </NavLink>
        </div>

        {/* Mobile toggle */}
        <button
          className="mobile-menu-button"
          onClick={toggleMobile}
          aria-label="Ouvrir le menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-nav"
        >
          <span className={`hamburger ${isMobileMenuOpen ? "open" : ""}`}>
            <span></span><span></span><span></span>
          </span>
        </button>
      </div>

      {/* Mobile navigation */}
      <div
        id="mobile-nav"
        className={`mobile-nav ${isMobileMenuOpen ? "open" : ""}`}
        role="menu"
        aria-label="Primary mobile"
      >
        <NavLink
          to="/table"
          className={({ isActive }) => `mobile-nav-button ${isActive ? "active" : ""}`}
          onClick={closeMobile}
        >
          <span className="nav-icon">📊</span>
          <span className="nav-text">Tableau</span>
        </NavLink>

        <NavLink
          to="/agile"
          className={({ isActive }) => `mobile-nav-button ${isActive ? "active" : ""}`}
          onClick={closeMobile}
        >
          <span className="nav-icon">🗂️</span>
          <span className="nav-text">Agile</span>
        </NavLink>

        <NavLink
          to="/semaine"
          className={({ isActive }) => `mobile-nav-button ${isActive ? "active" : ""}`}
          onClick={closeMobile}
        >
          <span className="nav-icon">📅</span>
          <span className="nav-text">Semainier</span>
        </NavLink>

        <NavLink
          to="/login"
          className="mobile-nav-button"
          onClick={closeMobile}
        >
          <span className="nav-icon">🔐</span>
          <span className="nav-text">Connexion</span>
        </NavLink>
      </div>
    </nav>
  );
}
