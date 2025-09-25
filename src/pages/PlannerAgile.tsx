// src/pages/PlannerAgile.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { seed } from "../data";
import type { Task, Statut } from "../types";

import "../styles/planner-common.css";
import "../styles/planner-agile.css";
import "../styles/planner-table.css";

import CreateTaskModal from "../components/CreateTaskModal";

/* =========================
   Helpers & Constantes
   ========================= */
type ColKey = "done" | "progress" | "blocked" | "todo";

const toKey = (s: Statut): ColKey =>
  s === "Terminé"    ? "done"    :
  s === "En cours"   ? "progress":
  s === "Bloqué"     ? "blocked" :
  s === "En attente" ? "blocked" : // << ajouté
                       "todo";

const fromKey = (k: ColKey): Statut =>
  k === "done" ? "Terminé" :
  k === "progress" ? "En cours" :
  k === "blocked" ? "Bloqué" :
  "Pas commencé";

// Ordre demandé
const COLUMNS: Array<{ key: ColKey; title: string; stat: Statut }> = [
  { key: "done", title: "Terminé", stat: "Terminé" },
  { key: "progress", title: "En cours", stat: "En cours" },
  { key: "blocked", title: "Bloqué", stat: "Bloqué" },
  { key: "todo", title: "Pas commencé", stat: "Pas commencé" },
];

// Inclut maintenant "En attente"
const STATUTS: Statut[] = ["Pas commencé", "En cours", "En attente", "Bloqué", "Terminé"];

const uid = () => Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().slice(0, 10);

// people = admin + assignees[]
const uniquePeople = (rows: Task[]) => {
  const set = new Set<string>();
  rows.forEach((r) => {
    if (r.admin) set.add(r.admin);
    if (Array.isArray(r.assignees)) r.assignees.forEach((a) => a && set.add(a));
  });
  return Array.from(set) as string[];
};

