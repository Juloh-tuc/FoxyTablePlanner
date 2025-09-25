import { useEffect, useMemo, useState } from "react";
import { seed } from "../data";
import type { Task, Statut, Etiquette } from "../types";
import "../styles/planner-common.css";
import "../styles/planner-table.css";
import "../styles/avatars.css"; // styles avatars (petites pastilles rondes)

import TaskDetailModal from "../components/TaskDetailModal";
import EditTaskModal from "../components/EditTaskModal";

/* =========================
   Constantes / Utils
   ========================= */
const STATUTS: Statut[] = ["Terminé", "En cours", "En attente", "Bloqué", "Pas commencé"];
const PRESET_TAGS: Etiquette[] = ["Web","Front-BO","Back-FO","Front-FO","Back-BO","API","Design","Mobile","Autre"];
const PRESET_ADMINS = ["Simon","Titouan","Léo","Myriam","Anaïs","Julie","Mohamed"];

const short = (iso?: string) => (iso ? iso.slice(0, 10) : "—");

const uniqueAdmins = (tasks: Task[]) =>
  Array.from(new Set(tasks.map((t) => t.admin).filter(Boolean))) as string[];

const slug = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-");

const prioClass = (p?: Task["priorite"]) =>
  p === "Faible" ? "prio-low" : p === "Élevé" ? "prio-high" : "prio-medium";

/* =========================
   Avatars — mapping exact → fichiers dans public/avatars
   ========================= */
const ADMIN_AVATARS: Record<string, string> = {
  "Julie": "Foxy_Julie.png",
  "Léo": "léo_foxy.png",
  "Mohamed": "mohamed_foxy.png",
  "Myriam": "myriam_foxy.png",
  "Simon": "simon_foxy.png",
  "Titouan": "titouan_foxy.png",
  // "Anaïs": "anais_foxy.png",
};

