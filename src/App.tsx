// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import PlannerTable from "./pages/PlannerTable";
import PlannerAgile from "./pages/PlannerAgile";
import PlannerWeek from "./pages/PlannerWeek";
import Login from "./pages/Login";

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
            <Route path="/table" element={<PlannerTable />} />
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