const initials = (name: string) =>
  (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

const ADMIN_AVATARS: Record<string, string> = {
  Julie: "Foxy_Julie.png",
  Léo: "léo_foxy.png",
  Mohamed: "mohamed_foxy.png",
  Myriam: "myriam_foxy.png",
  Simon: "simon_foxy.png",
  Titouan: "titouan_foxy.png",
};
const avatarUrlFor = (name?: string | null) => {
  if (!name) return null;
  const f = ADMIN_AVATARS[name.trim()];
  return f ? `/avatars/${f}` : null;
};

/* ===============================
   Modale Archiver / Supprimer
   =============================== */
function ArchiveDeleteDialog({
  open,
  title,
  onArchive,
  onDelete,
  onCancel,
}: {
  open: boolean;
  title: string;
  onArchive: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="ft-modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="ft-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="ft-modal-title">Que faire de « {title} » ?</h3>
        <p className="ft-modal-text">Vous pouvez archiver (réversible) ou supprimer (définitif).</p>
        <div className="ft-modal-actions">
          <button className="ft-btn" onClick={onArchive}>
            Archiver
          </button>
          <button className="ft-btn danger" onClick={onDelete}>
            Supprimer
          </button>
          <button className="ft-btn ghost" onClick={onCancel}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===============================
   Section Notes (inchangée)
   =============================== */
type StickyColor = "yellow" | "pink" | "green" | "blue";
type Note = { id: string; text: string; color: StickyColor; author: string; isPrivate: boolean };

const loadNotes = (k: string): Note[] => {
  try {
    return JSON.parse(localStorage.getItem(k) || "[]");
  } catch {
    return [];
  }
};
const saveNotes = (k: string, v: Note[]) => localStorage.setItem(k, JSON.stringify(v));

function StickyNotesSection({ storageKey, meetingOn }: { storageKey: string; meetingOn: boolean }) {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes(storageKey));
  const [hidePrivate, setHidePrivate] = useState<boolean>(meetingOn);

  useEffect(() => saveNotes(storageKey, notes), [notes, storageKey]);
  useEffect(() => setHidePrivate(meetingOn), [meetingOn]);

  const add = () => {
    setNotes((prev) => [...prev, { id: uid(), text: "", color: "yellow", author: "Moi", isPrivate: false }]);
  };
  const upd = (id: string, patch: Partial<Note>) => setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  const del = (id: string) => setNotes((prev) => prev.filter((n) => n.id !== id));

  const list = useMemo(() => (hidePrivate ? notes.filter((n) => !n.isPrivate) : notes), [notes, hidePrivate]);

  return (
    <div className="notes-wrap">
      <div className="notes-toolbar">
        <div className="left">
          <button className="ft-btn" onClick={add}>
            + Post-it
          </button>
          <label className="nt-inline">
            <input type="checkbox" checked={hidePrivate} onChange={(e) => setHidePrivate(e.target.checked)} />
            Cacher notes privées
          </label>
        </div>
        <div className="right" />
      </div>

      <div className="notes-grid">
        {list.map((n) => (
          <div key={n.id} className={`sticky ${n.color}`}>
            <div className="sticky-head">
              <select value={n.color} onChange={(e) => upd(n.id, { color: e.target.value as StickyColor })}>
                <option value="yellow">Jaune</option>
                <option value="pink">Rose</option>
                <option value="green">Vert</option>
                <option value="blue">Bleu</option>
              </select>
              <label className="nt-inline small">
                <input type="checkbox" checked={n.isPrivate} onChange={(e) => upd(n.id, { isPrivate: e.target.checked })} />
                Privé
              </label>
              <button className="ft-btn icon" title="Supprimer" onClick={() => del(n.id)}>
                🗑️
              </button>
            </div>
            <textarea value={n.text} placeholder="Note…" onChange={(e) => upd(n.id, { text: e.target.value })} />
          </div>
        ))}
        {list.length === 0 && <div className="nt-empty">Aucune note à afficher.</div>}
      </div>
    </div>
  );
}

/* ===============================
   Page principale
   =============================== */
export default function PlannerAgile() {
  const [rows, setRows] = useState<Task[]>(() => JSON.parse(JSON.stringify(seed)));
  const [meetingOn, setMeetingOn] = useState(false);

  // Filtres
  const [q, setQ] = useState("");
  const [fAdmin, setFAdmin] = useState<string | "Tous">("Tous");
  const [fStatut, setFStatut] = useState<Statut | "Tous">("Tous");
  const [fProgress, setFProgress] = useState<"Tous" | "0" | "25" | "50" | "75" | "100">("Tous");
  const [showArchived, setShowArchived] = useState(false);

  // Création / suppression
  const [createOpen, setCreateOpen] = useState(false);
  const [adOpen, setAdOpen] = useState<{ open: boolean; id?: string; title?: string }>({ open: false });

  // Admins/personnes (pour datalist + sélecteur)
  const admins = useMemo(() => uniquePeople(rows), [rows]);

  // Recherche / filtres
  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return rows.filter((t) => {
      if (!showArchived && t.archived) return false;
      if (fAdmin !== "Tous") {
        const ass = Array.isArray(t.assignees) ? t.assignees : [];
        const match = t.admin === fAdmin || ass.includes(fAdmin);
        if (!match) return false;
      }
      if (fStatut !== "Tous" && t.statut !== fStatut) return false;
      if (fProgress !== "Tous") {
        const p = t.avancement ?? 0;
        const min = parseInt(fProgress, 10);
        if (p < min) return false;
      }
      if (!text) return true;
      const hay = [t.titre, t.admin, ...(Array.isArray(t.assignees) ? t.assignees : []), t.remarques, t.bloque, t.bloquePar]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(text);
    });
  }, [rows, q, fAdmin, fStatut, fProgress, showArchived]);

  // Groupement par colonne (d’après filtered)
  const grouped = useMemo(() => {
    const map = new Map<ColKey, Task[]>();
    COLUMNS.forEach((c) => map.set(c.key, []));
    filtered.forEach((t) => map.get(toKey(t.statut))!.push(t));
    return map;
  }, [filtered]);

  // DnD
  const dragId = useRef<string | null>(null);
  const onDragStart = (id: string) => (e: React.DragEvent) => {
    if (meetingOn) return;
    dragId.current = id;
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e: React.DragEvent) => {
    if (meetingOn) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDropTo = (dst: ColKey) => (e: React.DragEvent) => {
    e.preventDefault();
    if (meetingOn) return;
    const id = dragId.current || e.dataTransfer.getData("text/plain");
    if (!id) return;
    setRows((prev) => prev.map((t) => (t.id === id ? { ...t, statut: fromKey(dst) } : t)));
    dragId.current = null;
  };

  // Actions archive/suppr
  const askArchiveDelete = (t: Task) => setAdOpen({ open: true, id: t.id, title: t.titre });
  const doArchive = () => {
    if (!adOpen.id) return;
    setRows((prev) => prev.map((t) => (t.id === adOpen.id ? { ...t, archived: true, archivedAt: new Date().toISOString() } : t)));
    setAdOpen({ open: false });
  };
  const doDelete = () => {
    if (!adOpen.id) return;
    setRows((prev) => prev.filter((t) => t.id !== adOpen.id));
    setAdOpen({ open: false });
  };

  const createTask = (t: Task) => {
    setRows((prev) => [{ ...t }, ...prev]);
    setCreateOpen(false);
  };

  /* ===============================
     UI
     =============================== */
  const wrapperClasses = ["agile-wrap", "ft-fullbleed", meetingOn ? "meeting-on" : ""].join(" ");
  const [openPeopleId, setOpenPeopleId] = useState<string | null>(null);

  return (
    <section className={wrapperClasses}>
      {/* Toolbar */}
      <div className="ft-toolbar">
        <div className="ft-left">
          <button
            className={`ft-btn meeting-toggle ${meetingOn ? "is-on" : ""}`}
            onClick={() => setMeetingOn((v) => !v)}
            title="Basculer Mode réunion"
          >
            <span className="mt-dot" />
            <span>{meetingOn ? "Mode réunion : ON" : "Mode réunion"}</span>
          </button>

          <div className="ft-input-wrap">
            <span className="ft-input-ico">🔎</span>
            <input
              className="ft-input"
              placeholder="Rechercher (titre, personnes, remarques…)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <select className="ft-select" value={fAdmin} onChange={(e) => setFAdmin(e.target.value as any)}>
            <option value="Tous">Toutes personnes</option>
            {admins.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <select className="ft-select" value={fStatut} onChange={(e) => setFStatut(e.target.value as any)}>
            <option value="Tous">Tous statuts</option>
            {STATUTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select className="ft-select" value={fProgress} onChange={(e) => setFProgress(e.target.value as any)} title="Avancement minimal">
            <option value="Tous">Avancement ≥ 0%</option>
            <option value="0">≥ 0%</option>
            <option value="25">≥ 25%</option>
            <option value="50">≥ 50%</option>
            <option value="75">≥ 75%</option>
            <option value="100">= 100%</option>
          </select>

          <label className="nt-inline">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Afficher archivées
          </label>
        </div>

        <div className="ft-right">
          <button className="ft-btn primary" onClick={() => setCreateOpen(true)} disabled={meetingOn}>
            + Nouvelle tâche
          </button>
          <span className="ft-count">{filtered.length} tâches</span>
        </div>
      </div>

      {/* Board */}
      <div className="kan-board">
        {COLUMNS.map((col) => {
          const list = grouped.get(col.key)!;
          return (
            <section key={col.key} className={`kan-col col-${col.key}`} onDragOver={onDragOver} onDrop={onDropTo(col.key)}>
              <header className={`kan-col__title is-${col.key}`}>
                <h3>{col.title}</h3>
                <span className="count">{list.length}</span>
              </header>

              <div className="kan-col__list">
                {list.map((t) => {
                  const quick = (t as any).quickDetail as string | undefined;
                  const isArchived = !!t.archived;

                  const people =
                    Array.isArray(t.assignees) && t.assignees.length ? t.assignees : t.admin ? [t.admin] : [];
                  const extra = Math.max(people.length - 3, 0);

                  return (
                    <article
                      key={t.id}
                      className={`kan-card ${isArchived ? "is-archived" : ""}`}
                      draggable={!meetingOn && !isArchived}
                      onDragStart={!meetingOn && !isArchived ? onDragStart(t.id) : undefined}
                    >
                      <div className="kan-card__top">
                        <div className="kan-card__titlewrap" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {/* Avatar stack */}
                          <div className="avatar-stack" aria-hidden>
                            {people.slice(0, 3).map((name, i) => {
                              const url = avatarUrlFor(name);
                              return (
                                <span key={`${name}-${i}`} className="admin-avatar">
                                  {url ? (
                                    <img
                                      src={encodeURI(url)}
                                      alt=""
                                      onError={(e) => {
                                        const parent = e.currentTarget.parentElement;
                                        if (parent)
                                          parent.innerHTML = `<span class="fallback">${initials(name) || "?"}</span>`;
                                      }}
                                    />
                                  ) : (
                                    <span className="fallback">{initials(name) || "?"}</span>
                                  )}
                                </span>
                              );
                            })}
                            {extra > 0 && (
                              <button
                                type="button"
                                className="more-badge"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenPeopleId(openPeopleId === t.id ? null : t.id);
                                }}
                              >
                                +{extra}
                              </button>
                            )}
                            {openPeopleId === t.id && (
                              <div className="people-pop" onClick={(e) => e.stopPropagation()}>
                                {people.map((name, i) => (
                                  <div key={`${name}-${i}`} className="people-row">
                                    <span className="admin-avatar small">
                                      {avatarUrlFor(name) ? (
                                        <img src={encodeURI(avatarUrlFor(name)!)} alt="" />
                                      ) : (
                                        <span className="fallback">{initials(name) || "?"}</span>
                                      )}
                                    </span>
                                    <span className="people-name">{name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <strong className="kan-card__title" title={t.titre}>
                            {t.titre}
                          </strong>
                        </div>
                        <div className="kan-card__actions">
                          {!isArchived ? (
                            <button className="btn danger icon" title="Archiver/Supprimer" onClick={() => askArchiveDelete(t)}>
                              🗑️
                            </button>
                          ) : (
                            <button
                              className="btn icon"
                              title="Restaurer"
                              onClick={() => {
                                setRows((prev) => prev.map((x) => (x.id === t.id ? { ...x, archived: false, archivedAt: null } : x)));
                              }}
                            >
                              ↩️
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="kan-card__meta">
                        <span className="badge-prio" data-level={t.priorite}>
                          <span className="dot"></span>
                          {t.priorite ?? "—"}
                        </span>
                        <span className={`status-chip is-${toKey(t.statut)}`}>
                          <span className={`dot ${toKey(t.statut)}`}></span>
                          {t.statut}
                        </span>
                        {(t.avancement ?? 0) > 0 && <span className="prog-chip">{t.avancement}%</span>}
                      </div>

                      {quick && <p className="kan-card__quick">{quick}</p>}
                      {t.remarques && (
                        <div className="kan-card__notes one-line-ellipsis" title={t.remarques}>
                          {t.remarques}
                        </div>
                      )}
                    </article>
                  );
                })}
                {list.length === 0 && <div className="ag-empty">Aucune tâche ici.</div>}
              </div>
            </section>
          );
        })}
      </div>

      {/* Notes post-it */}
      <div className="notes-section">
        <div className="notes-title">Notes de réunion</div>
        <StickyNotesSection storageKey="kanban-notes" meetingOn={meetingOn} />
      </div>

      {/* Datalist Admins pour d’autres composants si besoin */}
      <datalist id="admins-list">
        {admins.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>

      {/* Modales */}
      {createOpen && <CreateTaskModal admins={admins} onCreate={createTask} onClose={() => setCreateOpen(false)} />}

      <ArchiveDeleteDialog
        open={adOpen.open}
        title={adOpen.title ?? "cette tâche"}
        onArchive={doArchive}
        onDelete={doDelete}
        onCancel={() => setAdOpen({ open: false })}
      />
    </section>
  );
}
