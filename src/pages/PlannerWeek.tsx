import React, { useMemo, useState } from "react";
import { seed } from "../data";
import type { Task, Statut } from "../types";
import "../styles/planner-common.css";
import "../styles/planner-week.css";

/* ----------------------- helpers date ----------------------- */
const DAY = 24 * 60 * 60 * 1000;
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfMonday = (base = new Date()) => {
  const d = new Date(base); d.setHours(0,0,0,0);
  const js = d.getDay(); const diff = (js === 0 ? -6 : 1 - js); d.setDate(d.getDate() + diff);
  return d;
};
const diffDays = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / DAY);

/* -------------------- unions & helpers typés -------------------- */
const PRIOS = ["Faible", "Moyen", "Élevé"] as const;
type Prio = typeof PRIOS[number];

const STATUS = ["Pas commencé","En attente","En cours","Bloqué","Terminé"] as const;
type StatusL = typeof STATUS[number];

function nextIn<T extends readonly string[]>(arr: T, cur: T[number]): T[number] {
  const i = Math.max(0, arr.indexOf(cur));
  return arr[(i + 1) % arr.length] as T[number];
}

const asPrio = (p: Task["priorite"] | undefined): Prio =>
  (PRIOS as readonly string[]).includes((p ?? "") as string) ? (p as Prio) : "Moyen";

const asStatus = (s: Statut | undefined): StatusL =>
  (STATUS as readonly string[]).includes((s ?? "") as string) ? (s as StatusL) : "Pas commencé";

/* ---------------------- visu / style keys ---------------------- */
const sKey = (s: Statut) =>
  s === "Terminé" ? "done" :
  s === "En cours" ? "progress" :
  s === "Bloqué" ? "blocked" :
  s === "En attente" ? "wait" : "info";

const DOW = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

/* --------------------------- types UI --------------------------- */
type Draft = {
  id?: string;
  titre: string;
  admin: string;
  priorite: Prio;
  statut: StatusL;
  debut: string;     // ISO YYYY-MM-DD
  echeance: string;  // ISO YYYY-MM-DD
};

