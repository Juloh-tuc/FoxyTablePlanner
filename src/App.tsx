import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import NavBar from "./components/NavBar";
import PlannerTable from "./pages/PlannerTable";
import PlannerAgile from "./pages/PlannerAgile";
import PlannerMonth from "./pages/PlannerMonth";
import Login from "./pages/Login";

// Styles globaux (si tu en as besoin)
import "./styles/responsive-overrides.css";

import { AuthProvider } from "./contexts/AuthContext";
import RequireAuth from "./components/RequireAuth";

export default function App() {
  const location = useLocation();
  // ➜ La page /month ne doit PAS être wrap dans .container (sinon largeur limitée)
  const isMonthPage = location.pathname.startsWith("/month");

  return (
    <AuthProvider>
      {/* BrowserRouter est déjà dans main.tsx */}
      <NavBar />

      {/* Container pour tout SAUF la page Mois */}
      <main className={isMonthPage ? undefined : "container"}>
        <Routes>
          {/* Entrée publique */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          {/* Espace protégé */}
          <Route element={<RequireAuth />}>
            <Route path="/table" element={<PlannerTable />} />
            <Route path="/agile" element={<PlannerAgile />} />
            {/* Page Mois en dehors du container */}
            <Route path="/month" element={<PlannerMonth />} />
          </Route>

          {/* Fallback -> login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}
