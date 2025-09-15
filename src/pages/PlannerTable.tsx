import { useMemo, useState } from "react";
import { seed } from "../data";
import type { Task, Statut, Etiquette, Priorite } from "../types";
import "../styles/planner-common.css";
import "../styles/planner-table.css";

/* ----------------------- constantes & helpers ----------------------- */

const STATUS: Statut[] = ["Terminé", "En cours", "En attente", "Bloqué", "Pas commencé"];
const PRIOS: Priorite[] = ["Faible", "Moyen", "Élevé"];

/** Étiquettes proposées (mêmes valeurs que dans types.ts) */
const TAGS: Etiquette[] = [
  "Site Web",
  "Front - BO",
  "Back - FO",
  "Front - FO",
  "Back - BO",
  "API",
  "Design",
  "Mobile",
  "Autre",
];

const statusKey = (s: Statut) =>
  s === "Terminé" ? "done" :
  s === "En cours" ? "progress" :
  s === "En attente" ? "wait" :
  s === "Bloqué" ? "blocked" : "info";

/** map libellé → classe pour la couleur de chip */
const tagClass = (t: string) => {
  switch (t) {
    case "Site Web":  return "tag--web";
    case "Front - BO": return "tag--front-bo";
    case "Back - FO":  return "tag--back-fo";
    case "Front - FO": return "tag--front-fo";
    case "Back - BO":  return "tag--back-bo";
    case "API":        return "tag--api";
    case "Design":     return "tag--design";
    case "Mobile":     return "tag--mobile";
    default:           return "tag--autre";
  }
};

const uid = () => Math.random().toString(36).slice(2, 9);
const short = (iso?: string) => (iso ? iso.slice(5) : "—");

const uniqueAdmins = (tasks: Task[]) =>
  Array.from(new Set(tasks.map(t => t.admin).filter(Boolean))) as string[];

/* ========================== composant page ========================== */

