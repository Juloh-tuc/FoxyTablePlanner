// src/pages/PlannerAgile.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { seed } from "../data";
import type { Task, Statut } from "../types";
import "../styles/planner-common.css";
import "../styles/planner-agile.css";

import ConfirmDialog from "../components/ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";

import PeoplePicker from "../components/PeoplePicker";
import type { Person } from "../components/PeoplePicker";

import NotesQuick from "../components/NotesQuick";


/* ---------------- Helpers / Const ---------------- */
type ColKey = "done" | "progress" | "blocked" | "todo";

const toKey = (s: Statut): ColKey =>
  s === "Terminé" ? "done" :
  s === "En cours" ? "progress" :
  s === "Bloqué" ? "blocked" : "todo";

const fromKey = (k: ColKey): Statut =>
  k === "done" ? "Terminé" :
  k === "progress" ? "En cours" :
  k === "blocked" ? "Bloqué" : "Pas commencé";

const COLUMNS: Array<{ key: ColKey; title: string; stat: Statut }> = [
  { key: "done",     title: "Fait",         stat: "Terminé" },
  { key: "progress", title: "En cours",     stat: "En cours" },
  { key: "blocked",  title: "Bloqué",       stat: "Bloqué" },
  { key: "todo",     title: "Pas commencé", stat: "Pas commencé" },
];

const uid = () => Math.random().toString(36).slice(2, 9);
const uniqueAdmins = (rows: Task[]) =>
  Array.from(new Set(rows.map(r => r.admin).filter(Boolean))) as string[];

const todayISO = () => new Date().toISOString().slice(0, 10);

