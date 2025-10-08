// src/pages/PlannerTable.tsx
import { useEffect, useMemo, useState } from "react";
import type { Task, Statut, Etiquette } from "../types";
import { S, STATUTS_ALL } from "../types";

import "../styles/planner-common.css";
import "../styles/planner-table.css";
import "../styles/admin-cell.css";
import "../styles/avatars.css";

import TaskDetailModal from "../components/TaskDetailModal";
import AddTaskModal from "../components/AddTaskModal";
import EditTaskModal from "../components/EditTaskModal";
import { useProjector } from "../hooks/useProjector";
import AdminCell from "../components/AdminCell";
import { canLink, wouldCreateCycle } from "../utils/deps";

// API front (localStorage)
import {
  fetchActiveTasks,
  fetchArchivedTasks,
  patchTask,
  archiveTask as apiArchive,
  restoreTask as apiRestore,
  onTasksChanged,
  upsertTask,
} from "../api";

/* =========================
   Types / Constantes
   ========================= */
type PlannerTableProps = { readOnly?: boolean };
type ConfirmState = { open: boolean; taskId?: string; label?: string };

const STATUTS: Statut[] = [...STATUTS_ALL];
const PRESET_TAGS: Etiquette[] = [
  "Web",
  "Front-BO",
  "Back-FO",
  "Front-FO",
  "Back-BO",
  "API",
  "Design",
  "Mobile",
  "Autre",
];
const PRESET_ADMINS = ["Simon", "Titouan", "Léo", "Myriam", "Anaïs", "Julie", "Mohamed"];

const short = (iso?: string | null) => (iso ? String(iso).slice(0, 10) : "—");

const uniqueAdmins = (tasks: Task[]) => {
  const s = new Set<string>();
  tasks.forEach((t) => {
    if (t.admin) s.add(t.admin);
    if (Array.isArray(t.assignees)) t.assignees.forEach((a) => a && s.add(a));
  });
  return Array.from(s);
};

const slug = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    // @ts-ignore
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-");

const prioClass = (p?: Task["priorite"]) =>
  p === "Faible" ? "prio-low" : p === "Élevé" ? "prio-high" : "prio-medium";

/* =========================
   Dialogues
   ========================= */