/* *********************** composant page ************************ */
export default function PlannerWeek() {
  const [rows, setRows] = useState<Task[]>(() => JSON.parse(JSON.stringify(seed)));
  const [anchor, setAnchor] = useState<Date>(() => startOfMonday());

  const weekStart = anchor;
  const weekEnd   = addDays(weekStart, 6);

  const days = useMemo(() => Array.from({length:7},(_,i)=>addDays(weekStart,i)), [weekStart]);

  const admins = useMemo(
    () => Array.from(new Set(rows.map(r => r.admin).filter(Boolean))) as string[],
    [rows]
  );

  const uid = () => Math.random().toString(36).slice(2,9);

  /* ------------------- modal nouvel/éditer task ------------------- */
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const openNew = (dayIdx: number) => {
    const d = toISO(addDays(weekStart, dayIdx));
    setDraft({
      titre: "Nouvelle tâche",
      admin: admins[0] ?? "👤",
      priorite: "Moyen",
      statut: "Pas commencé",
      debut: d,
      echeance: d,
    });
    setOpen(true);
  };

  const openEdit = (t: Task) => {
    setDraft({
      id: t.id,
      titre: t.titre,
      admin: t.admin ?? "",
      priorite: asPrio(t.priorite),
      statut: asStatus(t.statut),
      debut: t.debut ?? toISO(new Date()),
      echeance: t.echeance ?? (t.debut ?? toISO(new Date())),
    });
    setOpen(true);
  };

  const saveDraft = () => {
    if (!draft) return;
    const payload: Task = {
      id: draft.id ?? uid(),
      titre: draft.titre,
      admin: draft.admin,
      priorite: draft.priorite,
      statut: draft.statut as Statut,
      debut: draft.debut,
      echeance: draft.echeance,
      budget: 0,
      avancement: 0,
      remarques: "",
    };
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === payload.id);
      if (idx === -1) return [...prev, payload];
      const copy = prev.slice(); copy[idx] = payload; return copy;
    });
    setOpen(false); setDraft(null);
  };

  const deleteDraft = () => {
    if (draft?.id) setRows(prev => prev.filter(t => t.id !== draft.id));
    setOpen(false); setDraft(null);
  };

  /* -------------- layout : barres + empilement rows -------------- */
  type Bar = { task: Task; startIdx: number; endIdx: number; row: number };

  const bars: Bar[] = useMemo(() => {
    const visibles = rows.filter(t => {
      const d0 = t.debut ? new Date(t.debut) : null;
      const d1 = t.echeance ? new Date(t.echeance) : d0;
      if (!d0 || !d1) return false;
      return d0 <= weekEnd && d1 >= weekStart;
    });

    const base = visibles.map(t => {
      const d0 = t.debut ? new Date(t.debut) : weekStart;
      const d1 = t.echeance ? new Date(t.echeance) : d0;
      const s = Math.max(0, Math.min(6, diffDays(d0 < weekStart ? weekStart : d0, weekStart)));
      const e = Math.max(0, Math.min(6, diffDays(d1 > weekEnd ? weekEnd : d1, weekStart)));
      return { task: t, startIdx: s, endIdx: e };
    }).sort((a,b) => a.startIdx - b.startIdx || (b.endIdx - b.startIdx) - (a.endIdx - a.startIdx));

    const rowEnds: number[] = [];
    const out: Bar[] = [];
    base.forEach(b => {
      let r = 0;
      while (rowEnds[r] !== undefined && rowEnds[r] >= b.startIdx) r++;
      rowEnds[r] = b.endIdx;
      out.push({ ...b, row: r });
    });
    return out;
  }, [rows, weekStart, weekEnd]);

  const maxRows = bars.reduce((m,b) => Math.max(m, b.row), 0) + 1;

  /* -------------------------- today marker -------------------------- */
  const today = new Date();
  const isInWeek = today >= weekStart && today <= addDays(weekStart, 6);
  const todayIdx = isInWeek ? diffDays(today, weekStart) : -1;

  /* ------------------------------- UI ------------------------------- */
  return (
    <section className="week-cells">
      <h1 className="visually-hidden">Planner — Semaine (cellules)</h1>

      <div className="week-controls">
        <button className="btn" onClick={() => setAnchor(addDays(anchor, -7))}>←</button>
        <div className="week-title">
          Week {toISO(weekStart)} → {toISO(weekEnd)}
        </div>
        <button className="btn" onClick={() => setAnchor(addDays(anchor, +7))}>→</button>
      </div>

      <div className="bleed-xl">
        <div className="board card">
          {/* en-tête jours */}
          <div className="head grid7">
            <div className="day-head spacer">Project</div>
            {days.map((d,i)=>(
              <div key={i} className={`day-head ${i===todayIdx ? "is-today":""}`}>
                <div className="dow">{DOW[i]}</div>
                <div className="dom">{String(d.getDate()).padStart(2,"0")}</div>
              </div>
            ))}
          </div>

          {/* corps */}
          <div className="body grid7" style={{ gridTemplateRows: `repeat(${Math.max(2, maxRows)}, var(--row-h))` }}>
            {/* colonne gauche vide (aligne la grille) */}
            <div className="col-left"></div>

            {/* ligne d'action : Add task pour chaque jour */}
            {days.map((_,i)=>(
              <div key={i} className="cell" onClick={() => openNew(i)}>
                <button type="button" className="add-btn">+ Add task</button>
              </div>
            ))}

            {/* pads pour les lignes suivantes */}
            {Array.from({length: Math.max(1, maxRows-1)}).map((_,r)=>(
              <React.Fragment key={`rowpad-${r}`}>
                <div className="col-left"></div>
                {Array.from({length:7}).map((__,i)=><div key={`pad-${r}-${i}`} className="cell pad"></div>)}
              </React.Fragment>
            ))}

            {/* barres de tâches */}
            {bars.map(b => (
              <div
                key={b.task.id}
                className={`task-bar is-${sKey(b.task.statut)}`}
                style={{
                  gridColumn: `${b.startIdx + 2} / ${b.endIdx + 3}`,
                  gridRow: b.row + 1,
                }}
                title={`${b.task.titre} — ${b.task.debut}${b.task.echeance ? " → " + b.task.echeance : ""}`}
                onClick={(e)=>{ e.stopPropagation(); openEdit(b.task); }}
              >
                <div className="bar-title">{b.task.titre}</div>
                <div className="bar-meta">
                  <span className="badge-prio" data-level={asPrio(b.task.priorite)}><span className="dot"></span>{asPrio(b.task.priorite)}</span>
                  <span className={`status-chip is-${sKey(b.task.statut)}`}><span className={`dot ${sKey(b.task.statut)}`}></span>{b.task.statut}</span>
                  <span className="tag">{b.task.admin ?? "👤"}</span>
                </div>
              </div>
            ))}

            {/* today line */}
            {isInWeek && (
              <div
                className="today-line"
                style={{ gridColumn: `${todayIdx + 2} / span 1`, gridRow: `1 / ${Math.max(2, maxRows)+1}` }}
              />
            )}
          </div>
        </div>
      </div>

      {/* -------------------- MODAL CRÉATION / ÉDITION -------------------- */}
      {open && draft && (
        <div className="modal-backdrop" onClick={()=>{ setOpen(false); setDraft(null); }}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h2>{draft.id ? "Edit task" : "New task"}</h2>

            <div className="form">
              <label>
                <span>Title</span>
                <input value={draft.titre} onChange={e=>setDraft({...draft, titre: e.target.value})} />
              </label>

              <label>
                <span>Admin</span>
                <input list="admins-list" value={draft.admin} onChange={e=>setDraft({...draft, admin: e.target.value})} />
                <datalist id="admins-list">{admins.map(a=><option key={a} value={a} />)}</datalist>
              </label>

              <label>
                <span>Status</span>
                <select value={draft.statut} onChange={e=>setDraft({...draft, statut: e.target.value as StatusL})}>
                  {STATUS.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              <label>
                <span>Priority</span>
                <select value={draft.priorite} onChange={e=>setDraft({...draft, priorite: e.target.value as Prio})}>
                  {PRIOS.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </label>

              <label>
                <span>Start</span>
                <input type="date" value={draft.debut} onChange={e=>setDraft({...draft, debut: e.target.value})} />
              </label>

              <label>
                <span>End</span>
                <input type="date" value={draft.echeance} onChange={e=>setDraft({...draft, echeance: e.target.value})} />
              </label>
            </div>

            <div className="modal-actions">
              {draft.id && <button className="btn danger" onClick={deleteDraft}>Delete</button>}
              <span style={{flex:1}} />
              <button className="btn" onClick={()=>{ setOpen(false); setDraft(null); }}>Cancel</button>
              <button className="btn primary" onClick={saveDraft}>Save</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
