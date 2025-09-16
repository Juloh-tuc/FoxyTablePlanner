import { useMemo, useState } from "react";
import { seed } from "../data";
import type { Statut, Task } from "../types";
import "../styles/planner-common.css";
import "../styles/planner-table.css";

/* ---------------- Constants ---------------- */
const STATUTS: Statut[] = ["Terminé", "En cours", "En attente", "Bloqué", "Pas commencé"];
const PRIOS = ["Faible", "Moyen", "Élevé"] as const;

/** Tag catalogue (reprend les classes déjà présentes dans ton CSS .tag--*) */
const TAGS = [
  { key: "Site Web",        cls: "tag--web" },
  { key: "Front BO",        cls: "tag--front-bo" },
  { key: "Back FO",         cls: "tag--back-fo" },
  { key: "Front FO",        cls: "tag--front-fo" },
  { key: "Back BO",         cls: "tag--back-bo" },
  { key: "API",             cls: "tag--api" },
  { key: "Design",          cls: "tag--design" },
  { key: "Mobile",          cls: "tag--mobile" },
  { key: "Autre",           cls: "tag--autre" },
] as const;

const uniqueAdmins = (tasks: Task[]) =>
  Array.from(new Set(tasks.map(t => t.admin).filter(Boolean))) as string[];

const uid = () => Math.random().toString(36).slice(2, 9);
const short = (iso?: string) => (iso ? iso.slice(5) : "—");

const statusKey = (s: string) =>
  s === "Terminé" ? "done" :
  s === "En cours" ? "progress" :
  s === "En attente" ? "wait" :
  s === "Bloqué" ? "blocked" : "info";

