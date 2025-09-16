// src/components/NavBar.tsx
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import "./navbar.css";
import logoFoxy from "../assets/Logo Foxy 2025@2x.png"; // ou BASE_URL si ton logo est dans /public

type StoredProfile = { avatar?: string; username?: string };

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<StoredProfile | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("ft_profile");
    if (raw) setProfile(JSON.parse(raw));
  }, []);

  const closeMenu = () => setIsOpen(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    "nav-link" + (isActive ? " active" : "");

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Left: brand */}
        <div className="brand">
          <NavLink to="/" onClick={closeMenu} className="brand-link" aria-label="Accueil FoxyTable">
            <img src={logoFoxy} alt="FoxyTable" className="navbar-logo" />
          </NavLink>
        </div>

        {/* Center: desktop nav */}
        <div className="nav-desktop" role="navigation" aria-label="Navigation principale">
          <NavLink to="/table" className={linkClass} onClick={closeMenu}>Table</NavLink>
          <NavLink to="/agile" className={linkClass} onClick={closeMenu}>Agile</NavLink>
          <NavLink to="/week"  className={linkClass} onClick={closeMenu}>Semaine</NavLink>
        </div>

        {/* Right: actions + burger */}
        <div className="actions">
          {profile?.avatar ? (
            <NavLink to="/login" className="avatar-btn" onClick={closeMenu} aria-label="Mon profil">
              <img src={profile.avatar} alt={profile.username || "Mon avatar"} className="avatar-img" />
            </NavLink>
          ) : (
            <NavLink to="/login" className="btn btn-primary" onClick={closeMenu}>Connexion</NavLink>
          )}

          <button
            className="burger"
            aria-label="Ouvrir le menu"
            aria-expanded={isOpen}
            aria-controls="menu-mobile"
            onClick={() => setIsOpen(v => !v)}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div id="menu-mobile" className={`menu-mobile ${isOpen ? "open" : ""}`}>
        <NavLink to="/table" className="mobile-link" onClick={closeMenu}>Table</NavLink>
        <NavLink to="/agile" className="mobile-link" onClick={closeMenu}>Agile</NavLink>
        <NavLink to="/week"  className="mobile-link" onClick={closeMenu}>Semaine</NavLink>
        <hr />
        {profile?.avatar ? (
          <NavLink to="/login" className="mobile-link" onClick={closeMenu}>Mon profil</NavLink>
        ) : (
          <NavLink to="/login" className="mobile-link" onClick={closeMenu}>Connexion</NavLink>
        )}
      </div>
    </nav>
  );
}
