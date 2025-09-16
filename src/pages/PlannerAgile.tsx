import React, { useEffect, useMemo, useRef, useState } from "react";
import { seed } from "../data";
import type { Task, Statut } from "../types";
import "../styles/planner-common.css";
import "../styles/planner-agile.css";

/** Colonnes affichées  */
type ColKey = "done" | "progress" | "blocked" | "todo";

/** Map statut → clé colonne  */
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
  { key: "done",     title: "Fait",         stat: "Terminé" },
  { key: "progress", title: "En cours",     stat: "En cours" },
  { key: "blocked",  title: "Bloqué",       stat: "Bloqué" },
  { key: "todo",     title: "Pas commencé", stat: "Pas commencé" },
];

const uid = () => Math.random().toString(36).slice(2, 9);
const uniqueAdmins = (rows: Task[]) =>
  Array.from(new Set(rows.map(r => r.admin).filter(Boolean))) as string[];

export default function PlannerAgile(){
  const [rows, setRows] = useState<Task[]>(() => JSON.parse(JSON.stringify(seed)));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Task> | null>(null);

  // Quick-add state
  const [qaOpen, setQaOpen] = useState(false);
  const [qaTitle, setQaTitle] = useState("");
  const [qaPrio, setQaPrio] = useState<Task["priorite"]>("Moyen");
  const [qaAssignee, setQaAssignee] = useState("👤");
  const qaInputRef = useRef<HTMLInputElement>(null);

  const admins = useMemo(() => uniqueAdmins(rows), [rows]);

  /** Groupement par colonne */
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

  // ---------- Quick-add ----------
  const openQuickAdd = () => {
    setQaOpen(true);
    requestAnimationFrame(() => qaInputRef.current?.focus());
  };
  const cancelQuickAdd = () => {
    setQaOpen(false);
    setQaTitle("");
    setQaPrio("Moyen");
    setQaAssignee("👤");
  };
  const submitQuickAdd = () => {
    const title = qaTitle.trim();
    if (!title) return;
    const t: Task = {
      id: uid(),
      titre: title,
      statut: "Pas commencé",
      priorite: qaPrio,
      admin: qaAssignee || "👤",
      debut: new Date().toISOString().slice(0, 10),
      avancement: 0,
      remarques: "",
    };
    setRows(prev => [...prev, t]);
    cancelQuickAdd();
  };

  // Raccourci clavier: Ctrl/Cmd + N → ouvrir quick add
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        if (!qaOpen) openQuickAdd();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [qaOpen]);

  // ---------- Rendu ----------
  return (
    <section className="agile">
      <h1 className="visually-hidden">Planner Agile</h1>

      {/* Board centré */}
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
                {/* Quick-add en haut de la colonne "Pas commencé" */}
                {col.key === "todo" && (
                  <div className={`kan-quickadd${qaOpen ? " is-open" : ""}`}>
                    {!qaOpen ? (
                      <button
                        className="kan-quickadd__cta"
                        type="button"
                        onClick={openQuickAdd}
                        aria-haspopup="dialog"
                        aria-expanded={qaOpen}
                        title="Ajouter une tâche"
                      >
                        <span className="plus" aria-hidden>＋</span>
                        <span>Ajouter une tâche</span>
                      </button>
                    ) : (
                      <form
                        className="kan-quickadd__form"
                        onSubmit={(e) => { e.preventDefault(); submitQuickAdd(); }}
                        aria-label="Ajouter une nouvelle tâche"
                      >
                        <input
                          ref={qaInputRef}
                          className="input title"
                          placeholder="Titre de la tâche…"
                          value={qaTitle}
                          onChange={e => setQaTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") { e.preventDefault(); cancelQuickAdd(); }
                          }}
                          aria-required="true"
                        />
                        <select
                          className="select prio"
                          value={qaPrio}
                          onChange={e => setQaPrio(e.target.value as Task["priorite"])}
                          aria-label="Priorité"
                        >
                          <option value="Élevé">Élevé</option>
                          <option value="Moyen">Moyen</option>
                          <option value="Faible">Faible</option>
                        </select>

                        <input
                          className="input assignee"
                          list="qa-admins"
                          placeholder="Assigné à…"
                          value={qaAssignee}
                          onChange={e => setQaAssignee(e.target.value)}
                          aria-label="Assigné à"
                        />
                        <datalist id="qa-admins">
                          {admins.map(a => <option key={a} value={a} />)}
                        </datalist>

                        <div className="actions">
                          <button type="button" className="btn" onClick={cancelQuickAdd}>Annuler</button>
                          <button type="submit" className="btn primary" disabled={!qaTitle.trim()}>
                            Créer
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
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
                              <button className="btn icon" title="Modifier" onClick={() => startEdit(t)} aria-label="Modifier la tâche">✏️</button>
                              <button className="btn icon danger" title="Supprimer" onClick={() => removeTask(t.id)} aria-label="Supprimer la tâche">🗑️</button>
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
                              <span className="label">Assigné à</span>
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

      {/* ----- Section Notes (post-it(s) sous le board) ----- */}
      <section className="agile-notes" aria-label="Notes">
        <div className="agile-notes__title">
          <span>📝</span> Notes rapides
        </div>
        <div className="agile-notes__wrap">
          <div className="sticky">
            <textarea placeholder="Écris ton pense-bête ici…" />
          </div>
          {/* Tu peux dupliquer et changer la couleur : */}
          <div className="sticky pink">
            <textarea placeholder="Autre note (rose)…" />
          </div>
          <div className="sticky green">
            <textarea placeholder="Checklist rapide (vert)…" />
          </div>
          {/* Ou n’en garder qu’un seul si tu préfères */}
        </div>
      </section>
    </section>
  );
}