/* -------- Component -------- */
export default function PlannerTable() {
  const [rows, setRows] = useState<Task[]>(() => JSON.parse(JSON.stringify(seed)));
  const [openTagRow, setOpenTagRow] = useState<string | null>(null);

  const admins = useMemo(() => uniqueAdmins(rows), [rows]);

  const patch = (id: string, partial: Partial<Task>) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...partial } : r)));

  const toggleTag = (rowId: string, label: string) => {
    setRows(prev =>
      prev.map(r => {
        if (r.id !== rowId) return r;
        // Supporte soit r.labels soit r.etiquettes selon ton type actuel (fallback)
        const current = (r as any).labels ?? (r as any).etiquettes ?? [];
        const has = current.includes(label);
        const next = has ? current.filter((l: string) => l !== label) : [...current, label];
        // Écrit dans les deux propriétés pour rester compatible si nécessaire
        return { ...r, labels: next as any, etiquettes: next as any } as Task;
      })
    );
  };

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
        // compatibilité : initialise les deux champs si ton type a l’un ou l’autre
        labels: [] as any,
        etiquettes: [] as any,
      } as unknown as Task,
    ]);

  const removeRow = (id: string) =>
    setRows(prev => prev.filter(r => r.id !== id));

  return (
    <section>
      <h1 className="visually-hidden">Planner Tableau</h1>

      <div className="table-wrap card">
        <table className="table">
          <thead>
            <tr>
              <th>Tâches</th>       {/* 1 */}
              <th>Début</th>        {/* 2 */}
              <th>Admin</th>        {/* 3 */}
              <th>Statut</th>       {/* 4 */}
              <th>Priorité</th>     {/* 5 */}
              <th>Labels</th>       {/* 6  <<< REVENUE */}
              <th>Budget</th>       {/* 7 */}
              <th>Avancement</th>   {/* 8 */}
              <th>Échéance</th>     {/* 9 */}
              <th>Bloqué par</th>   {/* 10 */}
              <th>Remarques</th>    {/* 11 */}
              <th>Actions</th>      {/* 12  <<< pour matcher ton CSS */}
            </tr>
          </thead>

          <tbody>
            {rows.map(t => {
              // lecture robuste des tags (labels/etiquettes)
              const tags: string[] = (t as any).labels ?? (t as any).etiquettes ?? [];
              return (
                <tr key={t.id}>
                  {/* 1 — Tâches */}
                  <td data-label="Tâches">
                    <input
                      className="cell-input"
                      value={t.titre}
                      onChange={e => patch(t.id, { titre: e.target.value })}
                    />
                  </td>

                  {/* 2 — Début */}
                  <td data-label="Début">
                    <input
                      className="cell-input"
                      type="date"
                      value={t.debut ?? ""}
                      onChange={e => patch(t.id, { debut: e.target.value })}
                    />
                    <span className="cell-readonly">{short(t.debut)}</span>
                  </td>

                  {/* 3 — Admin */}
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

                  {/* 4 — Statut */}
                  <td data-label="Statut">
                    <select
                      className={`select-chip is-${statusKey(t.statut)}`}
                      value={t.statut}
                      onChange={e => patch(t.id, { statut: e.target.value as Statut })}
                    >
                      {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>

                  {/* 5 — Priorité */}
                  <td data-label="Priorité">
                    <select
                      className="select-prio"
                      value={(t.priorite as any) ?? "Moyen"}
                      onChange={e => patch(t.id, { priorite: e.target.value as Task["priorite"] })}
                    >
                      {PRIOS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>

                  {/* 6 — Labels (réintégré) */}
                  <td data-label="Labels" className="cell-tags">
                    <div className="tags-cell">
                      {tags.length === 0 && <span className="tag">—</span>}
                      {tags.map(lbl => {
                        const cls = TAGS.find(tg => tg.key === lbl)?.cls ?? "";
                        return (
                          <span key={lbl} className={`tag ${cls}`}>{lbl}</span>
                        );
                      })}
                      <button
                        type="button"
                        className="chip-edit"
                        onClick={() => setOpenTagRow(r => (r === t.id ? null : t.id))}
                        aria-expanded={openTagRow === t.id}
                        aria-controls={`picker-${t.id}`}
                        title="Modifier les labels"
                      >
                        + Label
                      </button>
                    </div>

                    {openTagRow === t.id && (
                      <div id={`picker-${t.id}`} className="tag-picker">
                        <div className="tag-picker__head">
                          <strong>Étiquettes</strong>
                          <button className="btn small" onClick={() => setOpenTagRow(null)}>Fermer</button>
                        </div>
                        <div className="tag-picker__list">
                          {TAGS.map(opt => (
                            <label key={opt.key} className="tag-option">
                              <input
                                type="checkbox"
                                checked={tags.includes(opt.key)}
                                onChange={() => toggleTag(t.id, opt.key)}
                              />
                              <span className={`tag ${opt.cls}`}>{opt.key}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </td>

                  {/* 7 — Budget */}
                  <td data-label="Budget" className="money">
                    <input
                      className="cell-input right"
                      type="number"
                      min={0}
                      value={t.budget ?? 0}
                      onChange={e => patch(t.id, { budget: Number(e.target.value) })}
                    />
                  </td>

                  {/* 8 — Avancement */}
                  <td data-label="Avancement" className="cell-progress">
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

                  {/* 9 — Échéance */}
                  <td data-label="Échéance">
                    <input
                      className="cell-input"
                      type="date"
                      value={t.echeance ?? ""}
                      onChange={e => patch(t.id, { echeance: e.target.value })}
                    />
                    <span className="cell-readonly">{short(t.echeance)}</span>
                  </td>

                  {/* 10 — Bloqué par */}
                  <td data-label="Bloqué par">
                    <input
                      className="cell-input"
                      value={t.bloquePar ?? ""}
                      onChange={e => patch(t.id, { bloquePar: e.target.value })}
                    />
                  </td>

                  {/* 11 — Remarques */}
                  <td data-label="Remarques">
                    <input
                      className="cell-input"
                      value={t.remarques ?? ""}
                      onChange={e => patch(t.id, { remarques: e.target.value })}
                    />
                  </td>

                  {/* 12 — Actions */}
                  <td data-label="Actions">
                    <div className="actions">
                      <button className="btn danger small" onClick={() => removeRow(t.id)}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Ligne d'ajout */}
            <tr>
              <td colSpan={12} className="row-add">
                <button type="button" className="btn primary" onClick={addRow}>
                  + Ajouter une tâche
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
