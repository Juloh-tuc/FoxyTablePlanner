// src/components/NavBar.tsx
import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./navbar.css";
import logoFoxy from "../assets/Logo Foxy 2025@2x.png";

type LegacyProfile = { avatar?: string; username?: string };

export default function NavBar() {
  const nav = useNavigate();
  const { user, logout } = useAuth(); // <- source officielle (ft_user)
  const [legacy, setLegacy] = useState<LegacyProfile | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Fallback: lit l'ancien stockage "ft_profile" pour affichage si pas encore loggé via AuthContext
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ft_profile");
      setLegacy(raw ? JSON.parse(raw) : null);
    } catch {
      setLegacy(null);
    }
  }, [user]); // si user change, on re-check juste au cas où

  const closeMenu = () => setIsOpen(false);
  const toggleMenu = () => setIsOpen((v) => !v);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    "nav-link" + (isActive ? " active" : "");

  // Données d’affichage: priorité au contexte, sinon legacy
  const displayName = user?.name || legacy?.username || "";
  const displayAvatar = user?.avatarUrl || legacy?.avatar;

  const handleLogout = () => {
    closeMenu();
    logout();
    nav("/login", { replace: true });
  };

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
          <NavLink to="/table" className={linkClass} onClick={closeMenu}>
            Tableau
          </NavLink>
          <NavLink to="/agile" className={linkClass} onClick={closeMenu}>
            Agile
          </NavLink>
          <NavLink to="/month" className={linkClass} onClick={closeMenu}>
            Mois
          </NavLink>
        </div>

        {/* Right: actions + burger */}
        <div className="actions">
          {/* Profil (avatar ou bouton) */}
          {displayAvatar ? (
            <NavLink
              to="/login"
              className="avatar-btn"
              onClick={closeMenu}
              aria-label="Mon profil"
              title={displayName || "Mon profil"}
            >
              <img
                src={displayAvatar}
                alt={displayName || "Mon avatar"}
                className="avatar-img"
              />
            </NavLink>
          ) : (
            <NavLink to="/login" className="btn btn-primary" onClick={closeMenu}>
              Connexion
            </NavLink>
          )}

          {/* Bouton logout si connecté via AuthContext */}
          {user && (
            <button className="btn btn-ghost ml-8" onClick={handleLogout}>
              Déconnexion
            </button>
          )}

          {/* Burger */}
          <button
            className="burger"
            aria-label="Ouvrir le menu"
            aria-expanded={isOpen}
            aria-controls="menu-mobile"
            onClick={toggleMenu}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div id="menu-mobile" className={`menu-mobile ${isOpen ? "open" : ""}`}>
        <NavLink to="/table" className="mobile-link" onClick={closeMenu}>
          Tableau
        </NavLink>
        <NavLink to="/agile" className="mobile-link" onClick={closeMenu}>
          Agile
        </NavLink>
        <NavLink to="/week" className="mobile-link" onClick={closeMenu}>
          Mois
        </NavLink>
        <hr />
        {displayAvatar ? (
          <NavLink to="/login" className="mobile-link" onClick={closeMenu}>
            Mon profil
          </NavLink>
        ) : (
          <NavLink to="/login" className="mobile-link" onClick={closeMenu}>
            Connexion
          </NavLink>
        )}
        {user && (
          <button className="mobile-link btn-ghost mt-8" onClick={handleLogout}>
            Déconnexion
          </button>
        )}
      </div>
    </nav>
  );
}