/* ---------------- Modal Remarques ---------------- */
function RemarksModal({
  title,
  draft,
  setDraft,
  onClose,
  onSave,
  autoFocus = false,
}: {
  title: string;
  draft: string;
  setDraft: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
  autoFocus?: boolean;
}) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const resize = () => {
    const el = taRef.current; if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 320) + "px";
  };
  useEffect(() => { resize(); }, [draft]);
  useEffect(() => { if (autoFocus) taRef.current?.focus(); }, [autoFocus]);
  const onBlur = () => { onSave(); };

  return (
    <div className="cd-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="cd-panel" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{title} — Remarques</h3>
        <div className="remarks-modal-body">
          <textarea
            ref={taRef}
            className="remarks-textarea"
            value={draft}
            maxLength={250}
            placeholder="Détails complets, liens, bloquants… (max 250 caractères)"
            onChange={(e) => setDraft(e.target.value)}
            onInput={resize}
            onBlur={onBlur}
          />
          <div className="remarks-meta">
            <span>{draft.length}/250</span>
          </div>
        </div>
        <div className="cd-actions">
          <button className="cd-btn cd-cancel" onClick={onClose}>Fermer</button>
          <button className="cd-btn cd-confirm" onClick={() => { onSave(); onClose(); }}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Page Kanban ---------------- */
export default function PlannerAgile({ readOnly: propReadOnly = false }: { readOnly?: boolean } = {}) {
  const [rows, setRows] = useState<Task[]>(() => JSON.parse(JSON.stringify(seed)));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Task> & { quickDetail?: string; assignees?: string[] } | null>(null);

  // Mode réunion local (lecture seule)
  const [localReadOnly, setLocalReadOnly] = useState<boolean>(propReadOnly);

  // Annuaire pour PeoplePicker
  const admins = useMemo(() => uniqueAdmins(rows), [rows]);
  const initialPeople = useMemo<Person[]>(() => {
    const seedPeople = admins.map((n, i) => ({ id: `seed-${i}`, name: n }));
    const base = ["Anna", "Simon", "Titouan", "Myriam", "Julie"].map((n, i) => ({ id: `p-${i}`, name: n }));
    const dedup = new Map<string, Person>();
    [...base, ...seedPeople].forEach(p => dedup.set(p.name, p));
    return Array.from(dedup.values());
  }, [admins]);
  const [people, setPeople] = useState<Person[]>(initialPeople);

  // Quick-add
  const [qaOpen, setQaOpen] = useState(false);
  const [qaTitle, setQaTitle] = useState("");
  const [qaPrio, setQaPrio] = useState<Task["priorite"]>("Moyen");
  const [qaAssignees, setQaAssignees] = useState<string[]>([]);
  const [qaQuickDetail, setQaQuickDetail] = useState<string>("");
  const qaInputRef = useRef<HTMLInputElement>(null);

  // Remarques modal
  const [remarksOpenFor, setRemarksOpenFor] = useState<string | null>(null);
  const [remarksDraft, setRemarksDraft] = useState<string>("");

  // Confirm
  const confirm = useConfirm();

  // Groupement par colonne
  const grouped = useMemo(() => {
    const map = new Map<ColKey, Task[]>();
    COLUMNS.forEach(c => map.set(c.key, []));
    rows.forEach(t => map.get(toKey(t.statut))!.push(t));
    return map;
  }, [rows]);

  // DnD
  const dragId = useRef<string | null>(null);
  const onDragStart = (id: string) => (e: React.DragEvent) => {
    if (localReadOnly) return;
    dragId.current = id;
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDropTo = (dst: ColKey) => (e: React.DragEvent) => {
    e.preventDefault();
    if (localReadOnly) return;
    const id = dragId.current || e.dataTransfer.getData("text/plain");
    if (!id) return;
    setRows(prev => prev.map(t => (t.id === id ? { ...t, statut: fromKey(dst) } : t)));
    dragId.current = null;
  };
  const onDragOver = (e: React.DragEvent) => {
    if (localReadOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // CRUD cartes
  const startEdit = (t: Task) => {
    if (localReadOnly) return;
    setEditingId(t.id);
    setDraft({
      ...t,
      assignees: (t as any).assignees ?? (t.admin ? [t.admin] : []),
      quickDetail: (t as any).quickDetail ?? "",
      remarques: (t as any).remarques ?? t.remarques ?? "",
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };
  const saveEdit = () => {
    if (!editingId || !draft) return;
    setRows(prev => prev.map(t =>
      t.id === editingId
        ? ({
            ...t,
            ...draft,
            admin: (draft.assignees && draft.assignees[0]) ? draft.assignees[0] : (draft.admin ?? t.admin),
          } as Task)
        : t
    ));
    setEditingId(null);
    setDraft(null);
  };

  const askRemoveTask = async (id: string, title: string) => {
    const ok = await confirm.ask(`Êtes-vous sûr de vouloir supprimer “${title}” ? Cette action est définitive.`);
    if (ok) {
      setRows(prev => prev.filter(t => t.id !== id));
      if (editingId === id) cancelEdit();
    }
  };

  // Quick-add
  const openQuickAdd = () => {
    if (localReadOnly) return;
    setQaOpen(true);
    requestAnimationFrame(() => qaInputRef.current?.focus());
  };
  const cancelQuickAdd = () => {
    setQaOpen(false);
    setQaTitle("");
    setQaPrio("Moyen");
    setQaAssignees([]);
    setQaQuickDetail("");
  };
  const submitQuickAdd = () => {
    if (localReadOnly) return;
    const title = qaTitle.trim();
    if (!title) return;
    const admin = qaAssignees[0] ?? "👤";
    const t: Task = {
      id: uid(),
      titre: title,
      statut: "Pas commencé",
      priorite: qaPrio,
      admin,
      debut: todayISO(),
      avancement: 0,
      remarques: "", // long remarks vide
    };
    // on stocke aussi quickDetail + assignees en dehors du type
    (t as any).quickDetail = qaQuickDetail.trim();
    (t as any).assignees = [...qaAssignees];

    setRows(prev => [...prev, t]);
    cancelQuickAdd();
  };

  // Raccourci clavier: Ctrl/Cmd + N → ouvrir quick add
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        if (!qaOpen && !localReadOnly) openQuickAdd();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [qaOpen, localReadOnly]);

  // Remarques modal open/save
  const openRemarks = (t: Task) => {
    setRemarksOpenFor(t.id);
    setRemarksDraft(((t as any).remarques ?? t.remarques ?? "") as string);
  };
  const closeRemarks = () => setRemarksOpenFor(null);
  const saveRemarks = () => {
    if (!remarksOpenFor) return;
    setRows(prev => prev.map(t =>
      t.id === remarksOpenFor ? ({ ...t, remarques: remarksDraft } as Task) : t
    ));
  };

  return (
    <section className="agile">
      <h1 className="visually-hidden">Planner Agile</h1>

      {/* Bandeau Mode réunion */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 0 12px 0" }}>
        <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 700 }}>
          <input
            type="checkbox"
            checked={localReadOnly}
            onChange={(e) => setLocalReadOnly(e.target.checked)}
          />
          Mode réunion (lecture seule)
        </label>
        {localReadOnly && (
          <span style={{ fontWeight: 800, fontSize: "0.9rem", background: "#eef2ff", border: "1px solid #c7d2fe", color: "#3730a3", padding: "6px 10px", borderRadius: 999 }}>
            Mode réunion ON
          </span>
        )}
      </div>

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
                        disabled={localReadOnly}
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
                          disabled={localReadOnly}
                        />

                        <select
                          className="select prio"
                          value={qaPrio}
                          onChange={e => setQaPrio(e.target.value as Task["priorite"])}
                          aria-label="Priorité"
                          disabled={localReadOnly}
                        >
                          <option value="Élevé">Élevé</option>
                          <option value="Moyen">Moyen</option>
                          <option value="Faible">Faible</option>
                        </select>

                        <PeoplePicker
                          allPeople={people}
                          value={qaAssignees}
                          onChange={(next) => setQaAssignees(next)}
                          onDirectoryChange={(nextDir) => setPeople(nextDir)}
                          anchorClassName="pp-in-card"
                          disabled={localReadOnly}
                        />

                        {/* Détail rapide (80) */}
                        <input
                          className="input"
                          placeholder="Détail rapide (80 caractères)…"
                          value={qaQuickDetail}
                          onChange={e => setQaQuickDetail(e.target.value.slice(0, 80))}
                          disabled={localReadOnly}
                          style={{ gridColumn: "1 / -1" }}
                        />

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
                  const assignees: string[] = (t as any).assignees ?? (t.admin ? [t.admin] : []);
                  const quickDetail: string = (t as any).quickDetail ?? "";
                  const fullRemarks: string = (t as any).remarques ?? t.remarques ?? "";

                  return (
                    <article
                      key={t.id}
                      className={`kan-card${isEdit ? " is-edit" : ""}`}
                      draggable={!isEdit && !localReadOnly}
                      onDragStart={!isEdit && !localReadOnly ? onDragStart(t.id) : undefined}
                    >
                      {!isEdit ? (
                        <>
                          {/* Titre + actions */}
                          <div className="kan-card__top">
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
                              <strong className="kan-card__title">{t.titre}</strong>
                              {/* Assignation EMPILÉE sous le titre (spec) */}
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                                {assignees.length
                                  ? assignees.map(n => <span key={n} className="tag">{n}</span>)
                                  : <span className="tag">👤</span>
                                }
                              </div>
                            </div>

                            <div className="kan-card__actions">
                              {!localReadOnly && (
                                <>
                                  <button
                                    className="btn icon"
                                    title="Modifier"
                                    onClick={() => startEdit(t)}
                                    aria-label="Modifier la tâche"
                                  >✏️</button>
                                  <button
                                    className="btn icon danger"
                                    title="Supprimer"
                                    onClick={() => askRemoveTask(t.id, t.titre)}
                                    aria-label="Supprimer la tâche"
                                  >🗑️</button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Meta (priorité + statut) */}
                          <div className="kan-card__meta">
                            <span className="badge-prio" data-level={t.priorite}>
                              <span className="dot"></span>{t.priorite ?? "—"}
                            </span>
                            <span className={`status-chip is-${toKey(t.statut)}`}>
                              <span className={`dot ${toKey(t.statut)}`}></span>
                              {t.statut}
                            </span>
                          </div>

                          {/* Détail rapide (80) */}
                          {quickDetail && <p className="kan-card__notes">{quickDetail}</p>}

                          {/* Remarques (ellipsis 1 ligne + modal) */}
                          <div className="kan-card__notes">
                            <span
                              className="one-line-ellipsis remarks-trigger"
                              title={fullRemarks}
                              role="button"
                              tabIndex={0}
                              onClick={() => openRemarks(t)}
                              onKeyDown={(e) => { if (e.key === "Enter") openRemarks(t); }}
                            >
                              {fullRemarks || "—"}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Édition détaillée */}
                          <div className="kan-edit__grid">
                            <label className="field">
                              <span className="label">Titre</span>
                              <input
                                className="input"
                                value={draft?.titre ?? ""}
                                onChange={e => setDraft(d => ({ ...(d || {}), titre: e.target.value }))}
                              />
                            </label>

                            <label className="field">
                              <span className="label">Statut</span>
                              <select
                                className="select"
                                value={draft?.statut ?? t.statut}
                                onChange={e => setDraft(d => ({ ...(d || {}), statut: e.target.value as Statut }))}
                              >
                                <option value="Pas commencé">Pas commencé</option>
                                <option value="En cours">En cours</option>
                                <option value="Bloqué">Bloqué</option>
                                <option value="Terminé">Terminé</option>
                              </select>
                            </label>

                            <label className="field">
                              <span className="label">Priorité</span>
                              <select
                                className="select"
                                value={draft?.priorite ?? t.priorite ?? "Moyen"}
                                onChange={e => setDraft(d => ({ ...(d || {}), priorite: e.target.value as Task["priorite"] }))}
                              >
                                <option value="Élevé">Élevé</option>
                                <option value="Moyen">Moyen</option>
                                <option value="Faible">Faible</option>
                              </select>
                            </label>

                            <label className="field span-2">
                              <span className="label">Assignés</span>
                              <PeoplePicker
                                allPeople={people}
                                value={draft?.assignees ?? assignees}
                                onChange={(next) => setDraft(d => ({ ...(d || {}), assignees: next }))}
                                onDirectoryChange={(nextDir) => setPeople(nextDir)}
                                anchorClassName="pp-in-card"
                                disabled={localReadOnly}
                              />
                            </label>

                            <label className="field span-2">
                              <span className="label">Détail rapide (80 caractères)</span>
                              <input
                                className="input"
                                value={draft?.quickDetail ?? quickDetail}
                                onChange={e => {
                                  const v = e.target.value.slice(0, 80);
                                  setDraft(d => ({ ...(d || {}), quickDetail: v }));
                                }}
                                placeholder="Court contexte visible sur la carte"
                              />
                            </label>

                            <label className="field span-2">
                              <span className="label">Remarques (max 250)</span>
                              <textarea
                                className="textarea"
                                rows={3}
                                maxLength={250}
                                value={draft?.remarques ?? fullRemarks}
                                onChange={e => setDraft(d => ({ ...(d || {}), remarques: e.target.value }))}
                                placeholder="Détails complets, liens, bloquants…"
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

      {/* Remarques Modal */}
      {remarksOpenFor && (() => {
        const t = rows.find(x => x.id === remarksOpenFor)!;
        return (
          <RemarksModal
            title={t.titre}
            draft={remarksDraft}
            setDraft={setRemarksDraft}
            onClose={closeRemarks}
            onSave={saveRemarks}
            autoFocus
          />
        );
      })()}
      <NotesQuick
  storageKey="kanban-quick-notes"
  readOnly={localReadOnly}
/>


      {/* Confirm global */}
      <ConfirmDialog
        open={confirm.open}
        message={confirm.message}
        onCancel={confirm.cancel}
        onConfirm={confirm.confirm}
      />
    </section>
  );
}
