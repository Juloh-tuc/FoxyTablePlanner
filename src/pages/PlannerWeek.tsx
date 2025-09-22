import { useMemo, useState } from "react";
import { seed } from "../data";
import type { Task, Statut } from "../types";
import "../styles/planner-week.css";
import "../components/edit-task-modal.css";

import TaskDetailModal from "../components/TaskDetailModal";
import EditTaskModal from "../components/EditTaskModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";

/* ------------------ Helpers ------------------ */
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth   = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

// Lundi = 0 … Dimanche = 6
const mondayIndex = (jsDay: number) => (jsDay + 6) % 7;

type DayCell = { date: string; inMonth: boolean; isToday: boolean };

const uid = () => Math.random().toString(36).slice(2, 9);

/* ------------------ Composant ------------------ */
export default function PlannerWeek() {
  const [rows, setRows] = useState<Task[]>(() => JSON.parse(JSON.stringify(seed)));
  const [cursor, setCursor] = useState<Date>(new Date());              // mois affiché
  const [openTask, setOpenTask] = useState<Task | null>(null);         // modal détail
  const [editTask, setEditTask] = useState<Task | null>(null);         // modal édition/création
  const confirm = useConfirm();

  // ---------- Meeting mode (lecture seule) ----------
  const [meeting, setMeeting] = useState<boolean>(() => {
    try { return localStorage.getItem("planner.meeting") === "1"; } catch { return false; }
  });
  const toggleMeeting = () => {
    setMeeting(v => {
      const next = !v;
      try { localStorage.setItem("planner.meeting", next ? "1" : "0"); } catch {}
      return next;
    });
  };

  // ---------- Grille du mois (5–6 semaines) ----------
  const days: DayCell[] = useMemo(() => {
    const s = startOfMonth(cursor);
    const e = endOfMonth(cursor);

    const sIdx = mondayIndex(s.getDay());           // combien remonter pour tomber sur un lundi
    const eIdx = mondayIndex(e.getDay());           // combien descendre pour terminer un dimanche

    const first = new Date(s); first.setDate(s.getDate() - sIdx);
    const last  = new Date(e); last.setDate(e.getDate() + (6 - eIdx));

    const out: DayCell[] = [];
    const cur = new Date(first);
    const todayStr = fmt(new Date());

    while (cur <= last) {
      const dstr = fmt(cur);
      out.push({
        date: dstr,
        inMonth: cur.getMonth() === cursor.getMonth(),
        isToday: dstr === todayStr,
      });
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [cursor]); // <— on ne renvoie QUE days => pas d'avertissement TS

  // ---------- Tâches par jour (inclut plages début → échéance) ----------
  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    const push = (day: string, t: Task) => {
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(t);
    };

    rows.forEach(t => {
      if (t.debut && t.echeance) {
        // range inclusive
        let cur = new Date(t.debut);
        const end = new Date(t.echeance);
        while (cur <= end) {
          push(fmt(cur), t);
          cur.setDate(cur.getDate() + 1);
        }
      } else if (t.debut) {
        push(t.debut, t);
      }
    });

    return map;
  }, [rows]);

  // ---------- Actions ----------
  const saveTask = (payload: Task) => {
    setRows(prev => {
      const exists = prev.some(r => r.id === payload.id);
      return exists ? prev.map(r => (r.id === payload.id ? payload : r)) : [...prev, payload];
    });
    setEditTask(null);
  };

  const askDelete = async (t: Task) => {
    const ok = await confirm.ask(`Êtes-vous sûr de vouloir supprimer “${t.titre}” ? Cette action est définitive.`);
    if (ok) setRows(prev => prev.filter(r => r.id !== t.id));
  };

  const quickNewForDay = (dayStr: string) => {
    const draft: Task = {
      id: uid(),
      titre: "Nouvelle tâche",
      statut: "Pas commencé" as Statut,
      priorite: "Moyen",
      debut: dayStr,
      echeance: dayStr,
      avancement: 0,
      budget: 0,
      remarques: "",
      etiquettes: [],
    };
    setEditTask(draft);
  };

  // ---------- Rendu ----------
  const monthLabel = cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <section className="month-wrap">
      <header className="month-head">
        <div className="left">
          <button className="btn" onClick={() => setCursor(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>◀</button>
          <h2 className="title">{monthLabel}</h2>
          <button className="btn" onClick={() => setCursor(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>▶</button>
          <button className="btn today" onClick={() => setCursor(new Date())}>Aujourd’hui</button>
        </div>

        <div className="right">
          <label className="meet-toggle">
            <input type="checkbox" checked={meeting} onChange={toggleMeeting} />
            Mode réunion (lecture seule)
          </label>
        </div>
      </header>

      {/* En-têtes des jours (Lun…Dim) */}
      <div className="month-grid month-grid--head">
        {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(d => (
          <div key={d} className="day-head">{d}</div>
        ))}
      </div>

      {/* Grille du mois — ICI on UTILISE days */}
      <div className="month-grid">
        {days.map(({ date, inMonth, isToday }) => {
          const dayTasks = tasksByDay.get(date) ?? [];
          const dayNum = Number(date.slice(8, 10));

          return (
            <div
              key={date}
              className={`day-cell${inMonth ? "" : " out"}${isToday ? " today" : ""}`}
              onDoubleClick={() => !meeting && quickNewForDay(date)}
            >
              <div className="day-num">{dayNum}</div>

              <div className="tasks">
                {dayTasks.map(t => (
                  <button
                    key={t.id}
                    className={`chip ${t.priorite === "Élevé" ? "chip-hi" : t.priorite === "Faible" ? "chip-lo" : "chip-md"}`}
                    title={t.titre}
                    onClick={(e) => { e.stopPropagation(); setOpenTask(t); }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (!meeting) setEditTask(t);
                    }}
                  >
                    {t.titre}
                    {!meeting && (
                      <span
                        className="chip-del"
                        title="Supprimer"
                        onClick={(e) => { e.stopPropagation(); askDelete(t); }}
                      >🗑️</span>
                    )}
                  </button>
                ))}
              </div>

              {!meeting && (
                <button
                  className="btn tiny add-btn"
                  onClick={(e) => { e.stopPropagation(); quickNewForDay(date); }}
                  title="Ajouter une tâche à ce jour"
                >
                  + Ajouter
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {openTask && (
        <TaskDetailModal
          task={openTask}
          onClose={() => setOpenTask(null)}
          readOnly={meeting}  // lecture seule si mode réunion
          onEdit={(task) => {
            if (!meeting) setEditTask(task);
          }}
          onDelete={(taskId) => {
            const task = rows.find((t) => t.id === taskId);
            if (task) askDelete(task);
          }}
        />
      )}

      {editTask && !meeting && (
        <EditTaskModal
          task={editTask}
          onCancel={() => setEditTask(null)}
          onSave={saveTask}
          onDelete={(taskId) => {
            const task = rows.find((t) => t.id === taskId);
            if (task) askDelete(task);
          }}
        />
      )}

      <ConfirmDialog
        open={confirm.open}
        message={confirm.message}
        onCancel={confirm.cancel}
        onConfirm={confirm.confirm}
      />
    </section>
  );
}
