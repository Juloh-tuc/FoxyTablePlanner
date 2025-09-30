// src/pages/PlannerTable.tsx
import { useEffect, useMemo, useState } from "react";
import { seed } from "../data";
import type { Task, Statut, Etiquette } from "../types";

import "../styles/planner-common.css";
import "../styles/planner-table.css";
import "../styles/avatars.css";

import TaskDetailModal from "../components/TaskDetailModal";
import EditTaskModal from "../components/EditTaskModal";

/* =========================
   Constantes / Utils
   ========================= */
const STATUTS: Statut[] = ["Terminé", "En cours", "En attente", "Bloqué", "Pas commencé"];
const PRESET_TAGS: Etiquette[] = ["Web","Front-BO","Back-FO","Front-FO","Back-BO","API","Design","Mobile","Autre"];
const PRESET_ADMINS = ["Simon","Titouan","Léo","Myriam","Anaïs","Julie","Mohamed"];

const short = (iso?: string) => (iso ? iso.slice(0, 10) : "—");

const uniqueAdmins = (tasks: Task[]) => {
  const s = new Set<string>();
  tasks.forEach(t => {
    if (t.admin) s.add(t.admin);
    if (Array.isArray(t.assignees)) t.assignees.forEach(a => a && s.add(a));
  });
  return Array.from(s);
};

const slug = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    // @ts-ignore: unicode classes may not be supported in some TS configs
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-");

const prioClass = (p?: Task["priorite"]) =>
  p === "Faible" ? "prio-low" : p === "Élevé" ? "prio-high" : "prio-medium";

/* =========================
   Avatars
   ========================= */
