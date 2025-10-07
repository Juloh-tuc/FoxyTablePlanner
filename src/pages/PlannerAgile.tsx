// src/pages/PlannerAgile.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { seed } from "../data";
import type { Task, Statut } from "../types";

import "../styles/planner-common.css";
import "../styles/planner-agile.css";
import "../styles/planner-table.css";

import CreateTaskModal from "../components/CreateTaskModal";
import EditTaskModal from "../components/EditTaskModal";
import { useProjector } from "../hooks/useProjector";

/* =========================
   Helpers & Constantes
   ========================= */
type ColKey = "done" | "progress" | "blocked" | "todo";

const toKey = (s: Statut): ColKey =>
  s === "Terminé" ? "done" :
  s === "En cours" ? "progress" :
  s === "Bloqué" || s === "En attente" ? "blocked" :
  "todo";

const fromKey = (k: ColKey): Statut =>
  k === "done" ? "Terminé" :
  k === "progress" ? "En cours" :
  k === "blocked" ? "Bloqué" :
  "Pas commencé";

const COLUMNS: Array<{ key: ColKey; title: string; stat: Statut }> = [
  { key: "done",     title: "Terminé",       stat: "Terminé" },
  { key: "progress", title: "En cours",      stat: "En cours" },
  { key: "blocked",  title: "Bloqué",        stat: "Bloqué" },
  { key: "todo",     title: "Pas commencé",  stat: "Pas commencé" },
];

const STATUTS: Statut[] = ["Pas commencé", "En cours", "En attente", "Bloqué", "Terminé"];

const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

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
  Anaïs: "anais_foxy.png",
};
const avatarUrlFor = (name?: string | null) => {
  if (!name) return null;
  const f = ADMIN_AVATARS[name.trim()];
  return f ? `/avatars/${f}` : null;
};

/* ===============================
   Modale simple — Archiver uniquement (pas de suppression)
   =============================== */