const initials = (name: string) =>
  (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

const avatarUrlFor = (name?: string | null) => {
  if (!name) return null;
  const file = ADMIN_AVATARS[name.trim()];
  return file ? `/avatars/${file}` : null;
};

/* =========================
   Props + états auxiliaires
   ========================= */
type PlannerTableProps = { readOnly?: boolean };
type ConfirmState = { open: boolean; taskId?: string; label?: string };

/* =========================
   Modales internes
   ========================= */
function ConfirmDialog3({
  open, title, message, onArchive, onDelete, onCancel,
}: {
  open: boolean; title: string; message: string;
  onArchive: () => void; onDelete: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="ft-modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="ft-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="ft-modal-title">{title}</h3>
        <p className="ft-modal-text">{message}</p>
        <div className="ft-modal-actions">
          <button className="ft-btn" onClick={onArchive}>Archiver</button>
          <button className="ft-btn danger" onClick={onDelete}>Supprimer</button>
          <button className="ft-btn ghost" onClick={onCancel}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

function ArchivedTasksModal({
  open, tasks, onRestore, onDelete, onClose,
}: {
  open: boolean; tasks: Task[]; onRestore: (taskId: string) => void;
  onDelete: (taskId: string) => void; onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [admin, setAdmin] = useState<string | "Tous">("Tous");

  const admins = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.admin).filter(Boolean))) as string[],
    [tasks]
  );

  const list = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return tasks
      .filter((t) => (admin === "Tous" ? true : t.admin === admin))
      .filter((t) => {
        const hay = `${t.titre} ${t.admin ?? ""} ${t.priorite ?? ""} ${t.bloque ?? ""} ${t.bloquePar ?? ""} ${(t.remarques ?? "")}`.toLowerCase();
        return qn ? hay.includes(qn) : true;
      })
      .sort((a, b) => (b.archivedAt || "").localeCompare(a.archivedAt || ""));
  }, [tasks, q, admin]);

  if (!open) return null;
  return (
    <div className="ft-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="ft-modal ft-lg" onClick={(e) => e.stopPropagation()}>
        <div className="ft-modal-header">
          <h3 className="ft-modal-title">Tâches archivées ({tasks.length})</h3>
          <button className="ft-icon-btn" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="ft-arch-toolbar">
          <div className="ft-input-wrap">
            <span className="ft-input-ico">🔎</span>
            <input
              className="ft-input"
              placeholder="Rechercher une tâche archivée…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select className="ft-select" value={admin} onChange={(e) => setAdmin(e.target.value as any)}>
            <option value="Tous">Tous les admins</option>
            {admins.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className="ft-arch-list">
          {list.length ? list.map((t) => (
            <div key={t.id} className="ft-arch-item">
              <div className="ft-arch-main">
                <div className="ft-arch-title">{t.titre}</div>
                <div className="ft-arch-meta">
                  <span>{t.admin ?? "—"}</span>
                  <span>•</span>
                  <span className={`badge badge-${slug(t.statut)}`}>{t.statut}</span>
                  <span>•</span>
                  <span>Archivé le {short(t.archivedAt ?? undefined)}</span>
                </div>
              </div>
              <div className="ft-arch-actions">
                <button className="ft-btn" onClick={() => onRestore(t.id)}>Restaurer</button>
                <button className="ft-btn danger" onClick={() => onDelete(t.id)}>Supprimer</button>
              </div>
            </div>
          )) : <div className="ft-empty">Aucune tâche ne correspond.</div>}
        </div>

        <div className="ft-modal-actions end">
          <button className="ft-btn ghost" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Composant principal
   ========================= */
export default function PlannerTable({ readOnly = false }: PlannerTableProps) {
  const [tasks, setTasks] = useState<Task[]>(() => JSON.parse(JSON.stringify(seed)) as Task[]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Mode réunion
  const [meetingOn, setMeetingOn] = useState<boolean>(() => {
    try { return localStorage.getItem("planner.table.meeting") === "1"; } catch { return false; }
  });

  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const [archOpen, setArchOpen] = useState(false);

  // Inline edit
  const [editingAdminFor, setEditingAdminFor] = useState<string | null>(null);
  const [tempAdmin, setTempAdmin] = useState("");
  const [editingTitleFor, setEditingTitleFor] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");
  const [editingBlockedFor, setEditingBlockedFor] = useState<string | null>(null);
  const [tempBlocked, setTempBlocked] = useState("");
  const [editingBlockedByFor, setEditingBlockedByFor] = useState<string | null>(null);
  const [tempBlockedBy, setTempBlockedBy] = useState("");
  const [tagPickerFor, setTagPickerFor] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState<Etiquette[]>([]);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  // Ferme toutes les éditions quand readOnly OU meetingOn passent à true
  useEffect(() => {
    if (readOnly || meetingOn) {
      setEditingAdminFor(null);
      setEditingTitleFor(null);
      setEditingBlockedFor(null);
      setEditingBlockedByFor(null);
      setTagPickerFor(null);
    }
  }, [readOnly, meetingOn]);

  /* ====== Filtres ====== */
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState<Statut | "Tous">("Tous");
  const [admin, setAdmin] = useState<string | "Tous">("Tous");
  const [archFilter, setArchFilter] = useState<"actives" | "archivees" | "toutes">("actives");

  // Admins: presets + dynamiques, sans doublons
  const admins = useMemo(() => {
    const dyn = uniqueAdmins(tasks);
    return Array.from(new Set([...PRESET_ADMINS, ...dyn]));
  }, [tasks]);

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return tasks.filter((t) => {
      if (archFilter === "actives" && t.archived) return false;
      if (archFilter === "archivees" && !t.archived) return false;
      if (statut !== "Tous" && t.statut !== statut) return false;
      if (admin !== "Tous" && t.admin !== admin) return false;
      if (!qn) return true;
      const hay = [
        t.titre || "",
        t.admin || "",
        t.priorite || "",
        t.bloque || "",
        t.bloquePar || "",
        t.remarques || "",
        ...(t.etiquettes || []),
      ].join(" ").toLowerCase();
      return hay.includes(qn);
    });
  }, [tasks, q, statut, admin, archFilter]);

  const archivedList = useMemo(() => tasks.filter((t) => t.archived), [tasks]);

  /* ====== Actions ====== */
  const requestDeleteOrArchive = (taskId: string) => {
    if (readOnly || meetingOn) return;
    const t = tasks.find((x) => x.id === taskId);
    setConfirm({ open: true, taskId, label: t?.titre ?? "cette tâche" });
  };

  const archiveById = (taskId: string) => {
    setTasks((prev) =>
      prev.map((x) =>
        x.id === taskId ? { ...x, archived: true, archivedAt: new Date().toISOString() } : x
      )
    );
    if (selectedTaskId === taskId) setSelectedTaskId(null);
    setConfirm({ open: false });
  };

  const restoreById = (taskId: string) => {
    setTasks((prev) =>
      prev.map((x) => (x.id === taskId ? { ...x, archived: false, archivedAt: null } : x))
    );
  };

  const deleteById = (taskId: string) => {
    setTasks((prev) => prev.filter((x) => x.id !== taskId));
    if (selectedTaskId === taskId) setSelectedTaskId(null);
    setConfirm({ open: false });
  };

  const handleOpenDetailById = (taskId: string) => setSelectedTaskId(taskId);

  const handleOpenEditById = (taskId: string) => {
    if (readOnly || meetingOn) return;
    const t = tasks.find((x) => x.id === taskId);
    if (t) setEditingTask(t);
  };

  const handleSaveEdit = (updated: Task) => {
    const safeTitle = (updated.titre ?? "").slice(0, 80);
    const safeRemarks = (updated.remarques ?? "").slice(0, 250);
    const safeBlocked = (updated.bloque ?? "").slice(0, 200);
    const safeBlockedBy = (updated.bloquePar ?? "").slice(0, 200);
    setTasks((prev) =>
      prev.map((x) =>
        x.id === updated.id
          ? { ...x, ...updated, titre: safeTitle, remarques: safeRemarks, bloque: safeBlocked, bloquePar: safeBlockedBy }
          : x
      )
    );
    setEditingTask(null);
  };

  // Inline Admin
  const startEditAdmin = (t: Task) => {
    if (readOnly || meetingOn) return;
    setEditingAdminFor(t.id);
    setTempAdmin(t.admin || "");
  };
  const saveEditAdmin = () => {
    if (!editingAdminFor) return;
    setTasks((prev) =>
      prev.map((x) => (x.id === editingAdminFor ? { ...x, admin: tempAdmin.trim() } : x))
    );
    setEditingAdminFor(null);
    setTempAdmin("");
  };
  const cancelEditAdmin = () => {
    setEditingAdminFor(null);
    setTempAdmin("");
  };

  // Inline Titre
  const startEditTitle = (t: Task) => {
    if (readOnly || meetingOn) return;
    setEditingTitleFor(t.id);
    setTempTitle(t.titre || "");
  };
  const saveEditTitle = () => {
    if (!editingTitleFor) return;
    setTasks((prev) =>
      prev.map((x) => (x.id === editingTitleFor ? { ...x, titre: (tempTitle || "").slice(0, 80) } : x))
    );
    setEditingTitleFor(null);
    setTempTitle("");
  };
  const cancelEditTitle = () => {
    setEditingTitleFor(null);
    setTempTitle("");
  };

  // Inline Bloqué (raison)
  const startEditBlocked = (t: Task) => {
    if (readOnly || meetingOn) return;
    setEditingBlockedFor(t.id);
    setTempBlocked(t.bloque || "");
  };
  const saveEditBlocked = () => {
    if (!editingBlockedFor) return;
    setTasks((prev) =>
      prev.map((x) => (x.id === editingBlockedFor ? { ...x, bloque: (tempBlocked || "").slice(0, 200) } : x))
    );
    setEditingBlockedFor(null);
    setTempBlocked("");
  };
  const cancelEditBlocked = () => {
    setEditingBlockedFor(null);
    setTempBlocked("");
  };

  // Inline Bloqué par (qui/quoi)
  const startEditBlockedBy = (t: Task) => {
    if (readOnly || meetingOn) return;
    setEditingBlockedByFor(t.id);
    setTempBlockedBy(t.bloquePar || "");
  };
  const saveEditBlockedBy = () => {
    if (!editingBlockedByFor) return;
    setTasks((prev) =>
      prev.map((x) => (x.id === editingBlockedByFor ? { ...x, bloquePar: (tempBlockedBy || "").slice(0, 200) } : x))
    );
    setEditingBlockedByFor(null);
    setTempBlockedBy("");
  };
  const cancelEditBlockedBy = () => {
    setEditingBlockedByFor(null);
    setTempBlockedBy("");
  };

  // Tag picker
  const openTagPicker = (t: Task) => {
    if (readOnly || meetingOn) return;
    setTagPickerFor(t.id);
    setTagDraft(Array.isArray(t.etiquettes) ? [...t.etiquettes] : []);
  };
  const toggleDraftTag = (label: Etiquette) => {
    setTagDraft((prev) => (prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]));
  };
  const saveTags = () => {
    if (!tagPickerFor) { setTagDraft([]); return; }
    setTasks((prev) =>
      prev.map<Task>((x) => (x.id === tagPickerFor ? { ...x, etiquettes: [...tagDraft] } : x))
    );
    setTagPickerFor(null);
    setTagDraft([]);
  };
  const cancelTags = () => {
    setTagPickerFor(null);
    setTagDraft([]);
  };

  const wrapperClasses = [
    "page-wrap",
    "ft-wrap",
    "ft-fullbleed",
    meetingOn ? "meeting-on" : "",
    readOnly ? "is-readonly" : "",
  ].filter(Boolean).join(" ");

  /* =========================
     Rendu
     ========================= */
  return (
    <div className={wrapperClasses}>
      {/* Badge fixe en mode réunion */}
      {meetingOn && <div className="meeting-badge" aria-live="polite">Mode réunion ON</div>}

      {/* ===== Toolbar ===== */}
      <div className="ft-toolbar">
        <div className="ft-left">
          <button
            className={`ft-btn meeting-toggle ${meetingOn ? "is-on" : ""}`}
            onClick={() => {
              const next = !meetingOn;
              setMeetingOn(next);
              try { localStorage.setItem("planner.table.meeting", next ? "1" : "0"); } catch {}
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
              placeholder="Rechercher (titre, admin, étiquettes, remarques, blocages...)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={meetingOn}
              aria-disabled={meetingOn}
            />
          </div>

          <select className="ft-select" value={statut} onChange={(e) => setStatut(e.target.value as any)} disabled={meetingOn} aria-disabled={meetingOn}>
            <option value="Tous">Tous statuts</option>
            {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select className="ft-select" value={admin} onChange={(e) => setAdmin(e.target.value as any)} disabled={meetingOn} aria-disabled={meetingOn}>
            <option value="Tous">Tous admins</option>
            {admins.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          {/* Filtre Archivage */}
          <select className="ft-select" value={archFilter} onChange={(e) => setArchFilter(e.target.value as any)} disabled={meetingOn} aria-disabled={meetingOn}>
            <option value="actives">Actives</option>
            <option value="archivees">Archivées</option>
            <option value="toutes">Toutes</option>
          </select>
        </div>

        <div className="ft-right">
          <button className="ft-btn ghost" onClick={() => setArchOpen(true)} disabled={meetingOn}>
            Archivées <span className="ft-pill">{archivedList.length}</span>
          </button>
          <span className="ft-count">{filtered.length} tâches</span>
        </div>
      </div>

      {/* ===== Tableau ===== */}
      <div className="table-wrap">
        <table className="table ft-table">
          <thead>
            <tr>
              <th className="col-titre">Tâche</th>
              <th className="col-debut">Début</th>
              <th className="col-echeance">Échéance</th>
              <th className="col-admin">Admin</th>
              <th className="col-statut">Statut</th>
              <th className="col-priorite">Priorité</th>
              <th className="col-bloque">Bloqué (raison)</th>
              <th className="col-bloque-par">Bloqué par (qui/quoi)</th>
              <th className="col-etq">Étiquettes</th>
              <th className="col-remarques">Remarques</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const isEditingAdmin = editingAdminFor === t.id;
              const isEditingTitle = editingTitleFor === t.id;
              const isEditingBlocked = editingBlockedFor === t.id;
              const isEditingBlockedBy = editingBlockedByFor === t.id;
              const isTagOpen = tagPickerFor === t.id;

              const remarks = (t.remarques ?? "").toString();
              const tags = t.etiquettes ?? [];
              const rest = Math.max(tags.length - 3, 0);

              return (
                <tr key={t.id} aria-disabled={meetingOn}>
                  {/* Tâche (link + rename) */}
                  <td className="col-titre">
                    {!isEditingTitle ? (
                      <div className="title-cell">
                        <button
                          className="title-link"
                          onClick={() => handleOpenDetailById(t.id)}
                          aria-label={`Ouvrir détails pour « ${t.titre || "Tâche"} »`}
                        >
                          <span className="title-text">{t.titre || "—"}</span>
                          <span className="chev" aria-hidden>›</span>
                        </button>
                        <button
                          className="ft-btn icon rename-btn"
                          title="Renommer"
                          onClick={() => startEditTitle(t)}
                          disabled={readOnly || meetingOn}
                          aria-disabled={readOnly || meetingOn}
                        >
                          ✎
                        </button>
                      </div>
                    ) : (
                      <div className="title-editor">
                        <input
                          className="cell-input title-input"
                          value={tempTitle}
                          onChange={(e) => setTempTitle(e.target.value.slice(0, 80))}
                          placeholder="Nom de la tâche (max 80)"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEditTitle();
                            if (e.key === "Escape") cancelEditTitle();
                          }}
                          maxLength={80}
                        />
                        <div className="inline-actions">
                          <button className="ft-btn small" onClick={saveEditTitle}>OK</button>
                          <button className="ft-btn ghost small" onClick={cancelEditTitle}>Annuler</button>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Début / Échéance */}
                  <td className="col-debut">{short(t.debut)}</td>
                  <td className="col-echeance">{short(t.echeance)}</td>

                  {/* Admin (avatar + nom) */}
                  <td className="col-admin">
                    {!isEditingAdmin ? (
                      <button
                        className="admin-chip"
                        onClick={() => startEditAdmin(t)}
                        title="Modifier l'admin"
                        disabled={readOnly || meetingOn}
                        aria-disabled={readOnly || meetingOn}
                      >
                        <span className="admin-avatar" aria-hidden>
                          {avatarUrlFor(t.admin) ? (
                            <img
                              src={encodeURI(avatarUrlFor(t.admin)!)}
                              alt=""
                              onError={(e) => {
                                const parent = e.currentTarget.parentElement;
                                if (parent) parent.innerHTML = `<span class="fallback">${initials(t.admin || "") || "?"}</span>`;
                              }}
                            />
                          ) : (
                            <span className="fallback">{initials(t.admin || "") || "?"}</span>
                          )}
                        </span>
                        <span>{t.admin || "—"}</span>
                      </button>
                    ) : (
                      <div className="admin-edit">
                        <input
                          className="cell-input admin-input"
                          list="admins-list"
                          value={tempAdmin}
                          onChange={(e) => setTempAdmin(e.target.value)}
                          placeholder="Nouvel admin…"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEditAdmin();
                            if (e.key === "Escape") cancelEditAdmin();
                          }}
                        />
                        <div className="admin-edit-actions">
                          <button className="ft-btn small" onClick={saveEditAdmin}>OK</button>
                          <button className="ft-btn ghost small" onClick={cancelEditAdmin}>Annuler</button>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Statut */}
                  <td className="col-statut">
                    <span className={`badge badge-${slug(t.statut)}`}>{t.statut}</span>
                  </td>

                  {/* Priorité */}
                  <td className="col-priorite">
                    {t.priorite ? (
                      <span className={`prio-pill ${prioClass(t.priorite)}`}>{t.priorite}</span>
                    ) : "—"}
                  </td>

                  {/* Bloqué (raison) */}
                  <td className="col-bloque">
                    {!isEditingBlocked ? (
                      <div className="wrap bloque-par-cell">
                        <span title={t.bloque?.trim() || ""}>{t.bloque?.trim() || "—"}</span>
                        <button
                          className="ft-btn icon"
                          title="Modifier"
                          onClick={() => startEditBlocked(t)}
                          disabled={readOnly || meetingOn}
                          aria-disabled={readOnly || meetingOn}
                        >
                          ✎
                        </button>
                      </div>
                    ) : (
                      <div className="blockedby-editor">
                        <input
                          className="cell-input"
                          value={tempBlocked}
                          onChange={(e) => setTempBlocked(e.target.value)}
                          placeholder="Ex: En attente de specs / budget / validation..."
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEditBlocked();
                            if (e.key === "Escape") cancelEditBlocked();
                          }}
                          maxLength={200}
                        />
                        <div className="inline-actions">
                          <button className="ft-btn small" onClick={saveEditBlocked}>OK</button>
                          <button className="ft-btn ghost small" onClick={cancelEditBlocked}>Annuler</button>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Bloqué par (qui/quoi) */}
                  <td className="col-bloque-par">
                    {!isEditingBlockedBy ? (
                      <div className="wrap bloque-par-cell">
                        <span title={t.bloquePar?.trim() || ""}>{t.bloquePar?.trim() || "—"}</span>
                        <button
                          className="ft-btn icon"
                          title="Modifier"
                          onClick={() => startEditBlockedBy(t)}
                          disabled={readOnly || meetingOn}
                          aria-disabled={readOnly || meetingOn}
                        >
                          ✎
                        </button>
                      </div>
                    ) : (
                      <div className="blockedby-editor">
                        <input
                          className="cell-input"
                          value={tempBlockedBy}
                          onChange={(e) => setTempBlockedBy(e.target.value)}
                          placeholder="Ex: Maquettes (Léo) / API (Team Back)"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEditBlockedBy();
                            if (e.key === "Escape") cancelEditBlockedBy();
                          }}
                          maxLength={200}
                        />
                        <div className="inline-actions">
                          <button className="ft-btn small" onClick={saveEditBlockedBy}>OK</button>
                          <button className="ft-btn ghost small" onClick={cancelEditBlockedBy}>Annuler</button>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Étiquettes */}
                  <td className="col-etq wrap etq-cell">
                    {tags.length ? (
                      <div className="tags">
                        {tags.slice(0, 3).map((lbl) => <span key={lbl} className="tag">{lbl}</span>)}
                        {rest > 0 && <span className="tag">+{rest}</span>}
                      </div>
                    ) : "—"}
                    <button
                      className="tag-add"
                      title="Ajouter/retirer des étiquettes"
                      onClick={() => openTagPicker(t)}
                      disabled={readOnly || meetingOn}
                      aria-disabled={readOnly || meetingOn}
                    >
                      +
                    </button>

                    {isTagOpen && (
                      <div className="tag-popover" onClick={(e) => e.stopPropagation()}>
                        <div className="tag-popover-head">
                          <strong>Étiquettes</strong>
                          <button className="ft-icon-btn" onClick={cancelTags} aria-label="Fermer">✕</button>
                        </div>
                        <div className="tag-popover-list">
                          {PRESET_TAGS.map((lbl) => (
                            <label key={lbl} className="tag-option">
                              <input
                                type="checkbox"
                                checked={tagDraft.includes(lbl)}
                                onChange={() => toggleDraftTag(lbl)}
                              />
                              <span>{lbl}</span>
                            </label>
                          ))}
                        </div>
                        <div className="tag-popover-actions">
                          <button className="ft-btn small" onClick={saveTags}>Enregistrer</button>
                          <button className="ft-btn ghost small" onClick={cancelTags}>Annuler</button>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Remarques */}
                  <td className="col-remarques wrap" title={remarks}>
                    {remarks.length > 250 ? remarks.slice(0, 250) + "…" : remarks || "—"}
                  </td>

                  {/* Actions (différenciées selon archived) */}
                  <td className="col-actions">
                    <div className="ft-actions">
                      {!t.archived ? (
                        <>
                          <button
                            className="ft-btn primary"
                            onClick={() => handleOpenEditById(t.id)}
                            disabled={readOnly || meetingOn}
                            aria-disabled={readOnly || meetingOn}
                          >
                            ✏️ Éditer
                          </button>
                          <button className="ft-btn ghost" onClick={() => handleOpenDetailById(t.id)}>
                            ℹ️ Détails
                          </button>
                          <button
                            className="ft-btn danger ghost"
                            onClick={() => requestDeleteOrArchive(t.id)}
                            disabled={readOnly || meetingOn}
                            aria-disabled={readOnly || meetingOn}
                          >
                            🗑️ Supprimer
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="ft-btn" onClick={() => restoreById(t.id)} disabled={meetingOn} aria-disabled={meetingOn}>↩️ Restaurer</button>
                          <button className="ft-btn danger" onClick={() => deleteById(t.id)} disabled={meetingOn} aria-disabled={meetingOn}>🗑️ Supprimer</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="ft-empty">Aucune tâche à afficher avec ces filtres.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Datalist Admin : presets + dynamiques */}
      <datalist id="admins-list">
        {admins.map((a) => <option key={a} value={a} />)}
      </datalist>

      {/* ===== Modale Détail ===== */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onEdit={(taskId: string) => handleOpenEditById(taskId)}
          onDelete={(taskId: string) => requestDeleteOrArchive(taskId)}
        />
      )}

      {/* ===== Modale Édition ===== */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* ===== Confirm 3 choix ===== */}
      <ConfirmDialog3
        open={confirm.open}
        title="Que faire de cette tâche ?"
        message={`Voulez-vous archiver ou supprimer « ${confirm.label} » ?`}
        onArchive={() => confirm.taskId ? archiveById(confirm.taskId) : setConfirm({ open: false })}
        onDelete={() => confirm.taskId ? deleteById(confirm.taskId) : setConfirm({ open: false })}
        onCancel={() => setConfirm({ open: false })}
      />

      {/* ===== Modale Archivées ===== */}
      <ArchivedTasksModal
        open={archOpen}
        tasks={archivedList}
        onRestore={restoreById}
        onDelete={deleteById}
        onClose={() => setArchOpen(false)}
      />
    </div>
  );
}