const ADMIN_AVATARS: Record<string, string> = {
  Julie: "Foxy_Julie.png",
  Léo: "léo_foxy.png",
  Mohamed: "mohamed_foxy.png",
  Myriam: "myriam_foxy.png",
  Simon: "simon_foxy.png",
  Titouan: "titouan_foxy.png",
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
   Modales internes (confirm + archivées)
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
    () => Array.from(new Set(tasks.flatMap(t => [t.admin, ...(t.assignees ?? [])]).filter(Boolean))) as string[],
    [tasks]
  );

  const list = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return tasks
      .filter((t) => (admin === "Tous" ? true : t.admin === admin || (t.assignees ?? []).includes(admin)))
      .filter((t) => {
        const hay = `${t.titre} ${t.admin ?? ""} ${(t.assignees ?? []).join(" ")} ${t.priorite ?? ""} ${t.bloque ?? ""} ${t.bloquePar ?? ""} ${(t.remarques ?? "")}`.toLowerCase();
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
            <option value="Tous">Toutes personnes</option>
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
   Dépendances — helpers
   ========================= */
const byId = (tasks: Task[]) => Object.fromEntries(tasks.map((t) => [t.id, t]));
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

/** Une tâche peut-elle commencer ? => toutes ses deps sont "Terminé" */
const canStart = (t: Task, all: Task[]) => {
  const map = byId(all);
  const deps = t.dependsOn ?? [];
  if (!deps.length) return true;
  return deps.every((id) => map[id]?.statut === "Terminé");
};

/** Maintient la symétrie A.blocks ↔ B.dependsOn autour de la tâche mise à jour */
function syncGraph(all: Task[], updated: Task): Task[] {
  const map = new Map(all.map((t) => [t.id, { ...t }]));
  const u = { ...updated };
  u.dependsOn = uniq((u.dependsOn ?? []).filter((id) => id !== u.id));
  u.blocks = uniq((u.blocks ?? []).filter((id) => id !== u.id));

  // Nettoyage des liens obsolètes par rapport à u
  for (const t of map.values()) {
    if (t.id === u.id) continue;
    // si t.dependsOn contient u.id mais u ne bloque plus t => retire
    t.dependsOn = (t.dependsOn ?? []).filter((id) => !(id === u.id && !(u.blocks ?? []).includes(t.id)));
    // si t.blocks contient u.id mais u ne dépend plus de t => retire
    t.blocks = (t.blocks ?? []).filter((id) => !(id === u.id && !(u.dependsOn ?? []).includes(t.id)));
  }

  // Ajoute les nouveaux liens
  for (const bid of u.blocks ?? []) {
    const b = map.get(bid);
    if (b) b.dependsOn = uniq([...(b.dependsOn ?? []), u.id]);
  }
  for (const did of u.dependsOn ?? []) {
    const d = map.get(did);
    if (d) d.blocks = uniq([...(d.blocks ?? []), u.id]);
  }

  map.set(u.id, u);
  return Array.from(map.values());
}

/* =========================
   Composant principal
   ========================= */
export default function PlannerTable({ readOnly = false }: PlannerTableProps) {
  const [tasks, setTasks] = useState<Task[]>(() => JSON.parse(JSON.stringify(seed)) as Task[]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Mode réunion
  const [meetingOn, setMeetingOn] = useState<boolean>(() => {
    try { return localStorage.getItem("planner.table.meeting") === "1"; } catch { return false; }
  });

  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const [archOpen, setArchOpen] = useState(false);

  // Inline edit (titre)
  const [editingTitleFor, setEditingTitleFor] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");

  // Étiquettes
  const [tagPickerFor, setTagPickerFor] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState<Etiquette[]>([]);

  // Admin/personnes (nouveau design)
  const [peoplePickerFor, setPeoplePickerFor] = useState<string | null>(null);
  const [peopleDraft, setPeopleDraft] = useState<string[]>([]);
  const [adminDraft, setAdminDraft] = useState<string>(""); // radio admin
  const [peopleSearch, setPeopleSearch] = useState("");

  // Sélecteur “Bloque”
  const [blockPickerFor, setBlockPickerFor] = useState<string | null>(null);
  const [blockDraft, setBlockDraft] = useState<string[]>([]);
  const [blockSearch, setBlockSearch] = useState("");

  // Filtres
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState<Statut | "Tous">("Tous");
  const [adminSel, setAdminSel] = useState<string[]>([]);
  const [adminsOpen, setAdminsOpen] = useState(false);
  const [archFilter, setArchFilter] = useState<"actives" | "archivees" | "toutes">("actives");

  // Admins: presets + dynamiques
  const admins = useMemo(() => {
    const dyn = uniqueAdmins(tasks);
    return Array.from(new Set([...PRESET_ADMINS, ...dyn]));
  }, [tasks]);

  const toggleAdminFilter = (name: string) =>
    setAdminSel((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  const idMap = useMemo(() => byId(tasks), [tasks]);

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return tasks.filter((t) => {
      if (archFilter === "actives" && t.archived) return false;
      if (archFilter === "archivees" && !t.archived) return false;
      if (statut !== "Tous" && t.statut !== statut) return false;

      if (adminSel.length > 0) {
        const inAdmin = t.admin && adminSel.includes(t.admin);
        const inAssignees = (t.assignees ?? []).some(a => adminSel.includes(a));
        if (!inAdmin && !inAssignees) return false;
      }

      if (!qn) return true;
      const hay = [
        t.titre || "",
        t.admin || "",
        ...(t.assignees ?? []),
        t.priorite || "",
        t.bloque || "",
        t.bloquePar || "",
        t.remarques || "",
        ...(t.etiquettes || []),
      ].join(" ").toLowerCase();
      return hay.includes(qn);
    });
  }, [tasks, q, statut, adminSel, archFilter]);

  const archivedList = useMemo(() => tasks.filter((t) => t.archived), [tasks]);

  // Fermer les popovers en RO/meeting
  useEffect(() => {
    if (readOnly || meetingOn) {
      setEditingTitleFor(null);
      setTagPickerFor(null);
      setPeoplePickerFor(null);
      setBlockPickerFor(null);
    }
  }, [readOnly, meetingOn]);

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

    const tmp: Task = { ...updated, titre: safeTitle, remarques: safeRemarks };

    // règle deps non terminées => statut Bloqué (sauf Terminé)
    const depsOk = canStart(tmp, tasks);
    if (!depsOk && tmp.statut !== "Terminé") {
      tmp.statut = "Bloqué";
    }

    setTasks((prev) => {
      const merged = prev.map((x) => (x.id === tmp.id ? { ...x, ...tmp } : x));
      return syncGraph(merged, { ...prev.find((x) => x.id === tmp.id)!, ...tmp });
    });
    setEditingTask(null);
  };

  // ====== Admins inline (nouveau design “pastilles + menu déroulant”) ======
  const openPeoplePicker = (t: Task) => {
    if (readOnly || meetingOn) return;
    const currentAssignees = Array.isArray(t.assignees) && t.assignees.length ? [...t.assignees] : (t.admin ? [t.admin] : []);
    setPeopleDraft(currentAssignees);
    setAdminDraft(t.admin ?? (currentAssignees[0] ?? ""));
    setPeopleSearch("");
    setPeoplePickerFor(t.id);
  };

  const toggleDraftPerson = (name: string) => {
    setPeopleDraft((prev) => {
      const has = prev.includes(name);
      const next = has ? prev.filter((n) => n !== name) : [...prev, name];
      // si l’admin a été décoché, déplacer adminDraft si besoin
      if (!has && !adminDraft) {
        setAdminDraft(name);
      }
      if (has && adminDraft === name) {
        setAdminDraft(next[0] ?? "");
      }
      return next;
    });
  };

  const savePeople = () => {
    if (!peoplePickerFor) return;
    const first = adminDraft || peopleDraft[0] || "";
    setTasks((prev) =>
      prev.map((x) =>
        x.id === peoplePickerFor
          ? { ...x, admin: first, assignees: [...new Set(peopleDraft.length ? peopleDraft : (first ? [first] : []))] }
          : x
      )
    );
    setPeoplePickerFor(null);
    setPeopleDraft([]);
    setAdminDraft("");
    setPeopleSearch("");
  };
  const cancelPeople = () => {
    setPeoplePickerFor(null);
    setPeopleDraft([]);
    setAdminDraft("");
    setPeopleSearch("");
  };

  // ====== Étiquettes ======
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

  // ====== BLOQUE (sélecteur de tâches) ======
  const openBlockPicker = (t: Task) => {
    if (readOnly || meetingOn) return;
    setBlockDraft([...(t.blocks ?? [])]); // ids
    setBlockSearch("");
    setBlockPickerFor(t.id);
  };
  const toggleDraftBlock = (targetId: string) => {
    setBlockDraft((prev) => (prev.includes(targetId) ? prev.filter(id => id !== targetId) : [...prev, targetId]));
  };
  const saveBlocks = () => {
    if (!blockPickerFor) return;
    setTasks((prev) => {
      const current = prev.find(x => x.id === blockPickerFor)!;
      const updated: Task = { ...current, blocks: uniq(blockDraft) };
      const merged = prev.map(x => x.id === updated.id ? updated : x);
      return syncGraph(merged, updated); // met à jour automatiquement dependsOn
    });
    setBlockPickerFor(null);
    setBlockDraft([]);
    setBlockSearch("");
  };
  const cancelBlocks = () => {
    setBlockPickerFor(null);
    setBlockDraft([]);
    setBlockSearch("");
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
              placeholder="Rechercher (titre, personnes, étiquettes, remarques, blocages...)"
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

          {/* === Filtre multi-admins (toolbar) === */}
          <div className="admin-filter">
            <button
              type="button"
              className={`ft-btn ${adminsOpen ? "is-open" : ""}`}
              onClick={() => !meetingOn && setAdminsOpen((v) => !v)}
              disabled={meetingOn}
              aria-expanded={adminsOpen}
              aria-haspopup="dialog"
              title="Filtrer par admins/assignees"
            >
              {adminSel.length === 0 ? "Toutes personnes" : `${adminSel.length} sélection(s)`}
              {adminSel.length > 0 && <span className="ft-pill">{adminSel.length}</span>}
              <span aria-hidden style={{marginLeft:6}}>▾</span>
            </button>

            {adminsOpen && (
              <div
                className="af-popover"
                role="dialog"
                aria-label="Filtre personnes"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="af-head">
                  <strong>Personnes</strong>
                  <div className="spacer" />
                  <button className="ft-btn small ghost" onClick={() => setAdminSel([])}>Aucun</button>
                  <button className="ft-btn small ghost" onClick={() => setAdminSel([...admins])}>Tous</button>
                  <button className="ft-icon-btn" aria-label="Fermer" onClick={() => setAdminsOpen(false)}>✕</button>
                </div>

                <div className="af-list">
                  {admins.map((a) => (
                    <label key={a} className="af-row">
                      <input
                        type="checkbox"
                        checked={adminSel.includes(a)}
                        onChange={() => toggleAdminFilter(a)}
                      />
                      <span>{a}</span>
                    </label>
                  ))}
                  {admins.length === 0 && <div className="ft-empty">Aucun nom détecté.</div>}
                </div>

                <div className="af-actions">
                  <button className="ft-btn small" onClick={() => setAdminsOpen(false)}>Fermer</button>
                  {adminSel.length > 0 && (
                    <button className="ft-btn small ghost" onClick={() => setAdminSel([])}>Effacer</button>
                  )}
                </div>
              </div>
            )}
          </div>

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
              <th className="col-bloque">Bloque</th>
              <th className="col-bloque-par">Bloqué par</th>
              <th className="col-etq">Étiquettes</th>
              <th className="col-remarques">Remarques</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const isEditingTitle = editingTitleFor === t.id;
              const isTagOpen = tagPickerFor === t.id;
              const isPeopleOpen = peoplePickerFor === t.id;
              const isBlockOpen = blockPickerFor === t.id;

              const remarks = (t.remarques ?? "").toString();
              const tags = t.etiquettes ?? [];

              const people = (t.assignees && t.assignees.length ? t.assignees : (t.admin ? [t.admin] : []));
              const adminName = t.admin || people[0] || "";
              const rest = Math.max(tags.length - 3, 0);

              // Choix pour “Bloque”
              const blockChoices = tasks
                .filter(x => !x.archived && x.id !== t.id)
                .filter(x => (x.titre || "").toLowerCase().includes(blockSearch.trim().toLowerCase()))
                .sort((a, b) => (a.titre || "").localeCompare(b.titre || ""));

              const blocksTitles = (t.blocks ?? []).map(id => idMap[id]?.titre).filter(Boolean) as string[];
              const dependsTitles = (t.dependsOn ?? []).map(id => idMap[id]?.titre).filter(Boolean) as string[];

              // Pastilles (avatars) à afficher
              const maxShown = 3;
              const shown = people.slice(0, maxShown);
              const hiddenCount = Math.max(people.length - maxShown, 0);

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
                          onClick={() => { if (!readOnly && !meetingOn) { setEditingTitleFor(t.id); setTempTitle(t.titre || ""); } }}
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
                            if (e.key === "Enter") {
                              setTasks(prev => prev.map(x => x.id === t.id ? { ...x, titre: (tempTitle || "").slice(0, 80) } : x));
                              setEditingTitleFor(null);
                              setTempTitle("");
                            }
                            if (e.key === "Escape") { setEditingTitleFor(null); setTempTitle(""); }
                          }}
                          maxLength={80}
                        />
                        <div className="inline-actions">
                          <button
                            className="ft-btn small"
                            onClick={() => {
                              setTasks(prev => prev.map(x => x.id === t.id ? { ...x, titre: (tempTitle || "").slice(0, 80) } : x));
                              setEditingTitleFor(null);
                              setTempTitle("");
                            }}
                          >
                            OK
                          </button>
                          <button className="ft-btn ghost small" onClick={() => { setEditingTitleFor(null); setTempTitle(""); }}>
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Début / Échéance */}
                  <td className="col-debut">{short(t.debut)}</td>
                  <td className="col-echeance">{short(t.echeance)}</td>

                  {/* Admin (pastilles + popover “menu déroulant”) */}
                  <td className="col-admin admin-cell">
                    <div className="avatar-stack" aria-label="Équipe assignée">
                      {/* Pastille Admin en premier */}
                      {adminName ? (
                        <button
                          className="pastille-btn"
                          title={`Admin: ${adminName}`}
                          onClick={() => openPeoplePicker(t)}
                          disabled={readOnly || meetingOn}
                        >
                          <span className={`pastille ${t.admin ? "is-admin" : ""}`}>
                            {(() => {
                              const url = avatarUrlFor(adminName);
                              return url ? (
                                // eslint-disable-next-line jsx-a11y/alt-text
                                <img
                                  src={encodeURI(url)}
                                  onError={(e) => {
                                    const parent = e.currentTarget.parentElement;
                                    if (parent) parent.innerHTML = `<span class="fallback">${initials(adminName) || "?"}</span>`;
                                  }}
                                />
                              ) : (
                                <span className="fallback">{initials(adminName) || "?"}</span>
                              );
                            })()}
                            <span className="admin-crown" aria-hidden>★</span>
                          </span>
                        </button>
                      ) : (
                        <button
                          className="pastille-btn"
                          title="Choisir des personnes"
                          onClick={() => openPeoplePicker(t)}
                          disabled={readOnly || meetingOn}
                        >
                          <span className="pastille empty">+</span>
                        </button>
                      )}

                      {/* Autres pastilles (jusqu’à 2) */}
                      {shown
                        .filter(n => n !== adminName)
                        .map((name, i) => (
                          <button
                            key={`${name}-${i}`}
                            className="pastille-btn"
                            title={name}
                            onClick={() => openPeoplePicker(t)}
                            disabled={readOnly || meetingOn}
                          >
                            <span className="pastille">
                              {(() => {
                                const url = avatarUrlFor(name);
                                return url ? (
                                  // eslint-disable-next-line jsx-a11y/alt-text
                                  <img
                                    src={encodeURI(url)}
                                    onError={(e) => {
                                      const parent = e.currentTarget.parentElement;
                                      if (parent) parent.innerHTML = `<span class="fallback">${initials(name) || "?"}</span>`;
                                    }}
                                  />
                                ) : (
                                  <span className="fallback">{initials(name) || "?"}</span>
                                );
                              })()}
                            </span>
                          </button>
                        ))}

                      {/* +N */}
                      {hiddenCount > 0 && (
                        <button
                          className="pastille-btn"
                          title={`+${hiddenCount} autre(s)`}
                          onClick={() => openPeoplePicker(t)}
                          disabled={readOnly || meetingOn}
                        >
                          <span className="pastille more">+{hiddenCount}</span>
                        </button>
                      )}
                    </div>

                    {/* Popover menu déroulant */}
                    {isPeopleOpen && (
                      <div className="pp-popover slim" role="dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="pp-head">
                          <strong>Personnes</strong>
                          <input
                            className="pp-search"
                            placeholder="Rechercher…"
                            value={peopleSearch}
                            onChange={(e) => setPeopleSearch(e.target.value)}
                          />
                          <div className="spacer" />
                          <button className="ft-btn small ghost" onClick={() => { setPeopleDraft([]); setAdminDraft(""); }}>
                            Aucun
                          </button>
                          <button className="ft-btn small ghost" onClick={() => { setPeopleDraft([...admins]); if (admins.length) setAdminDraft(admins[0]); }}>
                            Tous
                          </button>
                          <button className="ft-icon-btn" aria-label="Fermer" onClick={cancelPeople}>✕</button>
                        </div>

                        <div className="pp-list">
                          {admins
                            .filter(a => a.toLowerCase().includes(peopleSearch.trim().toLowerCase()))
                            .map((a) => (
                              <label key={a} className="pp-row">
                                <input
                                  type="checkbox"
                                  checked={peopleDraft.includes(a)}
                                  onChange={() => toggleDraftPerson(a)}
                                  aria-label={`Assigner ${a}`}
                                />
                                <span className="opt-avatar">
                                  {avatarUrlFor(a) ? (
                                    // eslint-disable-next-line jsx-a11y/alt-text
                                    <img src={encodeURI(avatarUrlFor(a)!)} />
                                  ) : (
                                    <span className="fallback">{initials(a) || "?"}</span>
                                  )}
                                </span>
                                <span className="opt-name">{a}</span>
                                <span className="spacer" />
                                <label className="opt-admin-radio" title="Définir admin">
                                  <input
                                    type="radio"
                                    name={`admin-radio-${peoplePickerFor}`}
                                    checked={adminDraft === a}
                                    onChange={() => {
                                      if (!peopleDraft.includes(a)) setPeopleDraft(prev => [...prev, a]);
                                      setAdminDraft(a);
                                    }}
                                  />
                                  <span className="opt-admin-label">Admin</span>
                                </label>
                              </label>
                          ))}
                          {admins.length === 0 && (
                            <div className="ft-empty">Aucun résultat…</div>
                          )}
                        </div>

                        <div className="pp-actions">
                          <button className="ft-btn small" onClick={savePeople}>Enregistrer</button>
                          <button className="ft-btn ghost small" onClick={cancelPeople}>Annuler</button>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Statut */}
                  <td className="col-statut">
                    <span className={`badge badge-${slug(t.statut)}`}>{t.statut}</span>
                    {!canStart(t, tasks) && t.statut !== "Terminé" && (
                      <span className="dep-warn" title="Dépendances non terminées"> ⛓️</span>
                    )}
                  </td>

                  {/* Priorité */}
                  <td className="col-priorite">
                    {t.priorite ? (
                      <span className={`prio-pill ${prioClass(t.priorite)}`}>{t.priorite}</span>
                    ) : "—"}
                  </td>

                  {/* Bloque (sélecteur) */}
                  <td className="col-bloque">
                    <button
                      className="ft-btn"
                      onClick={() => openBlockPicker(t)}
                      disabled={readOnly || meetingOn}
                      aria-disabled={readOnly || meetingOn}
                      title="Choisir quelles tâches sont bloquées par celle-ci"
                    >
                      {blocksTitles.length
                        ? blocksTitles.slice(0, 2).join(", ") + (blocksTitles.length > 2 ? ` +${blocksTitles.length - 2}` : "")
                        : "—"}
                    </button>

                    {isBlockOpen && (
                      <div className="pp-popover" role="dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="pp-head">
                          <strong>Bloque</strong>
                          <input
                            className="pp-search"
                            placeholder="Rechercher une tâche…"
                            value={blockSearch}
                            onChange={(e) => setBlockSearch(e.target.value)}
                          />
                          <div className="spacer" />
                          <button className="ft-icon-btn" aria-label="Fermer" onClick={cancelBlocks}>✕</button>
                        </div>

                        <div className="pp-list">
                          {blockChoices.map((opt) => (
                            <label key={opt.id} className="pp-row">
                              <input
                                type="checkbox"
                                checked={blockDraft.includes(opt.id)}
                                onChange={() => toggleDraftBlock(opt.id)}
                              />
                              <span className="opt-name">{opt.titre || "—"}</span>
                              <span style={{ marginLeft: "auto" }} className="badge">{opt.statut}</span>
                            </label>
                          ))}
                          {blockChoices.length === 0 && <div className="ft-empty">Aucun résultat…</div>}
                        </div>

                        <div className="pp-actions">
                          <button className="ft-btn small" onClick={saveBlocks}>Enregistrer</button>
                          <button className="ft-btn ghost small" onClick={cancelBlocks}>Annuler</button>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Bloqué par (lecture seule, à partir de dependsOn) */}
                  <td className="col-bloque-par" title={dependsTitles.join(", ") || ""}>
                    {dependsTitles.length ? dependsTitles.join(", ") : "—"}
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

                  {/* Actions */}
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
          open={true}
          task={editingTask}
          admins={admins}
          tasks={tasks}
          onSave={handleSaveEdit}
          onClose={() => setEditingTask(null)}
          onAskArchiveDelete={(t) => {
            setEditingTask(null);
            setConfirm({ open: true, taskId: t.id, label: t.titre ?? "cette tâche" });
          }}
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