function ConfirmDialog3({
  open,
  title,
  message,
  onArchive,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onArchive: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="ft-modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="ft-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="ft-modal-title">{title}</h3>
        <p className="ft-modal-text">{message}</p>
        <div className="ft-modal-actions">
          <button className="ft-btn" onClick={onArchive}>
            Archiver
          </button>
          <button className="ft-btn ghost" onClick={onCancel}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

function ArchivedTasksModal({
  open,
  tasks,
  onRestore,
  onClose,
}: {
  open: boolean;
  tasks: Task[];
  onRestore: (taskId: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [admin, setAdmin] = useState<string | "Tous">("Tous");

  const admins = useMemo(
    () =>
      Array.from(
        new Set(tasks.flatMap((t) => [t.admin, ...(t.assignees ?? [])]).filter(Boolean))
      ) as string[],
    [tasks]
  );

  const list = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return tasks
      .filter((t) =>
        admin === "Tous" ? true : t.admin === admin || (t.assignees ?? []).includes(admin)
      )
      .filter((t) => {
        const hay = `${t.titre} ${t.admin ?? ""} ${(t.assignees ?? []).join(" ")} ${
          t.priorite ?? ""
        } ${t.remarques ?? ""}`.toLowerCase();
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
          <button className="ft-icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
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
          <select
            className="ft-select"
            value={admin}
            onChange={(e) => setAdmin(e.target.value as any)}
          >
            <option value="Tous">Toutes personnes</option>
            {admins.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="ft-arch-list">
          {list.length ? (
            list.map((t) => (
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
                  <button className="ft-btn" onClick={() => onRestore(t.id)}>
                    Restaurer
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="ft-empty">Aucune tâche ne correspond.</div>
          )}
        </div>

        <div className="ft-modal-actions end">
          <button className="ft-btn ghost" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Dépendances — helpers
   ========================= */
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

const canStart = (t: Task, all: Task[]) => {
  const map = new Map(all.map((x) => [x.id, x]));
  const deps = t.dependsOn ?? [];
  if (!deps.length) return true;
  return deps.every((id) => map.get(id)?.statut === S.TERMINE);
};

function syncGraph(all: Task[], updated: Task): Task[] {
  const map = new Map(all.map((t) => [t.id, { ...t }]));
  const u = { ...updated };
  u.dependsOn = uniq((u.dependsOn ?? []).filter((id) => id !== u.id));
  u.blocks = uniq((u.blocks ?? []).filter((id) => id !== u.id));

  // Nettoyage des liens croisés obsolètes
  for (const t of map.values()) {
    if (t.id === u.id) continue;
    t.dependsOn = (t.dependsOn ?? []).filter(
      (id) => !(id === u.id && !(u.blocks ?? []).includes(t.id))
    );
    t.blocks = (t.blocks ?? []).filter(
      (id) => !(id === u.id && !(u.dependsOn ?? []).includes(t.id))
    );
  }

  // Appliquer les miroirs à partir de u
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

/* Nettoyage global (domaine/policy + miroirs) */
function repairGraph(input: Task[]): Task[] {
  const map = new Map(input.map(t => [t.id, { ...t }]));
  const uniqLocal = <T,>(xs: T[]) => Array.from(new Set(xs));

  // 1) drop ids orphelins + liens interdits (domaine, policy)
  for (const t of map.values()) {
    const safeBlocks = (t.blocks ?? []).filter(id => map.has(id) && canLink(t, map.get(id)!).ok);
    const safeDeps   = (t.dependsOn ?? []).filter(id => map.has(id) && canLink(map.get(id)!, t).ok);
    t.blocks    = uniqLocal(safeBlocks.filter(id => id !== t.id));
    t.dependsOn = uniqLocal(safeDeps.filter(id => id !== t.id));
  }

  // 2) resync miroir (A.blocks -> B.dependsOn, et inversement)
  for (const t of map.values()) {
    for (const bId of t.blocks ?? []) {
      const b = map.get(bId); if (!b) continue;
      b.dependsOn = uniqLocal([...(b.dependsOn ?? []), t.id]);
    }
    for (const dId of t.dependsOn ?? []) {
      const d = map.get(dId); if (!d) continue;
      d.blocks = uniqLocal([...(d.blocks ?? []), t.id]);
    }
  }

  return Array.from(map.values());
}

/* Persistance multi-items (graph) */
async function persistGraphChanges(before: Task[], after: Task[]) {
  const beforeMap = new Map(before.map((t) => [t.id, t]));
  const patchPromises: Promise<any>[] = [];

  for (const t of after) {
    const b = beforeMap.get(t.id);
    if (!b) continue;
    if (JSON.stringify(b) !== JSON.stringify(t)) {
      const { id, ...payload } = t as any;
      patchPromises.push(patchTask(id, payload));
    }
  }
  try {
    await Promise.all(patchPromises);
  } catch (e) {
    console.error("persistGraphChanges:", e);
  }
}

/* =========================
   Ancrage popover
   ========================= */
function computeAnchor(e: any, popoverWidth = 420, popoverHeight = 360) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = r.left;
  if (left + popoverWidth > vw - 8) left = Math.max(8, vw - popoverWidth - 8);

  const spaceBelow = vh - r.bottom;
  const dir: "down" | "up" = spaceBelow >= popoverHeight + 12 ? "down" : "up";

  let top = dir === "down" ? r.bottom + 6 : r.top - popoverHeight - 6;
  if (top < 8) top = 8;
  if (top + popoverHeight > vh - 8) top = Math.max(8, vh - popoverHeight - 8);

  return { left, top, width: r.width, dir };
}

/* =========================
   Composant principal
   ========================= */
export default function PlannerTable({ readOnly = false }: PlannerTableProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // bouton Ajouter
  const [createOpen, setCreateOpen] = useState(false);

  // Mode réunion
  const [meetingOn, setMeetingOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem("planner.table.meeting") === "1";
    } catch {
      return false;
    }
  });
  useProjector(meetingOn);

  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const [archOpen, setArchOpen] = useState(false);

  // Inline edit (titre)
  const [editingTitleFor, setEditingTitleFor] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");

  // Étiquettes
  const [tagPickerFor, setTagPickerFor] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState<Etiquette[]>([]);
  const [newTag, setNewTag] = useState("");
  const [tagAnchor, setTagAnchor] = useState<{
    left: number;
    top: number;
    width: number;
    dir: "down" | "up";
  } | null>(null);

  // options d’étiquettes = presets + celles déjà utilisées
  const allTags = useMemo<Etiquette[]>(() => {
    const used = tasks.flatMap((t) => t.etiquettes ?? []);
    return Array.from(new Set<Etiquette>([...PRESET_TAGS, ...used]));
  }, [tasks]);

  // BLOQUE (éditeur)
  const [blockPickerFor, setBlockPickerFor] = useState<string | null>(null);
  const [blockDraft, setBlockDraft] = useState<string[]>([]);
  const [blockSearch, setBlockSearch] = useState("");
  const [blockAnchor, setBlockAnchor] = useState<{
    left: number;
    top: number;
    width: number;
    dir: "down" | "up";
  } | null>(null);

  // BLOQUÉ PAR (éditeur)
  const [depPickerFor, setDepPickerFor] = useState<string | null>(null);
  const [depDraft, setDepDraft] = useState<string[]>([]);
  const [depSearch, setDepSearch] = useState("");
  const [depAnchor, setDepAnchor] = useState<{
    left: number;
    top: number;
    width: number;
    dir: "down" | "up";
  } | null>(null);

  // Filtres
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState<Statut | "Tous">("Tous");
  const [adminSel, setAdminSel] = useState<string[]>([]);
  const [adminsOpen, setAdminsOpen] = useState(false);
  const [archFilter, setArchFilter] =
    useState<"actives" | "archivees" | "toutes">("actives");

  // Admins
  const admins = useMemo(() => {
    const dyn = uniqueAdmins(tasks);
    return Array.from(new Set([...PRESET_ADMINS, ...dyn]));
  }, [tasks]);

  const toggleAdminFilter = (name: string) =>
    setAdminSel((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );

  // Indices par id
  const idMapObj = useMemo(
    () => Object.fromEntries(tasks.map((t) => [t.id, t] as const)) as Record<string, Task>,
    [tasks]
  );
  const idMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  // Chargement initial + REPAIR GRAPH
  useEffect(() => {
    (async () => {
      try {
        const [actives, archived] = await Promise.all([
          fetchActiveTasks(),
          fetchArchivedTasks(),
        ]);
        const repaired = repairGraph([...actives, ...archived]);
        setTasks(repaired);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Sync cross-onglets + REPAIR GRAPH
  useEffect(() => {
    const off = onTasksChanged(async () => {
      const [actives, archived] = await Promise.all([
        fetchActiveTasks(),
        fetchArchivedTasks(),
      ]);
      const repaired = repairGraph([...actives, ...archived]);
      setTasks(repaired);
    });
    return off;
  }, []);

  // Fermer popovers si RO/meeting
  useEffect(() => {
    if (readOnly || meetingOn) {
      setEditingTitleFor(null);
      setTagPickerFor(null);
      setTagAnchor(null);
      setBlockPickerFor(null);
      setBlockAnchor(null);
      setDepPickerFor(null);
      setDepAnchor(null);
    }
  }, [readOnly, meetingOn]);

  // ---- ÉTIQUETTES : fermer sur Escape / resize (PAS sur scroll)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setTagPickerFor(null);
        setTagDraft([]);
        setTagAnchor(null);
      }
    }
    function onWinResize() {
      if (tagAnchor) {
        setTagPickerFor(null);
        setTagDraft([]);
        setTagAnchor(null);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onWinResize);

    // ✨ pas d'écouteur de scroll ici pour éviter la fermeture

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onWinResize);
    };
  }, [tagAnchor]);

  // Fermer "Bloqué par" sur Escape / resize / scroll (on garde le scroll ici)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDepPickerFor(null);
        setDepDraft([]);
        setDepAnchor(null);
      }
    }
    function onWinChange() {
      if (depAnchor) {
        setDepPickerFor(null);
        setDepDraft([]);
        setDepAnchor(null);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onWinChange);
    window.addEventListener("scroll", onWinChange, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onWinChange);
      window.removeEventListener("scroll", onWinChange, true);
    };
  }, [depAnchor]);

  // Filtrage
  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return tasks.filter((t) => {
      if (archFilter === "actives" && t.archived) return false;
      if (archFilter === "archivees" && !t.archived) return false;
      if (statut !== "Tous" && t.statut !== statut) return false;

      if (adminSel.length > 0) {
        const inAdmin = t.admin && adminSel.includes(t.admin);
        const inAssignees = (t.assignees ?? []).some((a) => adminSel.includes(a));
        if (!inAdmin && !inAssignees) return false;
      }

      if (!qn) return true;

      const blockTitles = (t.blocks ?? [])
        .map((id) => idMapObj[id]?.titre ?? "")
        .join(" ");
      const dependTitles = (t.dependsOn ?? [])
        .map((id) => idMapObj[id]?.titre ?? "")
        .join(" ");

      const hay = [
        t.titre || "",
        t.admin || "",
        ...(t.assignees ?? []),
        t.priorite || "",
        blockTitles,
        dependTitles,
        t.remarques || "",
        ...(t.etiquettes || []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(qn);
    });
  }, [tasks, q, statut, adminSel, archFilter, idMapObj]);

  const archivedList = useMemo(() => tasks.filter((t) => t.archived), [tasks]);

  /* =========================
     Rendu
     ========================= */
  const wrapperClasses = [
    "page-wrap",
    "ft-wrap",
    "ft-fullbleed",
    meetingOn ? "meeting-on" : "",
    readOnly ? "is-readonly" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClasses}>
      {meetingOn && (
        <div className="meeting-badge" aria-live="polite">
          Mode réunion ON
        </div>
      )}

      {/* Toolbar */}
      <div className="ft-toolbar">
        <div className="ft-left">
          <button
            className={`ft-btn meeting-toggle ${meetingOn ? "is-on" : ""}`}
            onClick={() => {
              const next = !meetingOn;
              setMeetingOn(next);
              try {
                localStorage.setItem("planner.table.meeting", next ? "1" : "0");
              } catch {}
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

          <select
            className="ft-select"
            value={statut}
            onChange={(e) => setStatut(e.target.value as Statut | "Tous")}
            disabled={meetingOn}
            aria-disabled={meetingOn}
          >
            <option value="Tous">Tous statuts</option>
            {STATUTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Filtre multi-admins */}
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
              {adminSel.length === 0
                ? "Toutes personnes"
                : `${adminSel.length} sélection(s)`}
              {adminSel.length > 0 && (
                <span className="ft-pill">{adminSel.length}</span>
              )}
              <span aria-hidden style={{ marginLeft: 6 }}>
                ▾
              </span>
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
                  <button className="ft-btn small ghost" onClick={() => setAdminSel([])}>
                    Aucun
                  </button>
                  <button
                    className="ft-btn small ghost"
                    onClick={() => setAdminSel([...admins])}
                  >
                    Tous
                  </button>
                  <button
                    className="ft-icon-btn"
                    aria-label="Fermer"
                    onClick={() => setAdminsOpen(false)}
                  >
                    ✕
                  </button>
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
                  {admins.length === 0 && (
                    <div className="ft-empty">Aucun nom détecté.</div>
                  )}
                </div>

                <div className="af-actions">
                  <button className="ft-btn small" onClick={() => setAdminsOpen(false)}>
                    Fermer
                  </button>
                  {adminSel.length > 0 && (
                    <button className="ft-btn small ghost" onClick={() => setAdminSel([])}>
                      Effacer
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filtre Archivage */}
          <select
            className="ft-select"
            value={archFilter}
            onChange={(e) => setArchFilter(e.target.value as any)}
            disabled={meetingOn}
            aria-disabled={meetingOn}
          >
            <option value="actives">Actives</option>
            <option value="archivees">Archivées</option>
            <option value="toutes">Toutes</option>
          </select>
        </div>

        <div className="ft-right">
          {/* ➕ Ajouter une tâche */}
          <button
            className="ft-btn ft-add-btn"
            onClick={() => setCreateOpen(true)}
            disabled={meetingOn || readOnly}
            title="Ajouter une tâche"
          >
            <span>Ajouter</span>
          </button>
          <button
            className="ft-btn ghost"
            onClick={() => setArchOpen(true)}
            disabled={meetingOn}
          >
            Archivées <span className="ft-pill">{archivedList.length}</span>
          </button>
          <span className="ft-count">{filtered.length} tâches</span>
        </div>
      </div>

      {/* Tableau */}
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

              const remarks = (t.remarques ?? "").toString();
              const tags = t.etiquettes ?? [];
              const rest = Math.max(tags.length - 3, 0);

              // Choix pour “Bloque” : on va créer t -> x
              const blockChoices = tasks
                .filter((x) => !x.archived && x.id !== t.id)
                .filter((x) => canLink(t, x).ok && !wouldCreateCycle(idMap, t.id, x.id))
                .filter((x) =>
                  (x.titre || "").toLowerCase().includes(blockSearch.trim().toLowerCase())
                )
                .sort((a, b) => (a.titre || "").localeCompare(b.titre || ""));

              // Choix pour “Bloqué par” : on va créer x -> t (inversé)
              const depChoices = tasks
                .filter((x) => !x.archived && x.id !== t.id)
                .filter((x) => canLink(x, t).ok && !wouldCreateCycle(idMap, x.id, t.id))
                .filter((x) =>
                  (x.titre || "").toLowerCase().includes(depSearch.trim().toLowerCase())
                )
                .sort((a, b) => (a.titre || "").localeCompare(b.titre || ""));

              const blocksTitles = (t.blocks ?? [])
                .map((id) => idMapObj[id]?.titre)
                .filter(Boolean) as string[];
              const dependsTitles = (t.dependsOn ?? [])
                .map((id) => idMapObj[id]?.titre)
                .filter(Boolean) as string[];

              return (
                <tr key={t.id} aria-disabled={meetingOn}>
                  {/* Tâche */}
                  <td className="col-titre">
                    {!isEditingTitle ? (
                      <div className="title-cell">
                        <button
                          className="title-link"
                          onClick={() => setSelectedTaskId(t.id)}
                          aria-label={`Ouvrir détails pour « ${t.titre || "Tâche"} »`}
                        >
                          <span className="title-text">{t.titre || "—"}</span>
                          <span className="chev" aria-hidden>
                            ›
                          </span>
                        </button>
                        <button
                          className="ft-btn icon rename-btn"
                          title="Renommer"
                          onClick={() => {
                            if (!readOnly && !meetingOn) {
                              setEditingTitleFor(t.id);
                              setTempTitle(t.titre || "");
                            }
                          }}
                          disabled={readOnly || meetingOn}
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
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              const newTitle = (tempTitle || "").slice(0, 80);
                              const next = (await patchTask(t.id, { titre: newTitle })) as Task;
                              setTasks((prev) =>
                                prev.map((x): Task => (x.id === t.id ? next : x))
                              );
                              setEditingTitleFor(null);
                              setTempTitle("");
                            }
                            if (e.key === "Escape") {
                              setEditingTitleFor(null);
                              setTempTitle("");
                            }
                          }}
                          maxLength={80}
                        />
                        <div className="inline-actions">
                          <button
                            className="ft-btn small"
                            onClick={async () => {
                              const newTitle = (tempTitle || "").slice(0, 80);
                              const next = (await patchTask(t.id, { titre: newTitle })) as Task;
                              setTasks((prev) =>
                                prev.map((x): Task => (x.id === t.id ? next : x))
                              );
                              setEditingTitleFor(null);
                              setTempTitle("");
                            }}
                          >
                            OK
                          </button>
                          <button
                            className="ft-btn ghost small"
                            onClick={() => {
                              setEditingTitleFor(null);
                              setTempTitle("");
                            }}
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Début / Échéance */}
                  <td className="col-debut">{short(t.debut)}</td>
                  <td className="col-echeance">{short(t.echeance)}</td>

                  {/* Admin */}
                  <td className="col-admin">
                    <AdminCell
                      admin={t.admin}
                      assignees={t.assignees}
                      options={admins}
                      disabled={readOnly || meetingOn}
                      onChange={async ({ admin, assignees }) => {
                        const next = (await patchTask(t.id, { admin, assignees })) as Task;
                        setTasks((prev) =>
                          prev.map((x): Task => (x.id === t.id ? next : x))
                        );
                      }}
                    />
                  </td>

                  {/* Statut */}
                  <td className="col-statut">
                    <span className={`badge badge-${slug(t.statut)}`}>{t.statut}</span>
                    {!canStart(t, tasks) && t.statut !== S.TERMINE && (
                      <span className="dep-warn" title="Dépendances non terminées">
                        {" "}
                        ⛓️
                      </span>
                    )}
                  </td>

                  {/* Priorité */}
                  <td className="col-priorite">
                    {t.priorite ? (
                      <span className={`prio-pill ${prioClass(t.priorite)}`}>
                        {t.priorite}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  {/* Bloque */}
                  <td className="col-bloque">
                    <button
                      className="ft-btn"
                      onClick={(e) => {
                        if (readOnly || meetingOn) return;
                        setBlockDraft([...(t.blocks ?? [])]);
                        setBlockSearch("");
                        setBlockPickerFor(t.id);
                        setBlockAnchor(computeAnchor(e, 420, 360));
                      }}
                      disabled={readOnly || meetingOn}
                      aria-disabled={readOnly || meetingOn}
                      title="Choisir quelles tâches sont bloquées par celle-ci"
                    >
                      {blocksTitles.length
                        ? blocksTitles.slice(0, 2).join(", ") +
                          (blocksTitles.length > 2 ? ` +${blocksTitles.length - 2}` : "")
                        : "—"}
                    </button>

                    {blockPickerFor === t.id && blockAnchor && (
                      <div
                        className={`pp-popover ${blockAnchor.dir === "up" ? "dir-up" : "dir-down"}`}
                        role="dialog"
                        onClick={(e) => e.stopPropagation()}
                        onWheel={(e) => e.stopPropagation()}
                        onScroll={(e) => e.stopPropagation()}
                        style={{ position: "fixed", left: blockAnchor.left, top: blockAnchor.top }}
                      >
                        <div className="pp-head">
                          <strong>Bloque</strong>
                          <input
                            className="pp-search"
                            placeholder="Rechercher une tâche…"
                            value={blockSearch}
                            onChange={(e) => setBlockSearch(e.target.value)}
                          />
                        </div>

                        <div className="pp-list">
                          {blockChoices.map((opt) => (
                            <label key={opt.id} className="pp-row">
                              <input
                                type="checkbox"
                                checked={blockDraft.includes(opt.id)}
                                onChange={() =>
                                  setBlockDraft((prev) =>
                                    prev.includes(opt.id)
                                      ? prev.filter((id) => id !== opt.id)
                                      : [...prev, opt.id]
                                  )
                                }
                              />
                              <span className="opt-name">{opt.titre || "—"}</span>
                              <span style={{ marginLeft: "auto" }} className="badge">
                                {opt.statut}
                              </span>
                            </label>
                          ))}
                          {blockChoices.length === 0 && (
                            <div className="ft-empty">
                              Aucun résultat autorisé (politique/anti-cycle).
                            </div>
                          )}
                        </div>

                        <div className="pp-actions sticky-actions">
                          <button
                            className="ft-btn small"
                            onClick={() => {
                              if (!blockPickerFor) return;

                              setTasks((prev) => {
                                const current = prev.find((x) => x.id === blockPickerFor);
                                if (!current) return prev;

                                // 1) Mettre à jour "blocks"
                                const updated: Task = { ...current, blocks: uniq(blockDraft) };

                                // 2) Synchroniser le graphe
                                const merged = syncGraph(prev, updated);

                                // 3) Ajuster les statuts selon les deps
                                const adjusted: Task[] = merged.map((task): Task => {
                                  if (
                                    task.statut !== S.TERMINE &&
                                    !canStart(task, merged) &&
                                    task.statut !== S.BLOQUE
                                  ) {
                                    return { ...task, statut: S.BLOQUE };
                                  }
                                  if (task.statut === S.BLOQUE && canStart(task, merged)) {
                                    return { ...task, statut: S.EN_ATTENTE };
                                  }
                                  return task;
                                });

                                // 4) Persister
                                persistGraphChanges(prev, adjusted).catch(console.error);

                                return adjusted;
                              });

                              // 5) Fermer
                              setBlockPickerFor(null);
                              setBlockDraft([]);
                              setBlockSearch("");
                              setBlockAnchor(null);
                            }}
                          >
                            Enregistrer
                          </button>

                          <button
                            className="ft-btn ghost small"
                            onClick={() => {
                              setBlockPickerFor(null);
                              setBlockDraft([]);
                              setBlockSearch("");
                              setBlockAnchor(null);
                            }}
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Bloqué par (ÉDITABLE) */}
                  <td className="col-bloque-par">
                    <button
                      className="ft-btn"
                      onClick={(e) => {
                        if (readOnly || meetingOn) return;
                        setDepDraft([...(t.dependsOn ?? [])]);
                        setDepSearch("");
                        setDepPickerFor(t.id);
                        setDepAnchor(computeAnchor(e, 420, 360));
                      }}
                      disabled={readOnly || meetingOn}
                      title="Choisir de quelles tâches celle-ci dépend"
                    >
                      {dependsTitles.length
                        ? dependsTitles.slice(0, 2).join(", ") +
                          (dependsTitles.length > 2 ? ` +${dependsTitles.length - 2}` : "")
                        : "—"}
                    </button>

                    {depPickerFor === t.id && depAnchor && (
                      <div
                        className={`pp-popover ${depAnchor.dir === "up" ? "dir-up" : "dir-down"}`}
                        role="dialog"
                        onClick={(e) => e.stopPropagation()}
                        onWheel={(e) => e.stopPropagation()}
                        onScroll={(e) => e.stopPropagation()}
                        style={{ position: "fixed", left: depAnchor.left, top: depAnchor.top }}
                      >
                        <div className="pp-head">
                          <strong>Bloqué par</strong>
                          <input
                            className="pp-search"
                            placeholder="Rechercher une tâche…"
                            value={depSearch}
                            onChange={(e) => setDepSearch(e.target.value)}
                          />
                        </div>

                        <div className="pp-list">
                          {depChoices.map((opt) => (
                            <label key={opt.id} className="pp-row">
                              <input
                                type="checkbox"
                                checked={depDraft.includes(opt.id)}
                                onChange={() =>
                                  setDepDraft((prev) =>
                                    prev.includes(opt.id)
                                      ? prev.filter((id) => id !== opt.id)
                                      : [...prev, opt.id]
                                  )
                                }
                              />
                              <span className="opt-name">{opt.titre || "—"}</span>
                              <span style={{ marginLeft: "auto" }} className="badge">
                                {opt.statut}
                              </span>
                            </label>
                          ))}
                          {depChoices.length === 0 && (
                            <div className="ft-empty">
                              Aucun résultat autorisé (politique/anti-cycle).
                            </div>
                          )}
                        </div>

                        <div className="pp-actions sticky-actions">
                          <button
                            className="ft-btn small"
                            onClick={() => {
                              if (!depPickerFor) return;

                              setTasks((prev) => {
                                const current = prev.find((x) => x.id === depPickerFor);
                                if (!current) return prev;

                                // 1) Mettre à jour "dependsOn"
                                const updated: Task = {
                                  ...current,
                                  dependsOn: uniq(depDraft),
                                };

                                // 2) Synchroniser le graphe (met à jour blocks côté inverse)
                                const merged = syncGraph(prev, updated);

                                // 3) Ajuster les statuts
                                const adjusted: Task[] = merged.map((task): Task => {
                                  if (
                                    task.statut !== S.TERMINE &&
                                    !canStart(task, merged) &&
                                    task.statut !== S.BLOQUE
                                  ) {
                                    return { ...task, statut: S.BLOQUE };
                                  }
                                  if (task.statut === S.BLOQUE && canStart(task, merged)) {
                                    return { ...task, statut: S.EN_ATTENTE };
                                  }
                                  return task;
                                });

                                // 4) Persister
                                persistGraphChanges(prev, adjusted).catch(console.error);

                                return adjusted;
                              });

                              // 5) Fermer
                              setDepPickerFor(null);
                              setDepDraft([]);
                              setDepSearch("");
                              setDepAnchor(null);
                            }}
                          >
                            Enregistrer
                          </button>
                          <button
                            className="ft-btn ghost small"
                            onClick={() => {
                              setDepPickerFor(null);
                              setDepDraft([]);
                              setDepSearch("");
                              setDepAnchor(null);
                            }}
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Étiquettes */}
                  <td className="col-etq wrap etq-cell">
                    {tags.length ? (
                      <div className="tags">
                        {tags.slice(0, 3).map((lbl) => (
                          <span key={lbl} className="tag">
                            {lbl}
                          </span>
                        ))}
                        {rest > 0 && <span className="tag">+{rest}</span>}
                      </div>
                    ) : (
                      "—"
                    )}
                    <button
                      className="tag-add"
                      title="Ajouter/retirer des étiquettes"
                      onClick={(e) => {
                        if (readOnly || meetingOn) return;
                        setTagPickerFor(t.id);
                        setTagDraft(Array.isArray(t.etiquettes) ? [...t.etiquettes] : []);
                        setTagAnchor(computeAnchor(e, 360, 320));
                      }}
                      disabled={readOnly || meetingOn}
                    >
                      +
                    </button>

                    {isTagOpen && tagPickerFor === t.id && tagAnchor && (
                      <div
                        className={`pp-popover slim ${tagAnchor.dir === "up" ? "dir-up" : "dir-down"}`}
                        role="dialog"
                        onClick={(e) => e.stopPropagation()}
                        onWheel={(e) => e.stopPropagation()}
                        onScroll={(e) => e.stopPropagation()}
                        style={{ position: "fixed", left: tagAnchor.left, top: tagAnchor.top }}
                      >
                        <div className="pp-head">
                          <strong>Étiquettes</strong>
                          <div className="spacer" />
                          <button
                            className="ft-icon-btn"
                            onClick={() => {
                              setTagPickerFor(null);
                              setTagDraft([]);
                              setNewTag("");
                              setTagAnchor(null);
                            }}
                            aria-label="Fermer"
                          >
                            ✕
                          </button>
                        </div>

                        <div style={{ display: "flex", gap: 8, padding: "6px 0 10px" }}>
                          <input
                            className="cell-input"
                            placeholder="Ajouter une étiquette (Ex: SEO, Urgent…)"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const v = newTag.trim();
                                if (!v) return;
                                setTagDraft((prev) =>
                                  Array.from(new Set([...prev, v as Etiquette]))
                                );
                                setNewTag("");
                              }
                            }}
                          />
                          <button
                            className="ft-btn"
                            type="button"
                            onClick={() => {
                              const v = newTag.trim();
                              if (!v) return;
                              setTagDraft((prev) =>
                                Array.from(new Set([...prev, v as Etiquette]))
                              );
                              setNewTag("");
                            }}
                          >
                            Ajouter
                          </button>
                        </div>

                        <div className="pp-list" style={{ maxHeight: 240 }}>
                          {allTags.map((lbl) => (
                            <label
                              key={lbl}
                              className="pp-row"
                              style={{ gridTemplateColumns: "auto 1fr auto" }}
                            >
                              <input
                                type="checkbox"
                                checked={tagDraft.includes(lbl)}
                                onChange={() =>
                                  setTagDraft((prev) =>
                                    prev.includes(lbl)
                                      ? prev.filter((x) => x !== lbl)
                                      : [...prev, lbl]
                                  )
                                }
                              />
                              <span>{lbl}</span>
                            </label>
                          ))}
                          {!allTags.length && (
                            <div className="ft-empty">Aucune étiquette.</div>
                          )}
                        </div>

                        <div className="pp-actions sticky-actions">
                          <button
                            className="ft-btn small"
                            onClick={async () => {
                              if (!tagPickerFor) {
                                setTagDraft([]);
                                return;
                              }
                              const next = (await patchTask(tagPickerFor, {
                                etiquettes: [...tagDraft],
                              })) as Task;
                              setTasks((prev) =>
                                prev.map((x): Task =>
                                  x.id === tagPickerFor ? next : x
                                )
                              );
                              setTagPickerFor(null);
                              setTagDraft([]);
                              setNewTag("");
                              setTagAnchor(null);
                            }}
                          >
                            Enregistrer
                          </button>
                          <button
                            className="ft-btn ghost small"
                            onClick={() => {
                              setTagPickerFor(null);
                              setTagDraft([]);
                              setNewTag("");
                              setTagAnchor(null);
                            }}
                          >
                            Annuler
                          </button>
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
                            onClick={() => {
                              if (readOnly || meetingOn) return;
                              const tt = tasks.find((x) => x.id === t.id);
                              if (tt) setEditingTask(tt);
                            }}
                            disabled={readOnly || meetingOn}
                          >
                            {" "}
                            Éditer
                          </button>
                        
                          <button
                            className="ft-btn danger ghost"
                            title="Archiver la tâche"
                            onClick={() => {
                              if (readOnly || meetingOn) return;
                              const tt = tasks.find((x) => x.id === t.id);
                              setConfirm({
                                open: true,
                                taskId: t.id,
                                label: tt?.titre ?? "cette tâche",
                              });
                            }}
                            disabled={readOnly || meetingOn}
                          >
                            {" "}
                            Archiver
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="ft-btn"
                            onClick={async () => {
                              const next = (await apiRestore(t.id)) as Task;
                              setTasks((prev) =>
                                prev.map((x): Task => (x.id === t.id ? next : x))
                              );
                            }}
                            disabled={meetingOn}
                          >
                            ↩️ Restaurer
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="ft-empty">
                  Aucune tâche à afficher avec ces filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Datalist Admin */}
      <datalist id="admins-list">
        {admins.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>

      {/* Modales */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onEdit={(taskId: string) => {
            if (readOnly || meetingOn) return;
            const t = tasks.find((x) => x.id === taskId);
            if (t) setEditingTask(t);
          }}
          onDelete={(taskId: string) => {
            if (readOnly || meetingOn) return;
            const t = tasks.find((x) => x.id === taskId);
            setConfirm({ open: true, taskId, label: t?.titre ?? "cette tâche" });
          }}
        />
      )}

      {editingTask && (
        <EditTaskModal
          open={true}
          task={editingTask}
          admins={admins}
          tasks={tasks}
          onSave={(updated) => {
            const safeTitle = (updated.titre ?? "").slice(0, 80);
            const safeRemarks = (updated.remarques ?? "").slice(0, 250);
            const tmp: Task = { ...updated, titre: safeTitle, remarques: safeRemarks };
            const depsOk = canStart(tmp, tasks);
            if (!depsOk && tmp.statut !== S.TERMINE) tmp.statut = S.BLOQUE;
            (async () => {
              const saved = (await patchTask(tmp.id, tmp)) as Task;
              setTasks((prev) => {
                const merged = prev.map((x): Task =>
                  x.id === saved.id ? ({ ...x, ...saved } as Task) : x
                );
                return syncGraph(
                  merged,
                  { ...(prev.find((x) => x.id === saved.id) as Task), ...saved }
                );
              });
            })();
            setEditingTask(null);
          }}
          onClose={() => setEditingTask(null)}
          onAskArchiveDelete={(t) => {
            setEditingTask(null);
            setConfirm({ open: true, taskId: t.id, label: t.titre ?? "cette tâche" });
          }}
        />
      )}

      {/* ➕ Ajout */}
      <AddTaskModal
        open={createOpen}
        admins={admins}
        tags={PRESET_TAGS}
        onCreate={async (draft) => {
          const saved = (await upsertTask(draft)) as Task;
          setTasks((prev) => [saved, ...prev]);
          setCreateOpen(false);
        }}
        onClose={() => setCreateOpen(false)}
      />

      <ConfirmDialog3
        open={confirm.open}
        title="Archiver la tâche"
        message={`Voulez-vous archiver « ${confirm.label} » ? (aucune suppression définitive)`}
        onArchive={async () => {
          if (!confirm.taskId) {
            setConfirm({ open: false });
            return;
          }
          const next = (await apiArchive(confirm.taskId)) as Task;
          setTasks((prev) => prev.map((x): Task => (x.id === next.id ? next : x)));
          setConfirm({ open: false });
        }}
        onCancel={() => setConfirm({ open: false })}
      />

      <ArchivedTasksModal
        open={archOpen}
        tasks={archivedList}
        onRestore={async (taskId) => {
          const next = (await apiRestore(taskId)) as Task;
          setTasks((prev) => prev.map((x): Task => (x.id === taskId ? next : x)));
        }}
        onClose={() => setArchOpen(false)}
      />
    </div>
  );
}
