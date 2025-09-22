// src/pages/PlannerTable.tsx
import React, { useState } from "react";
import { seed } from "../data";
import type { Statut, Task, Etiquette } from "../types";
import "../styles/planner-common.css";
import "../styles/planner-table.css";

import ConfirmDialog from "../components/ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";

import PeoplePicker from "../components/PeoplePicker";
import type { Person } from "../components/PeoplePicker";

/* ---------------- Constantes ---------------- */
const STATUTS: Statut[] = [
  "Pas commencé",
  "En attente",
  "En cours",
  "Bloqué",
  "Terminé",
];

const PRIOS = ["Faible", "Moyen", "Élevé"] as const;

// ⚠️ Clés parfaitement alignées avec types.ts (type Etiquette)
const TAGS: ReadonlyArray<{ key: Etiquette; cls: string }> = [
  { key: "Site Web",   cls: "tag--web" },
  { key: "Front - BO", cls: "tag--front-bo" },
  { key: "Back - FO",  cls: "tag--back-fo" },
  { key: "Front - FO", cls: "tag--front-fo" },
  { key: "Back - BO",  cls: "tag--back-bo" },
  { key: "API",        cls: "tag--api" },
  { key: "Design",     cls: "tag--design" },
  { key: "Mobile",     cls: "tag--mobile" },
  { key: "Autre",      cls: "tag--autre" },
];

const uniqueAdmins = (tasks: Task[]) =>
  Array.from(new Set(tasks.map((t) => t.admin).filter(Boolean))) as string[];

const uid = () => Math.random().toString(36).slice(2, 9);
const short = (iso?: string) => (iso ? iso.slice(5) : "—");

const statusKey = (s: Statut | string) =>
  s === "Terminé" ? "done" :
  s === "En cours" ? "progress" :
  s === "En attente" ? "wait" :
  s === "Bloqué" ? "blocked" : "info";

