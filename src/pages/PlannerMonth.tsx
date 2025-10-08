// src/pages/PlannerMonth.tsx
import { useMemo, useState, useEffect } from "react";
import type { Task, Statut, Etiquette } from "../types";
import { S } from "../types";

import "../styles/planner-month.css";
import "../styles/avatars.css";
import "../styles/admin-cell.css";
import "../styles/planner-common.css";

// Modales existantes (comme dans PlannerTable)
import TaskDetailModal from "../components/TaskDetailModal";
import EditTaskModal from "../components/EditTaskModal";
import AddTaskModal from "../components/AddTaskModal";

// API front (localStorage)
import {
  fetchActiveTasks,
  fetchArchivedTasks,
  onTasksChanged,
  upsertTask,
  patchTask,
} from "../api";

/* =============== Helpers =============== */
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const mondayIndex = (jsDay: number) => (jsDay + 6) % 7;

type DayCell = { date: string; inMonth: boolean; isToday: boolean };

const STATUTS: Statut[] = ["Pas commencé", "En cours", "En attente", "Bloqué", "Terminé"];

const initials = (name: string) =>
  (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

// Couleur stable par personne (0..9 pour matcher .color-h0..h9 dans le CSS)
const colorIndexFor = (name: string) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 10;
};

/** Avatars dispo dans /public/avatars (optionnel) */
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

