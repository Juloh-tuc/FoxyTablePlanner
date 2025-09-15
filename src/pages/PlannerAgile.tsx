import React, { useMemo, useRef, useState } from "react";
import { seed } from "../data";
import type { Task, Statut } from "../types";
import "../styles/planner-common.css";
import "../styles/planner-agile.css";

/** Colonnes affichées (conforme wireframe) */
type ColKey = "done" | "progress" | "blocked" | "todo";

/** Map statut → clé colonne (on regroupe "En attente" + "Pas commencé" dans TODO) */
const toKey = (s: Statut): ColKey =>
  s === "Terminé" ? "done" :
  s === "En cours" ? "progress" :
  s === "Bloqué" ? "blocked" : "todo";

/** Map clé colonne → statut */
const fromKey = (k: ColKey): Statut =>
  k === "done" ? "Terminé" :
  k === "progress" ? "En cours" :
  k === "blocked" ? "Bloqué" : "Pas commencé";

/** Définition des colonnes */
const COLUMNS: Array<{ key: ColKey; title: string; stat: Statut }> = [
  { key: "done",     title: "Fait",           stat: "Terminé" },
  { key: "progress", title: "En cours",       stat: "En cours" },
  { key: "blocked",  title: "Bloqué",         stat: "Bloqué" },
  { key: "todo",     title: "Pas commencé",   stat: "Pas commencé" },
];

const uid = () => Math.random().toString(36).slice(2, 9);
const uniqueAdmins = (rows: Task[]) =>
  Array.from(new Set(rows.map(r => r.admin).filter(Boolean))) as string[];

export default function PlannerAgile(){
  const [rows, setRows] = useState<Task[]>(() => JSON.parse(JSON.stringify(seed)));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Task> | null>(null);

  const admins = useMemo(() => uniqueAdmins(rows), [rows]);

  /** Groupement par colonne (toujours initialisé) */
  const grouped = useMemo(() => {
    const map = new Map<ColKey, Task[]>();
    COLUMNS.forEach(c => map.set(c.key, []));
    rows.forEach(t => map.get(toKey(t.statut))!.push(t));
    return map;
  }, [rows]);

  // ---------- Drag & Drop ----------
  const dragId = useRef<string | null>(null);

  const onDragStart = (id: string) => (e: React.DragEvent) => {
    dragId.current = id;
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDropTo = (dst: ColKey) => (e: React.DragEvent) => {
    e.preventDefault();
    const id = dragId.current || e.dataTransfer.getData("text/plain");
    if (!id) return;
    setRows(prev => prev.map(t => (t.id === id ? { ...t, statut: fromKey(dst) } : t)));
    dragId.current = null;
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // ---------- CRUD ----------
  const startEdit = (t: Task) => {
    setEditingId(t.id);
    setDraft({ ...t });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };
  const saveEdit = () => {
    if (!editingId || !draft) return;
    setRows(prev => prev.map(t => (t.id === editingId ? { ...t, ...draft } as Task : t)));
    setEditingId(null);
    setDraft(null);
  };
  const removeTask = (id: string) => {
    setRows(prev => prev.filter(t => t.id !== id));
    if (editingId === id) cancelEdit();
  };
  const addTask = () => {
    const t: Task = {
      id: uid(),
      titre: "Nouvelle tâche",
      statut: "Pas commencé",
      priorite: "Moyen",
      admin: "👤",
      debut: new Date().toISOString().slice(0, 10),
      avancement: 0,
      remarques: "",
    };
    setRows(prev => [...prev, t]);
    setEditingId(t.id);
    setDraft({ ...t });
  };

  // ---------- Rendu ----------
  return (
    <section className="agile">
      <h1 className="visually-hidden">Planner Agile</h1>

      {/* largeur confortable en desktop */}
      <div className="bleed-xl">
        <div className="kan-board">
          {COLUMNS.map(col => (
            <div
              key={col.key}
              className={`kan-col col-${col.key}`}
              onDragOver={onDragOver}
              onDrop={onDropTo(col.key)}
            >
              <div className={`kan-col__title is-${col.key}`}>
                <span>{col.title}</span>
                <span className="count">{grouped.get(col.key)!.length}</span>
              </div>

              <div className="kan-col__list">
                {/* bouton d’ajout en haut de "Pas commencé" */}
                {col.key === "todo" && (
                  <button className="kan-add" type="button" onClick={addTask}>
                    + Ajouter une tâche
                  </button>
                )}

                {grouped.get(col.key)!.map(t => {
                  const isEdit = editingId === t.id;
                  return (
                    <article
                      key={t.id}
                      className={`kan-card${isEdit ? " is-edit" : ""}`}
                      draggable={!isEdit}
                      onDragStart={!isEdit ? onDragStart(t.id) : undefined}
                    >
                      {!isEdit ? (
                        <>
                          <div className="kan-card__top">
                            <strong className="kan-card__title">{t.titre}</strong>
                            <div className="kan-card__actions">
                              <button className="btn icon" title="Edit" onClick={() => startEdit(t)}>✏️</button>
                              <button className="btn icon danger" title="Delete" onClick={() => removeTask(t.id)}>🗑️</button>
                            </div>
                          </div>

                          <div className="kan-card__meta">
                            <span className="badge-prio" data-level={t.priorite}>
                              <span className="dot"></span>{t.priorite ?? "—"}
                            </span>
                            <span className={`status-chip is-${toKey(t.statut)}`}>
                              <span className={`dot ${toKey(t.statut)}`}></span>
                              {t.statut}
                            </span>
                            <span className="tag">{t.admin ?? "👤"}</span>
                          </div>

                          {t.remarques && <p className="kan-card__notes">{t.remarques}</p>}
                        </>
                      ) : (
                        <>
                          <div className="kan-edit__grid">
                            <label className="field">
                              <span className="label">Titre</span>
                              <input
                                className="input"
                                value={draft?.titre ?? ""}
                                onChange={e => setDraft(d => ({ ...d!, titre: e.target.value }))}
                              />
                            </label>

                            <label className="field">
                              <span className="label">Assignee</span>
                              <input
                                className="input"
                                list={`admins-${t.id}`}
                                value={draft?.admin ?? ""}
                                onChange={e => setDraft(d => ({ ...d!, admin: e.target.value }))}
                              />
                              <datalist id={`admins-${t.id}`}>
                                {admins.map(a => <option key={a} value={a} />)}
                              </datalist>
                            </label>

                            <label className="field">
                              <span className="label">Priorité</span>
                              <select
                                className="select"
                                value={draft?.priorite ?? "Moyen"}
                                onChange={e => setDraft(d => ({ ...d!, priorite: e.target.value as Task["priorite"] }))}
                              >
                                <option value="Élevé">Élevé</option>
                                <option value="Moyen">Moyen</option>
                                <option value="Faible">Faible</option>
                              </select>
                            </label>

                            <label className="field span-2">
                              <span className="label">Remarques</span>
                              <textarea
                                className="textarea"
                                rows={3}
                                value={draft?.remarques ?? ""}
                                onChange={e => setDraft(d => ({ ...d!, remarques: e.target.value }))}
                              />
                            </label>
                          </div>

                          <div className="kan-edit__actions">
                            <button className="btn" onClick={cancelEdit}>Annuler</button>
                            <button className="btn primary" onClick={saveEdit}>Enregistrer</button>
                          </div>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
