// src/App.tsx
import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import NavBar from "./components/NavBar";
import PlannerTable from "./pages/PlannerTable";
import PlannerAgile from "./pages/PlannerAgile";
import PlannerWeek from "./pages/PlannerWeek";
import Login from "./pages/Login";

import { AuthProvider } from "./contexts/AuthContext";
import RequireAuth from "./components/RequireAuth";

export default function App() {
  // --- NEW: état global "Mode réunion" avec persistance localStorage
  const [readOnly, setReadOnly] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("tableReadOnly");
      return raw ? JSON.parse(raw) === true : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("tableReadOnly", JSON.stringify(readOnly));
    } catch {
      // ignore en cas de quota privé / navigateur
    }
  }, [readOnly]);

  const location = useLocation();
  const onTablePage = location.pathname === "/table";

  return (
    <AuthProvider>
      {/* BrowserRouter est déjà dans main.tsx */}
      <NavBar />

      {/* Toolbar visible uniquement sur /table */}
      {onTablePage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 16px",
            borderBottom: "1px solid rgba(0,0,0,.06)",
            background: "#fff",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={readOnly}
              onChange={(e) => setReadOnly(e.target.checked)}
            />
            Mode réunion (lecture seule)
          </label>
          {readOnly && (
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              Les champs sont masqués, aucune édition possible.
            </span>
          )}
        </div>
      )}

      <main className="container">
        <Routes>
          {/* Entrée publique */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          {/* Espace protégé */}
          <Route element={<RequireAuth />}>
            {/* On passe la prop readOnly au tableau */}
            <Route path="/table" element={<PlannerTable readOnly={readOnly} />} />
            <Route path="/agile" element={<PlannerAgile />} />
            <Route path="/week" element={<PlannerWeek />} />
          </Route>

          {/* Fallback -> login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}