/* ---------------- Composant ---------------- */
export default function PlannerTable(
  { readOnly = false }: { readOnly?: boolean } = {}
) {
  const [rows, setRows] = useState<Task[]>(
    () => JSON.parse(JSON.stringify(seed)) as Task[]
  );
  const [openTagRow, setOpenTagRow] = useState<string | null>(null);

  // Annuaire global (éditable via PeoplePicker)
  const initialPeople: Person[] = React.useMemo(() => {
    const fromSeed = uniqueAdmins(rows).map((n, i) => ({ id: `seed-${i}`, name: n }));
    const base = ["Anna", "Simon", "Titouan", "Myriam", "Julie"].map((n, i) => ({ id: `p-${i}`, name: n }));
    const dedup = new Map<string, Person>();
    [...base, ...fromSeed].forEach((p) => dedup.set(p.name, p));
    return Array.from(dedup.values());
  }, [rows]);

  const [people, setPeople] = useState<Person[]>(initialPeople);
  const confirm = useConfirm();

  const patch = (id: string, partial: Partial<Task>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...partial } : r)));

  // ✅ toggleTag strictement typé avec Etiquette
  const toggleTag = (rowId: string, label: Etiquette) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const current = r.etiquettes ?? [];
        const has = current.includes(label);
        const next: Etiquette[] = has
          ? current.filter((l) => l !== label)
          : [...current, label];
        return { ...r, etiquettes: next };
      })
    );
  };

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      {
        id: uid(),
        titre: "Nouvelle tâche",
        debut: new Date().toISOString().slice(0, 10),
        statut: "Pas commencé",
        priorite: "Moyen",
        admin: people[0]?.name || "👤",
        assignees: people[0]?.name ? [people[0].name] : [],
        budget: 0,
        avancement: 0,
        etiquettes: [], // ✅ bon type
      },
    ]);

  const askRemove = async (row: Task) => {
    const ok = await confirm.ask(
      `Êtes-vous sûr de vouloir supprimer “${row.titre}” ? Cette action est définitive.`
    );
    if (ok) setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  // quand on change la sélection des assignés → admin = premier
  const setAssignees = (rowId: string, list: string[]) => {
    patch(rowId, {
      ...(list.length ? { admin: list[0] } : { admin: "" }),
      assignees: list,
    });
  };

  return (
    <section>
      <h1 className="visually-hidden">Planner Tableau</h1>

      <div className={`table-wrap card ${readOnly ? "is-readonly" : ""}`}>
        <table className="table">
          <thead>
            <tr>
              <th>Tâches</th>
              <th>Début</th>
              <th>Admin</th>
              <th>Statut</th>
              <th>Priorité</th>
              <th>Labels</th>
              <th>Budget</th>
              <th>Avancement</th>
              <th>Échéance</th>
              <th>Bloqué par</th>
              <th>Remarques</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((t) => {
              const tags: Etiquette[] = t.etiquettes ?? [];
              const assignees: string[] = t.assignees ?? (t.admin ? [t.admin] : []);
              return (
                <tr key={t.id}>
                  {/* 1 — Titre */}
                  <td>
                    <input
                      className="cell-input"
                      value={t.titre}
                      onChange={(e) => patch(t.id, { titre: e.target.value })}
                    />
                    <span className="cell-readonly">{t.titre}</span>
                  </td>

                  {/* 2 — Début (icône calendrier custom dans l’input) */}
                  <td>
                    <div className="date-field">
                      <input
                        className="cell-input calendarless"
                        type="date"
                        value={t.debut ?? ""}
                        onChange={(e) => patch(t.id, { debut: e.target.value })}
                      />
                      <button type="button" className="date-icon" title="Choisir la date">📅</button>
                    </div>
                    <span className="cell-readonly">{short(t.debut)}</span>
                  </td>

                  {/* 3 — Admin / multi-assignation */}
                  <td>
                    {!readOnly ? (
                      <PeoplePicker
                        allPeople={people}
                        value={assignees}
                        onChange={(next) => setAssignees(t.id, next)}
                        onDirectoryChange={(nextDir) => setPeople(nextDir)}
                        anchorClassName="pp-in-cell"
                      />
                    ) : (
                      <span className="cell-readonly">
                        {assignees.length ? assignees.join(", ") : "—"}
                      </span>
                    )}
                  </td>

                  {/* 4 — Statut */}
                  <td>
                    <select
                      className={`select-chip is-${statusKey(t.statut)}`}
                      value={t.statut}
                      onChange={(e) => patch(t.id, { statut: e.target.value as Statut })}
                    >
                      {STATUTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <span className={`cell-readonly select-chip is-${statusKey(t.statut)}`}>
                      {t.statut}
                    </span>
                  </td>

                  {/* 5 — Priorité */}
                  <td>
                    <select
                      className="select-prio"
                      value={t.priorite ?? "Moyen"}
                      onChange={(e) => patch(t.id, { priorite: e.target.value as Task["priorite"] })}
                    >
                      {PRIOS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <span className="cell-readonly">{t.priorite ?? "Moyen"}</span>
                  </td>

                  {/* 6 — Labels (avec le fameux checkbox ici 👇) */}
                  <td className="cell-tags">
                    <div className="tags-cell">
                      {tags.length === 0 && <span className="tag">—</span>}
                      {tags.map((lbl) => {
                        const cls = TAGS.find((tg) => tg.key === lbl)?.cls ?? "";
                        return (
                          <span key={lbl} className={`tag ${cls}`}>
                            {lbl}
                          </span>
                        );
                      })}
                      {!readOnly && (
                        <button
                          type="button"
                          className="chip-edit"
                          onClick={() => setOpenTagRow((r) => (r === t.id ? null : t.id))}
                          aria-expanded={openTagRow === t.id}
                          aria-controls={`picker-${t.id}`}
                          title="Modifier les labels"
                        >
                          + Label
                        </button>
                      )}
                    </div>

                    {!readOnly && openTagRow === t.id && (
                      <div id={`picker-${t.id}`} className="tag-picker">
                        <div className="tag-picker__head">
                          <strong>Étiquettes</strong>
                          <button className="btn small" onClick={() => setOpenTagRow(null)}>
                            Fermer
                          </button>
                        </div>
                        <div className="tag-picker__list">
                          {TAGS.map((opt) => (
                            <label key={opt.key} className="tag-option">
                              {/* ←←← C’est ICI la checkbox que tu mentionnais */}
                              <input
                                type="checkbox"
                                checked={(t.etiquettes ?? []).includes(opt.key)}
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
                  <td className="money">
                    <input
                      className="cell-input right"
                      type="number"
                      min={0}
                      value={t.budget ?? 0}
                      onChange={(e) => patch(t.id, { budget: Number(e.target.value) })}
                    />
                    <span className="cell-readonly right">{t.budget ?? 0}</span>
                  </td>

                  {/* 8 — Avancement (fix visuel) */}
                  <td className="cell-progress">
                    <div className="progress-wrap">
                      <input
                        className="range"
                        type="range"
                        min={0}
                        max={100}
                        value={t.avancement ?? 0}
                        onChange={(e) => patch(t.id, { avancement: Number(e.target.value) })}
                        style={{ ["--p" as any]: `${t.avancement ?? 0}%` }}
                      />
                      <span className="percent">{t.avancement ?? 0}%</span>
                    </div>
                    <span className="cell-readonly">{t.avancement ?? 0}%</span>
                  </td>

                  {/* 9 — Échéance */}
                  <td>
                    <div className="date-field">
                      <input
                        className="cell-input calendarless"
                        type="date"
                        value={t.echeance ?? ""}
                        onChange={(e) => patch(t.id, { echeance: e.target.value })}
                      />
                      <button type="button" className="date-icon" title="Choisir la date">📅</button>
                    </div>
                    <span className="cell-readonly">{short(t.echeance)}</span>
                  </td>

                  {/* 10 — Bloqué par */}
                  <td>
                    <input
                      className="cell-input"
                      value={t.bloquePar ?? ""}
                      onChange={(e) => patch(t.id, { bloquePar: e.target.value })}
                    />
                    <span className="cell-readonly">{t.bloquePar ?? "—"}</span>
                  </td>

                  {/* 11 — Remarques */}
                  <td>
                    <input
                      className="cell-input emphasize"
                      value={t.remarques ?? ""}
                      onChange={(e) => patch(t.id, { remarques: e.target.value })}
                      placeholder="Ajouter une remarque…"
                    />
                    <span className="cell-readonly one-line-ellipsis">
                      {t.remarques || "—"}
                    </span>
                  </td>

                  {/* 12 — Actions */}
                  <td className="td-actions">
                    <div className="actions">
                      {!readOnly && (
                        <button className="btn danger small" onClick={() => askRemove(t)}>
                          Supprimer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {!readOnly && (
              <tr>
                <td colSpan={12} className="row-add">
                  <button type="button" className="btn primary" onClick={addRow}>
                    + Ajouter une tâche
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirm.open}
        message={confirm.message}
        onCancel={confirm.cancel}
        onConfirm={confirm.confirm}
      />
    </section>
  );
}