export default function PlannerTable() {
  const [rows, setRows] = useState<Task[]>(() => JSON.parse(JSON.stringify(seed)));
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);

  const admins = useMemo(() => uniqueAdmins(rows), [rows]);

  const patch = (id: string, partial: Partial<Task>) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...partial } : r)));

  const addRow = () =>
    setRows(prev => [
      ...prev,
      {
        id: uid(),
        titre: "Nouvelle tâche",
        debut: new Date().toISOString().slice(0, 10),
        statut: "Pas commencé",
        priorite: "Moyen",
        admin: admins[0] || "👤",
        budget: 0,
        avancement: 0,
        etiquettes: ["Autre"],
      },
    ]);

  const removeRow = (id: string) =>
    setRows(prev => prev.filter(r => r.id !== id));

  return (
    <section>
      <h1 className="visually-hidden">Planner — Tableau</h1>

      <div className="table-wrap card">
        <table className="table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Start</th>
              <th>Admin</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Labels</th>{/* ← NOUVEAU */}
              <th>Budget</th>
              <th>Progress</th>
              <th>Due</th>
              <th>Blocked by</th>
              <th>Remarks</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map(t => (
              <tr key={t.id}>
                {/* Project (titre) */}
                <td data-label="Project">
                  <input
                    className="cell-input"
                    value={t.titre}
                    onChange={e => patch(t.id, { titre: e.target.value })}
                  />
                </td>

                {/* Start (date) */}
                <td data-label="Start">
                  <input
                    className="cell-input"
                    type="date"
                    value={t.debut ?? ""}
                    onChange={e => patch(t.id, { debut: e.target.value })}
                  />
                  <span className="cell-readonly">{short(t.debut)}</span>
                </td>

                {/* Admin */}
                <td data-label="Admin">
                  <input
                    className="cell-input"
                    list={`admins-${t.id}`}
                    value={t.admin ?? ""}
                    onChange={e => patch(t.id, { admin: e.target.value })}
                  />
                  <datalist id={`admins-${t.id}`}>
                    {admins.map(a => <option key={a} value={a} />)}
                  </datalist>
                </td>

                {/* Status */}
                <td data-label="Status">
                  <select
                    className={`select-chip is-${statusKey(t.statut)}`}
                    value={t.statut}
                    onChange={e => patch(t.id, { statut: e.target.value as Statut })}
                  >
                    {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>

                {/* Priority */}
                <td data-label="Priority">
                  <select
                    className="select-prio"
                    value={t.priorite ?? "Moyen"}
                    onChange={e => patch(t.id, { priorite: e.target.value as Priorite })}
                  >
                    {PRIOS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </td>

                {/* Labels (Étiquettes) */}
                <td data-label="Labels" className="cell-tags">
                  <div className="tags-cell">
                    {(t.etiquettes ?? []).map(lbl => (
                      <span key={lbl} className={`tag ${tagClass(lbl)}`}>{lbl}</span>
                    ))}
                    <button
                      type="button"
                      className="chip-edit"
                      aria-label="Éditer les étiquettes"
                      onClick={() => setOpenPickerId(id => id === t.id ? null : t.id)}
                    >
                      ✎
                    </button>
                  </div>

                  {openPickerId === t.id && (
                    <div className="tag-picker card">
                      <div className="tag-picker__head">
                        <strong>Étiquettes</strong>
                        <button
                          type="button"
                          className="btn small"
                          onClick={() => setOpenPickerId(null)}
                        >
                          Fermer
                        </button>
                      </div>
                      <div className="tag-picker__list">
                        {TAGS.map(opt => {
                          const checked = (t.etiquettes ?? []).includes(opt);
                          return (
                            <label key={opt} className="tag-option">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={e => {
                                  const cur = new Set(t.etiquettes ?? []);
                                  if (e.target.checked) cur.add(opt);
                                  else cur.delete(opt);
                                  patch(t.id, { etiquettes: Array.from(cur) as Etiquette[] });
                                }}
                              />
                              <span className={`tag ${tagClass(opt)}`}>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </td>

                {/* Budget */}
                <td data-label="Budget" className="money">
                  <input
                    className="cell-input right"
                    type="number"
                    min={0}
                    value={t.budget ?? 0}
                    onChange={e => patch(t.id, { budget: Number(e.target.value) })}
                  />
                </td>

                {/* Progress */}
                <td data-label="Progress" className="cell-progress">
                  <input
                    className="range"
                    type="range"
                    min={0}
                    max={100}
                    value={t.avancement ?? 0}
                    onChange={e => patch(t.id, { avancement: Number(e.target.value) })}
                  />
                  <span className="percent">{t.avancement ?? 0}%</span>
                </td>

                {/* Due */}
                <td data-label="Due">
                  <input
                    className="cell-input"
                    type="date"
                    value={t.echeance ?? ""}
                    onChange={e => patch(t.id, { echeance: e.target.value })}
                  />
                  <span className="cell-readonly">{short(t.echeance)}</span>
                </td>

                {/* Blocked by */}
                <td data-label="Blocked by">
                  <input
                    className="cell-input"
                    value={t.bloquePar ?? ""}
                    onChange={e => patch(t.id, { bloquePar: e.target.value })}
                  />
                </td>

                {/* Remarks */}
                <td data-label="Remarks">
                  <input
                    className="cell-input"
                    value={t.remarques ?? ""}
                    onChange={e => patch(t.id, { remarques: e.target.value })}
                  />
                </td>

                {/* Actions */}
                <td data-label="Actions" className="actions">
                  <button className="btn danger small" onClick={() => removeRow(t.id)}>Suppr.</button>
                </td>
              </tr>
            ))}

            {/* Ligne d'ajout */}
            <tr>
              <td colSpan={12} className="row-add">
                <button type="button" className="btn primary" onClick={addRow}>+ Ajouter une tâche</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
