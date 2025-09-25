// src/pages/PlannerAgile.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { seed } from "../data";
import type { Task, Statut } from "../types";

import "../styles/planner-common.css";
import "../styles/planner-agile.css";
import "../styles/planner-table.css"; // réutilise le bouton "Mode réunion" / ft-toolbar

/* =========================
   Helpers & Constantes
   ========================= */
type ColKey = "done" | "progress" | "blocked" | "todo";

const toKey = (s: Statut): ColKey =>
  s === "Terminé" ? "done" :
  s === "En cours" ? "progress" :
  s === "Bloqué" ? "blocked" : "todo";

const fromKey = (k: ColKey): Statut =>
  k === "done" ? "Terminé" :
  k === "progress" ? "En cours" :
  k === "blocked" ? "Bloqué" : "Pas commencé";

// >>> Ordre demandé: Terminé → En cours → Bloqué → Pas commencé
const COLUMNS: Array<{ key: ColKey; title: string; stat: Statut }> = [
  { key: "done",     title: "Terminé",      stat: "Terminé" },
  { key: "progress", title: "En cours",     stat: "En cours" },
  { key: "blocked",  title: "Bloqué",       stat: "Bloqué" },
  { key: "todo",     title: "Pas commencé", stat: "Pas commencé" },
];

const STATUTS: Statut[] = ["Pas commencé", "En cours", "Bloqué", "Terminé"];
const uid = () => Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().slice(0, 10);
const uniqueAdmins = (rows: Task[]) =>
  Array.from(new Set(rows.map(r => r.admin).filter(Boolean))) as string[];

const initials = (name: string) =>
  (name || "").split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? "").join("");

/** Avatars: mappe "Nom" → fichier réel dans public/avatars */
const ADMIN_AVATARS: Record<string, string> = {
  "Julie": "Foxy_Julie.png",
  "Léo": "léo_foxy.png",
  "Mohamed": "mohamed_foxy.png",
  "Myriam": "myriam_foxy.png",
  "Simon": "simon_foxy.png",
  "Titouan": "titouan_foxy.png",
  // "Anaïs": "anais_foxy.png",
};
const avatarUrlFor = (name?: string | null) => {
  if (!name) return null;
  const f = ADMIN_AVATARS[name.trim()];
  return f ? `/avatars/${f}` : null;
};

/* ===============================
   Modale "Nouvelle tâche"
   =============================== */
function CreateTaskModal({
  open, onClose, onCreate, admins,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (t: Task) => void;
  admins: string[];
}) {
  const [titre, setTitre] = useState("");
  const [priorite, setPriorite] = useState<Task["priorite"]>("Moyen");
  const [admin, setAdmin] = useState<string>(admins[0] ?? "");
  const [quick, setQuick] = useState("");
  const [remarques, setRemarques] = useState("");

  useEffect(() => {
    if (open) {
      setTitre(""); setPriorite("Moyen"); setAdmin(admins[0] ?? "");
      setQuick(""); setRemarques("");
    }
  }, [open, admins]);

  if (!open) return null;
  const submit = () => {
    const t: Task = {
      id: uid(),
      titre: (titre || "").slice(0,80),
      statut: "Pas commencé",
      priorite,
      admin: admin || "—",
      debut: todayISO(),
      remarques: (remarques || "").slice(0,250),
    };
    (t as any).quickDetail = quick.slice(0,80);
    onCreate(t);
  };

  return (
    <div className="ft-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="ft-modal ft-lg" onClick={(e) => e.stopPropagation()}>
        <div className="ft-modal-header">
          <h3 className="ft-modal-title">Nouvelle tâche</h3>
          <button className="ft-icon-btn" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="ctm-grid">
          <label className="field span-2">
            <span className="label">Titre (max 80)</span>
            <input className="cell-input" value={titre} onChange={e=>setTitre(e.target.value)} placeholder="Titre..." maxLength={80} autoFocus/>
          </label>
          <label className="field">
            <span className="label">Priorité</span>
            <select className="cell-input" value={priorite ?? ""} onChange={e=>setPriorite(e.target.value as any)}>
              <option value="Élevé">Élevé</option>
              <option value="Moyen">Moyen</option>
              <option value="Faible">Faible</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Admin</span>
            <input className="cell-input" list="admins-list" value={admin} onChange={e=>setAdmin(e.target.value)} placeholder="Responsable..." />
          </label>
          <label className="field span-2">
            <span className="label">Détail rapide (80)</span>
            <input className="cell-input" value={quick} onChange={e=>setQuick(e.target.value.slice(0,80))} placeholder="Court contexte visible sur la carte"/>
          </label>
          <label className="field span-2">
            <span className="label">Remarques (250)</span>
            <textarea className="cell-input" rows={4} value={remarques} onChange={e=>setRemarques(e.target.value.slice(0,250))} placeholder="Détails, liens, bloquants..."/>
          </label>
        </div>
        <div className="ft-modal-actions end">
          <button className="ft-btn ghost" onClick={onClose}>Annuler</button>
          <button className="ft-btn primary" onClick={submit} disabled={!titre.trim()}>Créer</button>
        </div>
      </div>
    </div>
  );
}