function ArchiveDialog({
  open, title, onArchive, onCancel,
}: {
  open: boolean;
  title: string;
  onArchive: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="ft-modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="ft-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="ft-modal-title">Archiver « {title} » ?</h3>
        <p className="ft-modal-text">L’élément restera consultable si vous cochez “Afficher archivées”.</p>
        <div className="ft-modal-actions">
          <button className="ft-btn" onClick={onArchive}>Archiver</button>
          <button className="ft-btn ghost" onClick={onCancel}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   Notes / Post-it (archiver/restaurer + tri/filtre + scroll interne)
   ===================================================== */
type StickyColor = "yellow" | "pink" | "green" | "blue";
type StickyNote = {
  id: string;
  title: string;
  text: string;
  color: StickyColor;
  author: string;
  isPrivate: boolean;
  archived: boolean;
  createdAt: string;   // ISO
  updatedAt: string;   // ISO
  archivedAt?: string | null;
};

const STICKY_KEY_DEFAULT = "kanban-notes";
const stickyRandomColor = (): StickyColor => {
  const colors: StickyColor[] = ["yellow", "pink", "green", "blue"];
  return colors[Math.floor(Math.random() * colors.length)];
};

const loadSticky = (k: string): StickyNote[] => {
  try {
    const arr = JSON.parse(localStorage.getItem(k) || "[]");
    if (!Array.isArray(arr)) return [];
    return arr.map((n: any) => {
      const createdIso = n.createdAt ? String(n.createdAt) : new Date().toISOString();
      const titleAuto =
        (n.title ?? String(n.text ?? "").split("\n")[0] ?? "")
          .toString()
          .trim()
          .slice(0, 40) || "(Sans titre)";
      return {
        id: String(n.id ?? uid()),
        title: String(n.title ?? titleAuto),
        text: String(n.text ?? ""),
        color: (n.color as StickyColor) ?? stickyRandomColor(),
        author: String(n.author ?? "Moi"),
        isPrivate: !!n.isPrivate,
        archived: !!n.archived,
        createdAt: typeof n.createdAt === "string" ? n.createdAt : createdIso,
        updatedAt: typeof n.updatedAt === "string" ? n.updatedAt : createdIso,
        archivedAt: n.archivedAt ?? null,
      } as StickyNote;
    });
  } catch {
    return [];
  }
};
const saveSticky = (k: string, v: StickyNote[]) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
};

function StickyNotesSection({
  storageKey = STICKY_KEY_DEFAULT,
  meetingOn,
}: { storageKey?: string; meetingOn: boolean }) {
  const [notes, setNotes] = useState<StickyNote[]>(() => loadSticky(storageKey));
  const [hidePrivate, setHidePrivate] = useState<boolean>(meetingOn);

  // filtres / tri
  const [qTitle, setQTitle] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "title">("date");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [scope, setScope] = useState<"actives" | "archivees">("actives");

  useEffect(() => saveSticky(storageKey, notes), [notes, storageKey]);
  useEffect(() => setHidePrivate(meetingOn), [meetingOn]);

  const add = () => {
    if (meetingOn) return;
    const now = new Date().toISOString();
    setNotes((prev) => [
      {
        id: uid(),
        title: "",
        text: "",
        color: stickyRandomColor(),
        author: "Moi",
        isPrivate: false,
        archived: false,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      },
      ...prev,
    ]);
  };

  const patch = (id: string, p: Partial<StickyNote>) =>
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...p, updatedAt: new Date().toISOString() } : n))
    );

  const archive = (id: string) =>
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              archived: true,
              archivedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : n
      )
    );

  const restore = (id: string) =>
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, archived: false, archivedAt: null, updatedAt: new Date().toISOString() }
          : n
      )
    );

  const askArchive = (id: string) => {
    if (window.confirm("Archiver cette note ? (réversible : visible via « Archivées »)")) {
      archive(id);
    }
  };

  // liste filtrée + triée
  const filtered = useMemo(() => {
    const q = qTitle.trim().toLowerCase();
    let list = notes.filter((n) => (scope === "archivees" ? n.archived : !n.archived));
    if (hidePrivate) list = list.filter((n) => !n.isPrivate);
    if (q) list = list.filter((n) => n.title.toLowerCase().includes(q));
    list.sort((a, b) => {
      if (sortBy === "title") {
        const cmp = a.title.localeCompare(b.title, "fr", { sensitivity: "base" });
        return sortDir === "asc" ? cmp : -cmp;
      } else {
        const da = a.updatedAt ?? a.createdAt;
        const db = b.updatedAt ?? b.createdAt;
        const cmp = String(db).localeCompare(String(da)); // desc
        return sortDir === "asc" ? -cmp : cmp;
      }
    });
    return list;
  }, [notes, qTitle, sortBy, sortDir, scope, hidePrivate]);

  return (
    <div className="notes-wrap">
      <div className="notes-toolbar">
        <div className="left">
          <button className="ft-btn" onClick={add} disabled={meetingOn}>+ Post-it</button>
          <label className="nt-inline">
            <input
              type="checkbox"
              checked={hidePrivate}
              onChange={(e) => setHidePrivate(e.target.checked)}
            />
            Cacher notes privées
          </label>
        </div>
        <div className="right">
          <input
            className="nt-input"
            placeholder="Filtrer par titre…"
            value={qTitle}
            onChange={(e) => setQTitle(e.target.value)}
          />
          <select className="nt-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="date">Date</option>
            <option value="title">Titre</option>
          </select>
          <select className="nt-select" value={sortDir} onChange={(e) => setSortDir(e.target.value as any)}>
            <option value="desc">Décroissant</option>
            <option value="asc">Croissant</option>
          </select>
          <select className="nt-select" value={scope} onChange={(e) => setScope(e.target.value as any)}>
            <option value="actives">Actives</option>
            <option value="archivees">Archivées</option>
          </select>
        </div>
      </div>

      {/* ⚠️ c’est CETTE div qui scrolle en interne */}
      <div className="notes-grid">
        {filtered.map((n) => (
          <div key={n.id} className={`sticky ${n.color} ${n.archived ? "is-archived" : ""}`}>
            <div className="sticky-head">
              <label className="nt-inline small">
                <input
                  type="checkbox"
                  checked={n.isPrivate}
                  onChange={(e) => patch(n.id, { isPrivate: e.target.checked })}
                  disabled={meetingOn}
                />
                Privé
              </label>
              <div className="sticky-actions">
                {!n.archived ? (
                  <button
                    className="nt-btn nt-archive"
                    title="Archiver"
                    onClick={() => askArchive(n.id)}
                    disabled={meetingOn}
                  >
                     Archiver
                  </button>
                ) : (
                  <button
                    className="nt-btn nt-restore"
                    title="Restaurer"
                    onClick={() => restore(n.id)}
                    disabled={meetingOn}
                  >
                    ↩️ Restaurer
                  </button>
                )}
              </div>
            </div>

            <input
              className="sticky-title"
              placeholder="Titre…"
              value={n.title}
              onChange={(e) => patch(n.id, { title: e.target.value.slice(0, 80) })}
              disabled={meetingOn}
            />
            <textarea
              className="sticky-text"
              rows={2}
              value={n.text}
              placeholder="Note…"
              onChange={(e) => patch(n.id, { text: e.target.value })}
              disabled={meetingOn}
            />
            <div className="sticky-meta">
              <span>{new Date(n.updatedAt ?? n.createdAt).toLocaleDateString()}</span>
              {n.archived && <span className="nt-badge nt-badge-archived">Archivée</span>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="nt-empty">Aucune note à afficher.</div>}
      </div>
    </div>
  );
}

/* ===============================
   Page principale
   =============================== */
export default function PlannerAgile() {
  const [rows, setRows] = useState<Task[]>(() => JSON.parse(JSON.stringify(seed)));
  const [meetingOn, setMeetingOn] = useState<boolean>(() => {
    try { return localStorage.getItem("planner.agile.meeting") === "1"; } catch { return false; }
  });

  // 🔦 rétroprojecteur lié au mode réunion
  useProjector(meetingOn);

  // Filtres
  const [q, setQ] = useState("");
  const [fAdmin, setFAdmin] = useState<string | "Tous">("Tous");
  const [fStatut, setFStatut] = useState<Statut | "Tous">("Tous");
  const [fProgress, setFProgress] = useState<"Tous" | "0" | "25" | "50" | "75" | "100">("Tous");
  const [showArchived, setShowArchived] = useState(false);

  // Création / archivage / édition
  const [createOpen, setCreateOpen] = useState(false);
  const [archOpen, setArchOpen] = useState<{ open: boolean; id?: string; title?: string }>({ open: false });
  const [edit, setEdit] = useState<{ open: boolean; task?: Task }>({ open: false });

  // Admins/personnes
  // Admins/personnes = personnes des tâches ∪ avatars connus
 const admins = useMemo(() => {
   const set = new Set<string>(uniquePeople(rows));
   Object.keys(ADMIN_AVATARS).forEach((n) => set.add(n));
  return Array.from(set).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
 }, [rows]);

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
      const hay = [
        t.titre,
        t.admin,
        ...(Array.isArray(t.assignees) ? t.assignees : []),
        t.remarques,
        t.bloque,
        t.bloquePar,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(text);
    });
  }, [rows, q, fAdmin, fStatut, fProgress, showArchived]);

  // Groupement par colonne
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

  // Archiver tâches
  const askArchive = (t: Task) => setArchOpen({ open: true, id: t.id, title: t.titre });
  const doArchive = () => {
    if (!archOpen.id) return;
    setRows((prev) =>
      prev.map((t) => (t.id === archOpen.id ? { ...t, archived: true, archivedAt: new Date().toISOString() } : t))
    );
    setArchOpen({ open: false });
  };

  // Édition
  const openEdit = (t: Task) => {
    if (meetingOn || t.archived) return;
    setEdit({ open: true, task: t });
  };
  const saveEdit = (updated: Task) => {
    setRows((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
    setEdit({ open: false });
  };

  const wrapperClasses = ["agile-wrap", "ft-fullbleed", meetingOn ? "meeting-on" : ""].join(" ");
  const [openPeopleId, setOpenPeopleId] = useState<string | null>(null);

  return (
    <section className={wrapperClasses}>
      {/* Toolbar */}
      <div className="ft-toolbar">
        <div className="ft-left">
          <button
            className={`ft-btn meeting-toggle ${meetingOn ? "is-on" : ""}`}
            onClick={() => {
              setMeetingOn((v) => {
                const next = !v;
                try { localStorage.setItem("planner.agile.meeting", next ? "1" : "0"); } catch {}
                return next;
              });
            }}
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
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select className="ft-select" value={fStatut} onChange={(e) => setFStatut(e.target.value as any)}>
            <option value="Tous">Tous statuts</option>
            {STATUTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            className="ft-select"
            value={fProgress}
            onChange={(e) => setFProgress(e.target.value as any)}
            title="Avancement minimal"
          >
            <option value="Tous">Avancement ≥ 0%</option>
            <option value="0">≥ 0%</option>
            <option value="25">≥ 25%</option>
            <option value="50">≥ 50%</option>
            <option value="75">≥ 75%</option>
            <option value="100">= 100%</option>
          </select>

          <label className="nt-inline">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
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
            <section
              key={col.key}
              className={`kan-col col-${col.key}`}
              onDragOver={onDragOver}
              onDrop={onDropTo(col.key)}
            >
              <header className={`kan-col__title is-${col.key}`}>
                <h3>{col.title}</h3>
                <span className="count">{list.length}</span>
              </header>

              <div className="kan-cards">
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
                      onClick={() => openEdit(t)}
                      style={{ cursor: !meetingOn && !isArchived ? "pointer" : undefined }}
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
                            <button
                              className="btn icon"
                              title="Archiver"
                              onClick={(e) => { e.stopPropagation(); askArchive(t); }}
                            >
                              📦
                            </button>
                          ) : (
                            <button
                              className="btn icon"
                              title="Restaurer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRows((prev) =>
                                  prev.map((x) => (x.id === t.id ? { ...x, archived: false, archivedAt: null } : x))
                                );
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

      {/* Datalist Admins */}
      <datalist id="admins-list">
        {admins.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>

      {/* Modales */}
      {createOpen && (
        <CreateTaskModal
          admins={admins}
          onCreate={(t) => { setRows((prev) => [{ ...t }, ...prev]); setCreateOpen(false); }}
          onClose={() => setCreateOpen(false)}
        />
      )}
      {edit.open && edit.task && (
        <EditTaskModal
          open={edit.open}
          task={edit.task}
          tasks={rows}
          admins={admins}
          onSave={saveEdit}
          onClose={() => setEdit({ open: false })}
          onAskArchiveDelete={(t) => {
            // ⚠️ “Delete” désactivé par politique: on ARCHIVE seulement
            setRows(prev => prev.map(x => x.id === t.id ? { ...x, archived: true, archivedAt: new Date().toISOString() } : x));
            setEdit({ open: false });
          }}
        />
      )}

      <ArchiveDialog
        open={archOpen.open}
        title={archOpen.title ?? "cette tâche"}
        onArchive={doArchive}
        onCancel={() => setArchOpen({ open: false })}
      />
    </section>
  );
}
