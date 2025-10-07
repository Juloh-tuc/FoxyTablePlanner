// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import PlannerTable from "./pages/PlannerTable";
import PlannerAgile from "./pages/PlannerAgile";
import PlannerMonth from "./pages/PlannerMonth";
import Login from "./pages/Login";
// ex. src/main.tsx ou App.tsx
import "./styles/responsive-overrides.css";


import { AuthProvider } from "./contexts/AuthContext";
import RequireAuth from "./components/RequireAuth";

export default function App() {
  return (
    <AuthProvider>
      {/* BrowserRouter est déjà dans main.tsx */}
      <NavBar />

      <main className="container">
        <Routes>
          {/* Entrée publique */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          {/* Espace protégé */}
          <Route element={<RequireAuth />}>
            {/* Plus de prop readOnly ici : PlannerTable gère son propre “Mode réunion” visuel */}
            <Route path="/table" element={<PlannerTable />} />
            <Route path="/agile" element={<PlannerAgile />} />
            <Route path="/month" element={<PlannerMonth />} />
          </Route>

          {/* Fallback -> login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}