/* =============== Modale Day Bucket (liste jour/personne) =============== */
function DayBucketModal({
  open,
  date,
  person,
  tasks,
  onClose,
  onEdit,
  onDetails,
}: {
  open: boolean;
  date: string;
  person: string;
  tasks: Task[];
  onClose: () => void;
  onEdit: (t: Task) => void;
  onDetails: (t: Task) => void;
}) {
  if (!open) return null;
  const titleDate = new Date(date + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="ft-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="ft-modal ft-lg" onClick={(e) => e.stopPropagation()}>
        <div className="ft-modal-header">
          <h3 className="ft-modal-title">
            {person} — {titleDate}
          </h3>
          <button className="ft-icon-btn" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="ft-list">
          {tasks.length ? (
            tasks
              .sort((a, b) => (a.titre || "").localeCompare(b.titre || ""))
              .map((t) => (
                <div key={t.id} className="ft-arch-item">
                  <div className="ft-arch-main">
                    <div className="ft-arch-title">{t.titre || "—"}</div>
                    <div className="ft-arch-meta">
                      <span className={`badge`} style={{ marginRight: 8 }}>{t.statut}</span>
                      <span>{t.priorite ?? "—"}</span>
                      <span>•</span>
                      <span>{t.debut ?? "—"} → {t.echeance ?? "—"}</span>
                      {t.etiquettes?.length ? (<><span>•</span><span>{t.etiquettes.join(", ")}</span></>) : null}
                    </div>
                  </div>
                  <div className="ft-arch-actions">
                    <button className="ft-btn" onClick={() => onEdit(t)}>Éditer</button>
                    <button className="ft-btn ghost" onClick={() => onDetails(t)}>Détails</button>
                  </div>
                </div>
              ))
          ) : (
            <div className="ft-empty">Aucune tâche pour ce jour.</div>
          )}
        </div>

        <div className="ft-modal-actions end">
          <button className="ft-btn ghost" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

/* =============== Page =============== */
export default function PlannerMonth() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cursor, setCursor] = useState<Date>(new Date());

  // Modales globales
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<Partial<Task> | null>(null);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Day bucket (clic sur pastille personne)
  const [bucketOpen, setBucketOpen] = useState(false);
  const [bucketDate, setBucketDate] = useState<string>("");
  const [bucketPerson, setBucketPerson] = useState<string>("");

  // Mode réunion
  const [meeting, setMeeting] = useState<boolean>(() => {
    try { return localStorage.getItem("planner.month.meeting") === "1"; } catch { return false; }
  });
  const toggleMeeting = () => {
    setMeeting((v) => {
      const next = !v;
      try { localStorage.setItem("planner.month.meeting", next ? "1" : "0"); } catch {}
      return next;
    });
  };

  // Plein écran bord à bord
  const [fullBleed, setFullBleed] = useState<boolean>(false);

  // Ping visuel “aujourd’hui”
  const [pingToday, setPingToday] = useState(false);
  useEffect(() => {
    if (!pingToday) return;
    const id = setTimeout(() => setPingToday(false), 1200);
    return () => clearTimeout(id);
  }, [pingToday]);

  // Chargement initial
  useEffect(() => {
    (async () => {
      try {
        const [actives, archived] = await Promise.all([fetchActiveTasks(), fetchArchivedTasks()]);
        setTasks([...actives, ...archived]);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Sync multi-onglets
  useEffect(() => {
    const off = onTasksChanged(async () => {
      const [actives, archived] = await Promise.all([fetchActiveTasks(), fetchArchivedTasks()]);
      setTasks([...actives, ...archived]);
    });
    return off;
  }, []);

  /* ----- Grille du mois ----- */
  const days: DayCell[] = useMemo(() => {
    const s = startOfMonth(cursor);
    const e = endOfMonth(cursor);
    const sIdx = mondayIndex(s.getDay());
    const eIdx = mondayIndex(e.getDay());

    const first = new Date(s);
    first.setDate(s.getDate() - sIdx);

    const last = new Date(e);
    last.setDate(e.getDate() + (6 - eIdx));

    const out: DayCell[] = [];
    const cur = new Date(first);
    const todayStr = fmt(new Date());
    while (cur <= last) {
      const dstr = fmt(cur);
      out.push({
        date: dstr,
        inMonth: cur.getMonth() === cursor.getMonth(),
        isToday: dstr === todayStr,
      });
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [cursor]);

  /* ----- Filtres ----- */
  const admins = useMemo(
    () => Array.from(new Set(tasks.map((r) => r.admin).filter(Boolean))) as string[],
    [tasks]
  );
  const [q, setQ] = useState("");
  const [fAdmin, setFAdmin] = useState<string | "Tous">("Tous");
  const [fStatut, setFStatut] = useState<Statut | "Tous">("Tous");
  const [showArchived, setShowArchived] = useState(false);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return tasks.filter((t) => {
      if (!showArchived && t.archived) return false;
      if (fAdmin !== "Tous" && t.admin !== fAdmin) return false;
      if (fStatut !== "Tous" && t.statut !== fStatut) return false;
      if (!text) return true;
      const hay = [t.titre, t.admin, t.priorite ?? "", t.remarques ?? "", ...(t.etiquettes ?? [])]
        .join(" ")
        .toLowerCase();
      return hay.includes(text);
    });
  }, [tasks, q, fAdmin, fStatut, showArchived]);

  /* ----- Répartition Jour -> Personne -> {count, tasks[]} ----- */
  const dayPeople = useMemo(() => {
    const map = new Map<string, Map<string, { count: number; tasks: Task[] }>>();
    const push = (iso: string, t: Task) => {
      if (!map.has(iso)) map.set(iso, new Map());
      const bucket = map.get(iso)!;
      const who = t.admin || "—";
      if (!bucket.has(who)) bucket.set(who, { count: 0, tasks: [] });
      const cell = bucket.get(who)!;
      cell.count += 1;
      cell.tasks.push(t);
    };
    filtered.forEach((t) => {
      if (t.debut && t.echeance) {
        let cur = new Date(t.debut);
        const end = new Date(t.echeance);
        while (cur <= end) {
          push(fmt(cur), t);
          cur.setDate(cur.getDate() + 1);
        }
      } else if (t.debut) push(t.debut, t);
      else if (t.echeance) push(t.echeance, t);
    });
    return map;
  }, [filtered]);

  /* ----- Actions rapides ----- */
  const goToday = () => {
    setCursor(new Date());
    setPingToday(true);
  };

  // Ouvre la modale d’ajout avec pré-remplissage (date / admin)
  const openAddFor = (dayISO: string, person?: string) => {
    if (meeting) return;
    setCreateDefaults({
      debut: dayISO,
      echeance: dayISO,
      admin: person ?? "",
      statut: S.PAS_COMMENCE,
    });
    setCreateOpen(true);
  };

  // Mise à jour locale d’une tâche après patch/save
  const mergeOne = (saved: Task) =>
    setTasks((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));

  /* ----- Render ----- */
  const monthLabel = cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const sectionClass = [
    "month-wrap",
    fullBleed && "month-fullbleed",
    meeting && "meeting-on",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={sectionClass}>
      {/* Titre */}
      <div className="month-title-row">
        <h2 className="title">{monthLabel}</h2>
      </div>

      {/* Toolbar */}
      <header className="month-toolbar">
        <div className="nav">
          <button
            className="btn"
            onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            title="Mois précédent"
          >
            ◀
          </button>
        </div>

        <div className="filters">
          <input
            className="flt flt-input"
            placeholder="Rechercher…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="flt" value={fAdmin} onChange={(e) => setFAdmin(e.target.value as any)}>
            <option value="Tous">Tous admins</option>
            {admins.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select className="flt" value={fStatut} onChange={(e) => setFStatut(e.target.value as any)}>
            <option value="Tous">Tous statuts</option>
            {STATUTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <label className="flt-check">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Archivées
          </label>

          <button className="btn today" onClick={goToday} title="Revenir à aujourd’hui">
            Aujourd’hui
          </button>

          {/* Toggle plein écran + mode réunion */}
          <button className="btn" onClick={() => setFullBleed((v) => !v)} title="Plein écran bord à bord">
            {fullBleed ? "Sortir du plein écran" : "Plein écran"}
          </button>
          <button
            className={`meeting-toggle ${meeting ? "is-on" : ""}`}
            onClick={toggleMeeting}
            title="Basculer Mode réunion"
          >
            <span className="mt-dot" />
            <span>{meeting ? "Mode réunion : ON" : "Mode réunion"}</span>
          </button>
        </div>

        <div className="nav">
          <button
            className="btn"
            onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            title="Mois suivant"
          >
            ▶
          </button>
        </div>
      </header>

      {/* ====== SCROLLER : entête + grille (scroll X sur mobile) ====== */}
      <div className="month-scroller">
        {/* En-têtes jours */}
        <div className="month-grid month-grid--head">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div key={d} className="day-head">
              {d}
            </div>
          ))}
        </div>

        {/* Grille */}
        <div className="month-grid">
          {days.map(({ date, inMonth, isToday }) => {
            const bucket = dayPeople.get(date) ?? new Map(); // Map<person, {count,tasks}>
            const entries = Array.from(bucket.entries());
            const dayNum = Number(date.slice(8, 10));
            const todayClass = isToday && pingToday ? " ping" : "";

            return (
              <div
                key={date}
                className={`day-cell${inMonth ? "" : " out"}${isToday ? " today" : ""}${todayClass}`}
              >
                <div className="day-num">{dayNum}</div>

                {entries.length > 0 && (
                  <div className="people-stack">
                    {entries.map(([person, info]) => {
                      const img = avatarUrlFor(person);
                      const colorClass = `color-h${colorIndexFor(person)}`;
                      return (
                        <button
                          key={person}
                          className={`person-chip ${colorClass}`}
                          title={`${person} — ${info.count} tâche(s)`}
                          disabled={meeting}
                          onClick={() => {
                            if (meeting) return;
                            setBucketDate(date);
                            setBucketPerson(person);
                            setBucketOpen(true);
                          }}
                        >
                          <span className="avatar">
                            {img ? (
                              <img src={encodeURI(img)} alt="" />
                            ) : (
                              <span className="fallback">{initials(person) || "?"}</span>
                            )}
                          </span>
                          <span className="person-name">{person}</span>
                          <span className="count-badge">{info.count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {!meeting && (
                  <button
                    className="btn add-btn"
                    onClick={() => openAddFor(date, entries.length === 1 ? entries[0][0] : undefined)}
                    title="Ajouter une tâche ce jour"
                  >
                    Ajouter
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== Modales ===== */}

      {/* Day bucket */}
      <DayBucketModal
        open={bucketOpen}
        date={bucketDate}
        person={bucketPerson}
        tasks={(dayPeople.get(bucketDate)?.get(bucketPerson)?.tasks ?? [])}
        onClose={() => setBucketOpen(false)}
        onEdit={(t) => { setBucketOpen(false); setEditingTask(t); }}
        onDetails={(t) => { setBucketOpen(false); setSelectedTaskId(t.id); }}
      />

      {/* Détails */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onEdit={(taskId: string) => {
            if (meeting) return;
            const t = tasks.find((x) => x.id === taskId);
            if (t) setEditingTask(t);
          }}
          onDelete={() => {
            // Ici, on n’archive/supprime pas directement depuis Month (garde la cohérence avec Table)
            setSelectedTaskId(null);
          }}
        />
      )}

      {/* Édition */}
      {editingTask && (
        <EditTaskModal
          open={true}
          task={editingTask}
          admins={admins}
          tasks={tasks}
          onSave={async (updated) => {
            // on sauvegarde puis remet dans le state
            const saved = (await patchTask(updated.id, updated)) as Task;
            mergeOne(saved);
            setEditingTask(null);
          }}
          onClose={() => setEditingTask(null)}
          onAskArchiveDelete={() => {
            // Si tu veux gérer l’archivage ici, fais-le comme dans PlannerTable
            setEditingTask(null);
          }}
        />
      )}

      {/* Ajout */}
      <AddTaskModal
        open={createOpen}
        admins={admins}
        tags={[] as Etiquette[]}
        onCreate={async (draft) => {
          // Pré-remplissage date/admin si fournis par le clic
          const merged = {
            ...draft,
            admin: (createDefaults?.admin ?? draft.admin) || "",
            debut: createDefaults?.debut ?? draft.debut,
            echeance: createDefaults?.echeance ?? draft.echeance,
            statut: draft.statut ?? (createDefaults?.statut as Statut) ?? S.PAS_COMMENCE,
          };
          const saved = (await upsertTask(merged)) as Task;
          setTasks((prev) => [saved, ...prev]);
          setCreateDefaults(null);
          setCreateOpen(false);
        }}
        onClose={() => { setCreateOpen(false); setCreateDefaults(null); }}
      />
    </section>
  );
}