/* ===============================
   Modale Archiver / Supprimer
   =============================== */
function ArchiveDeleteDialog({
  open, title, onArchive, onDelete, onCancel,
}: {
  open: boolean; title: string;
  onArchive: () => void; onDelete: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="ft-modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="ft-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="ft-modal-title">Que faire de « {title} » ?</h3>
        <p className="ft-modal-text">Vous pouvez archiver (réversible) ou supprimer (définitif).</p>
        <div className="ft-modal-actions">
          <button className="ft-btn" onClick={onArchive}>Archiver</button>
          <button className="ft-btn danger" onClick={onDelete}>Supprimer</button>
          <button className="ft-btn ghost" onClick={onCancel}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

/* ===============================
   Section Notes “post-it” — simplifiée
   =============================== */
type StickyColor = "yellow" | "pink" | "green" | "blue";
type Note = { id: string; text: string; color: StickyColor; author: string; isPrivate: boolean };

const loadNotes = (k: string): Note[] => {
  try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; }
};
const saveNotes = (k: string, v: Note[]) => localStorage.setItem(k, JSON.stringify(v));

function StickyNotesSection({
  storageKey, meetingOn,
}: {
  storageKey: string;
  meetingOn: boolean;
}) {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes(storageKey));
  const [hidePrivate, setHidePrivate] = useState<boolean>(meetingOn);

  useEffect(()=>saveNotes(storageKey, notes),[notes, storageKey]);
  useEffect(()=>setHidePrivate(meetingOn),[meetingOn]);

  const add = () => {
    setNotes(prev => [
      ...prev,
      { id: uid(), text: "", color: "yellow", author: "Moi", isPrivate: false }
    ]);
  };
  const upd = (id: string, patch: Partial<Note>) =>
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n));
  const del = (id: string) => setNotes(prev => prev.filter(n => n.id !== id));

  const list = useMemo(() => hidePrivate ? notes.filter(n => !n.isPrivate) : notes, [notes, hidePrivate]);

  return (
    <div className="notes-wrap">
      <div className="notes-toolbar">
        <div className="left">
          <button className="ft-btn" onClick={add}>+ Post-it</button>
          <label className="nt-inline">
            <input type="checkbox" checked={hidePrivate} onChange={e=>setHidePrivate(e.target.checked)} />
            Cacher notes privées
          </label>
        </div>
        <div className="right" />
      </div>

      <div className="notes-grid">
        {list.map(n => (
          <div key={n.id} className={`sticky ${n.color}`}>
            <div className="sticky-head">
              <select value={n.color} onChange={e=>upd(n.id, { color: e.target.value as StickyColor })}>
                <option value="yellow">Jaune</option>
                <option value="pink">Rose</option>
                <option value="green">Vert</option>
                <option value="blue">Bleu</option>
              </select>
              <label className="nt-inline small">
                <input type="checkbox" checked={n.isPrivate} onChange={e=>upd(n.id, { isPrivate: e.target.checked })}/>
                Privé
              </label>
              <button className="ft-btn icon" title="Supprimer" onClick={()=>del(n.id)}>🗑️</button>
            </div>
            <textarea
              value={n.text}
              placeholder="Note…"
              onChange={e=>upd(n.id, { text: e.target.value })}
            />
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

  // Filtres tableau
  const [q, setQ] = useState("");
  const [fAdmin, setFAdmin] = useState<string | "Tous">("Tous");
  const [fStatut, setFStatut] = useState<Statut | "Tous">("Tous");
  const [fProgress, setFProgress] = useState<"Tous" | "0" | "25" | "50" | "75" | "100">("Tous");
  const [showArchived, setShowArchived] = useState(false);

  // Création / suppression
  const [createOpen, setCreateOpen] = useState(false);
  const [adOpen, setAdOpen] = useState<{open:boolean; id?: string; title?: string}>({open:false});

  // Admins (pour datalist + filtres)
  const admins = useMemo(() => uniqueAdmins(rows), [rows]);

  // Recherche / filtres
  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return rows.filter(t => {
      if (!showArchived && t.archived) return false;
      if (fAdmin !== "Tous" && t.admin !== fAdmin) return false;
      if (fStatut !== "Tous" && t.statut !== fStatut) return false;
      if (fProgress !== "Tous") {
        const p = t.avancement ?? 0;
        const min = parseInt(fProgress, 10);
        if (p < min) return false;
      }
      if (!text) return true;
      const hay = [t.titre, t.admin, t.remarques, t.bloque, t.bloquePar].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(text);
    });
  }, [rows, q, fAdmin, fStatut, fProgress, showArchived]);

  // Groupement par colonne (d’après filtered)
  const grouped = useMemo(() => {
    const map = new Map<ColKey, Task[]>();
    COLUMNS.forEach(c => map.set(c.key, []));
    filtered.forEach(t => map.get(toKey(t.statut))!.push(t));
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
    setRows(prev => prev.map(t => t.id === id ? { ...t, statut: fromKey(dst) } : t));
    dragId.current = null;
  };

  // Actions archive/suppr
  const askArchiveDelete = (t: Task) => setAdOpen({open:true, id:t.id, title:t.titre});
  const doArchive = () => {
    if (!adOpen.id) return;
    setRows(prev => prev.map(t => t.id === adOpen.id ? { ...t, archived: true, archivedAt: new Date().toISOString() } : t));
    setAdOpen({open:false});
  };
  const doDelete = () => {
    if (!adOpen.id) return;
    setRows(prev => prev.filter(t => t.id !== adOpen.id));
    setAdOpen({open:false});
  };

  const createTask = (t: Task) => {
    setRows(prev => [{...t}, ...prev]);
    setCreateOpen(false);
  };

  /* ===============================
     UI
     =============================== */
  const wrapperClasses = ["agile-wrap", "ft-fullbleed", meetingOn ? "meeting-on" : ""].join(" ");

  return (
    <section className={wrapperClasses}>
      {/* Toolbar (même look que la table) */}
      <div className="ft-toolbar">
        <div className="ft-left">
          <button
            className={`ft-btn meeting-toggle ${meetingOn ? "is-on" : ""}`}
            onClick={() => setMeetingOn(v => !v)}
            title="Basculer Mode réunion"
          >
            <span className="mt-dot" />
            <span>{meetingOn ? "Mode réunion : ON" : "Mode réunion"}</span>
          </button>

          <div className="ft-input-wrap">
            <span className="ft-input-ico">🔎</span>
            <input className="ft-input" placeholder="Rechercher (titre, admin, remarques…)" value={q} onChange={e=>setQ(e.target.value)}/>
          </div>

          <select className="ft-select" value={fAdmin} onChange={e=>setFAdmin(e.target.value as any)}>
            <option value="Tous">Tous admins</option>
            {admins.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <select className="ft-select" value={fStatut} onChange={e=>setFStatut(e.target.value as any)}>
            <option value="Tous">Tous statuts</option>
            {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select className="ft-select" value={fProgress} onChange={e=>setFProgress(e.target.value as any)} title="Avancement minimal">
            <option value="Tous">Avancement ≥ 0%</option>
            <option value="0">≥ 0%</option>
            <option value="25">≥ 25%</option>
            <option value="50">≥ 50%</option>
            <option value="75">≥ 75%</option>
            <option value="100">= 100%</option>
          </select>

          <label className="nt-inline">
            <input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)} />
            Afficher archivées
          </label>
        </div>

        <div className="ft-right">
          <button className="ft-btn primary" onClick={()=>setCreateOpen(true)} disabled={meetingOn}>+ Nouvelle tâche</button>
          <span className="ft-count">{filtered.length} tâches</span>
        </div>
      </div>

      {/* Board */}
      <div className="kan-board">
        {COLUMNS.map(col => {
          const list = grouped.get(col.key)!;
          return (
            <section key={col.key} className={`kan-col col-${col.key}`} onDragOver={onDragOver} onDrop={onDropTo(col.key)}>
              <header className={`kan-col__title is-${col.key}`}>
                <h3>{col.title}</h3>
                <span className="count">{list.length}</span>
              </header>

              <div className="kan-col__list">
                {list.map(t => {
                  const quick = (t as any).quickDetail as string | undefined;
                  const aUrl = avatarUrlFor(t.admin);
                  const isArchived = !!t.archived;
                  return (
                    <article
                      key={t.id}
                      className={`kan-card ${isArchived ? "is-archived" : ""}`}
                      draggable={!meetingOn && !isArchived}
                      onDragStart={!meetingOn && !isArchived ? onDragStart(t.id) : undefined}
                    >
                      <div className="kan-card__top">
                        <div className="kan-card__titlewrap" style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div className="admin-avatar" aria-hidden>
                            {aUrl ? (
                              <img
                                src={encodeURI(aUrl)}
                                alt=""
                                onError={(e) => {
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) parent.innerHTML = `<span class="fallback">${initials(t.admin || "") || "?"}</span>`;
                                }}
                              />
                            ) : (
                              <span className="fallback">{initials(t.admin || "") || "?"}</span>
                            )}
                          </div>
                          <strong className="kan-card__title" title={t.titre}>{t.titre}</strong>
                        </div>
                        <div className="kan-card__actions">
                          {!isArchived ? (
                            <button className="btn danger icon" title="Archiver/Supprimer" onClick={()=>askArchiveDelete(t)}>🗑️</button>
                          ) : (
                            <button className="btn icon" title="Restaurer" onClick={()=>{
                              setRows(prev => prev.map(x => x.id===t.id ? ({...x, archived:false, archivedAt:null}) : x));
                            }}>↩️</button>
                          )}
                        </div>
                      </div>

                      <div className="kan-card__meta">
                        <span className="badge-prio" data-level={t.priorite}><span className="dot"></span>{t.priorite ?? "—"}</span>
                        <span className={`status-chip is-${toKey(t.statut)}`}><span className={`dot ${toKey(t.statut)}`}></span>{t.statut}</span>
                        {(t.avancement ?? 0) > 0 && <span className="prog-chip">{t.avancement}%</span>}
                      </div>

                      {quick && <p className="kan-card__quick">{quick}</p>}
                      {t.remarques && <div className="kan-card__notes one-line-ellipsis" title={t.remarques}>{t.remarques}</div>}
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

      {/* Datalist Admins pour la modale de création */}
      <datalist id="admins-list">
        {admins.map(a => <option key={a} value={a} />)}
      </datalist>

      {/* Modales */}
      <CreateTaskModal open={createOpen} onClose={()=>setCreateOpen(false)} onCreate={createTask} admins={admins} />
      <ArchiveDeleteDialog
        open={adOpen.open}
        title={adOpen.title ?? "cette tâche"}
        onArchive={doArchive}
        onDelete={doDelete}
        onCancel={()=>setAdOpen({open:false})}
      />
    </section>
  );
}
