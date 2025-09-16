// App.tsx (exemple)
import { Routes, Route, Navigate } from "react-router-dom";
import PlannerTable from "./pages/PlannerTable";
import PlannerAgile from "./pages/PlannerAgile";
import PlannerWeek from "./pages/PlannerWeek";
import NavBar from "./components/NavBar";

export default function App(){
  return (
    <>
      <NavBar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/table" replace />} />
          <Route path="/table" element={<PlannerTable />} />
          <Route path="/agile" element={<PlannerAgile />} />
          <Route path="/semaine" element={<PlannerWeek />} />
          {/* <Route path="/login" element={<Login />} /> */}
        </Routes>
      </main>
    </>
  );
}
