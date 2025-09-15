import { Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import PlannerTable from "./pages/PlannerTable";
import PlannerAgile from "./pages/PlannerAgile";
import PlannerWeek from "./pages/PlannerWeek"; // mets un composant stub si pas prêt

export default function App() {
  return (
    <>
      <NavBar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/table" replace />} />
          <Route path="/table" element={<PlannerTable />} />
          <Route path="/agile" element={<PlannerAgile />} />
          <Route path="/semaine" element={<PlannerWeek />} />
          <Route path="*" element={<div style={{padding:24}}>Not found</div>} />
        </Routes>
      </main>
    </>
  );
}
