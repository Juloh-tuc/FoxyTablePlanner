import { useMemo, useState, useEffect } from "react";
import { seed } from "../data";
import type { Task, Statut } from "../types";


import "../components/edit-task-modal.css";
import "../styles/planner-month.css";

import TaskDetailModal from "../components/TaskDetailModal";
import EditTaskModal from "../components/EditTaskModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";

/* ---------- Helpers ---------- */
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const mondayIndex = (jsDay: number) => (jsDay + 6) % 7;
type DayCell = { date: string; inMonth: boolean; isToday: boolean };
const uid = () => Math.random().toString(36).slice(2, 9);

const STATUTS: Statut[] = ["Pas commencé", "En cours", "En attente", "Bloqué", "Terminé"];

const initials = (name: string) =>
  (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

// couleur stable par personne (0..5)
const colorIndexFor = (name: string) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 6;
  return h;
};

/** Avatars dans /public/avatars */
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

/* ---------- Dialogs ---------- */
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
        <p className="ft-modal-text">Archiver (réversible) ou supprimer (définitif).</p>
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

function PersonDayModal({
  open,
  person,
  dateISO,
  tasks,
  meeting,
  onClose,
  onAddTask,
  onEdit,
  onDetail,
  onArchive,
  onDelete,
}: {
  open: boolean;
  person: string | null;
  dateISO: string | null;
  tasks: Task[];
  meeting: boolean;
  onClose: () => void;
  onAddTask: (person: string, dateISO: string) => void;
  onEdit: (id: string) => void;
  onDetail: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (!open || !person || !dateISO) return null;
  return (
    <div className="ft-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="ft-modal ft-lg" onClick={(e) => e.stopPropagation()}>
        <div className="ft-modal-header">
          <h3 className="ft-modal-title">
            {person} — {dateISO}
          </h3>
          <button className="ft-icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className="pm-list">
          {tasks.length ? (
            tasks.map((t) => (
              <div key={t.id} className="pm-item">
                <div className="pm-left">
                  <div className="pm-title" title={t.titre}>
                    {t.titre}
                  </div>
                  <div className="pm-meta">
                    <span className={`pm-chip is-${t.statut.replace(/\s+/g, "-").toLowerCase()}`}>{t.statut}</span>
                    {t.priorite && <span className="pm-chip prio">{t.priorite}</span>}
                    {t.remarques && (
                      <span className="pm-remarks one-line" title={t.remarques}>
                        {t.remarques}
                      </span>
                    )}
                  </div>
                </div>
                <div className="pm-actions">
                  <button className="ft-btn" onClick={() => onEdit(t.id)} disabled={meeting}>
                    Éditer
                  </button>
                  <button className="ft-btn ghost" onClick={() => onDetail(t.id)}>
                    Détails
                  </button>
                  <button className="ft-btn" onClick={() => onArchive(t.id)} disabled={meeting}>
                    Archiver
                  </button>
                  <button className="ft-btn danger" onClick={() => onDelete(t.id)} disabled={meeting}>
                    Supprimer
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="ft-empty">Aucune tâche pour {person} ce jour-là.</div>
          )}
        </div>

        <div className="ft-modal-actions end">
          <button
            className="ft-btn primary"
            onClick={() => onAddTask(person, dateISO)}
            disabled={meeting}
          >
            + Ajouter une tâche
          </button>
          <button className="ft-btn ghost" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function PlannerMonth() {
  const [rows, setRows] = useState<Task[]>(() => JSON.parse(JSON.stringify(seed)));
  const [cursor, setCursor] = useState<Date>(new Date());
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const confirm = useConfirm();

  // Meeting (léger thème + read-only)
  const [meeting, setMeeting] = useState<boolean>(() => {
    try {
      return localStorage.getItem("planner.month.meeting") === "1";
    } catch {
      return false;
    }
  });
  const toggleMeeting = () => {
    setMeeting((v) => {
      const next = !v;
      try {
        localStorage.setItem("planner.month.meeting", next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  // Ping visuel quand on clique "Aujourd'hui"
  const [pingToday, setPingToday] = useState(false);
  useEffect(() => {
    if (!pingToday) return;
    const id = setTimeout(() => setPingToday(false), 1200);
    return () => clearTimeout(id);
  }, [pingToday]);

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
      out.push({ date: dstr, inMonth: cur.getMonth() === cursor.getMonth(), isToday: dstr === todayStr });
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [cursor]);

  /* ----- Filtres ----- */
  const admins = useMemo(
    () => Array.from(new Set(rows.map((r) => r.admin).filter(Boolean))) as string[],
    [rows]
  );
  const [q, setQ] = useState("");
  const [fAdmin, setFAdmin] = useState<string | "Tous">("Tous");
  const [fStatut, setFStatut] = useState<Statut | "Tous">("Tous");
  const [showArchived, setShowArchived] = useState(false);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return rows.filter((t) => {
      if (!showArchived && t.archived) return false;
      if (fAdmin !== "Tous" && t.admin !== fAdmin) return false;
      if (fStatut !== "Tous" && t.statut !== fStatut) return false;
      if (!text) return true;
      const hay = [
        t.titre,
        t.admin,
        t.priorite ?? "",
        t.remarques ?? "",
        t.bloque ?? "",
        t.bloquePar ?? "",
        ...(t.etiquettes ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(text);
    });
  }, [rows, q, fAdmin, fStatut, showArchived]);

  /* ----- Jour → Personne → {count, tasks} ----- */
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

  /* ----- PersonDay Modal state ----- */
  const [personDay, setPersonDay] = useState<{
    open: boolean;
    person: string | null;
    dateISO: string | null;
  }>({ open: false, person: null, dateISO: null });

  /* ----- Archive / Delete ----- */
  const [adOpen, setAdOpen] = useState<{ open: boolean; id?: string; title?: string }>({ open: false });
  const askArchiveDeleteFor = (t: Task) => setAdOpen({ open: true, id: t.id, title: t.titre });
  const doArchive = () => {
    if (!adOpen.id) return;
    setRows((prev) =>
      prev.map((t) => (t.id === adOpen.id ? { ...t, archived: true, archivedAt: new Date().toISOString() } : t))
    );
    setAdOpen({ open: false });
  };
  const doDelete = () => {
    if (!adOpen.id) return;
    setRows((prev) => prev.filter((t) => t.id !== adOpen.id));
    setAdOpen({ open: false });
  };

  /* ----- CRUD ----- */
  const saveTask = (payload: Task) => {
    setRows((prev) => {
      const exists = prev.some((r) => r.id === payload.id);
      return exists ? prev.map((r) => (r.id === payload.id ? payload : r)) : [payload, ...prev];
    });
    setEditTask(null);
  };

  const quickNewForDay = (dayStr: string, person?: string) => {
    const draft: Task = {
      id: uid(),
      titre: "Nouvelle tâche",
      admin: person ?? (fAdmin !== "Tous" ? fAdmin : ""),
      statut: "Pas commencé",
      priorite: "Moyen",
      debut: dayStr,
      echeance: dayStr,
      avancement: 0,
      budget: 0,
      remarques: "",
      etiquettes: [],
    };
    setEditTask(draft);
  };

  /* ----- Render ----- */
  const monthLabel = cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const goToday = () => {
    setCursor(new Date());
    setPingToday(true);
  };

  return (
    <section className={`month-wrap ${meeting ? "meeting-on" : ""}`}>
      {/* Titre seul au-dessus */}
      <div className="month-title-row">
        <h2 className="title">{monthLabel}</h2>
      </div>

      {/* Barre d’actions en dessous (nav + filtres + toggle) */}
      <header className="month-toolbar">
        <div className="nav">
          <button className="btn" onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
            ◀
          </button>
          <button className="btn today" onClick={goToday} title="Revenir au mois actuel">
            Aujourd’hui
          </button>
          <button className="btn" onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
            ▶
          </button>
        </div>

        <div className="right">
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
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />{" "}
              Archivées
            </label>
          </div>

          <button
            className={`meeting-toggle ${meeting ? "is-on" : ""}`}
            onClick={toggleMeeting}
            title="Basculer Mode réunion"
          >
            <span className="mt-dot" />
            <span>{meeting ? "Mode réunion : ON" : "Mode réunion"}</span>
          </button>
        </div>
      </header>

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
          const entries = Array.from(bucket.entries()); // [person, info]
          const dayNum = Number(date.slice(8, 10));
          const todayClass = isToday && pingToday ? " ping" : "";

          return (
            <div key={date} className={`day-cell${inMonth ? "" : " out"}${isToday ? " today" : ""}${todayClass}`}>
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
                        onClick={() => setPersonDay({ open: true, person, dateISO: date })}
                        disabled={meeting}
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
                  className="btn tiny add-btn"
                  onClick={() => quickNewForDay(date, entries.length === 1 ? entries[0][0] : undefined)}
                  title="Ajouter une tâche"
                >
                  + Ajouter
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Person → Day modal */}
      <PersonDayModal
        open={personDay.open}
        person={personDay.person}
        dateISO={personDay.dateISO}
        tasks={
          personDay.open && personDay.person && personDay.dateISO
            ? dayPeople.get(personDay.dateISO)?.get(personDay.person)?.tasks ?? []
            : []
        }
        meeting={meeting}
        onClose={() => setPersonDay({ open: false, person: null, dateISO: null })}
        onAddTask={(p, iso) => {
          setPersonDay({ open: false, person: null, dateISO: null });
          quickNewForDay(iso, p);
        }}
        onEdit={(id) => {
          if (meeting) return;
          const t = rows.find((x) => x.id === id);
          setPersonDay({ open: false, person: null, dateISO: null });
          if (t) setEditTask(t);
        }}
        onDetail={(id) => {
          const t = rows.find((x) => x.id === id);
          setPersonDay({ open: false, person: null, dateISO: null });
          if (t) setOpenTask(t);
        }}
        onArchive={(id) => {
          if (meeting) return;
          setRows((prev) =>
            prev.map((x) => (x.id === id ? { ...x, archived: true, archivedAt: new Date().toISOString() } : x))
          );
        }}
        onDelete={(id) => {
          if (meeting) return;
          const t = rows.find((x) => x.id === id);
          setPersonDay({ open: false, person: null, dateISO: null });
          if (t) askArchiveDeleteFor(t);
        }}
      />

      {/* Modals standards */}
      {openTask && (
        <TaskDetailModal
          task={openTask}
          onClose={() => setOpenTask(null)}
          onEdit={(taskId: string) => {
            if (meeting) return;
            const t = rows.find((x) => x.id === taskId);
            if (t) setEditTask(t);
          }}
          onDelete={(taskId: string) => {
            const t = rows.find((x) => x.id === taskId);
            if (t) askArchiveDeleteFor(t);
          }}
        />
      )}

      {editTask && !meeting && (
        <EditTaskModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onSave={saveTask}
          open={true}
          tasks={rows}
          admins={admins}
          onAskArchiveDelete={askArchiveDeleteFor}
        />
      )}

      <ArchiveDeleteDialog
        open={adOpen.open}
        title={adOpen.title ?? "cette tâche"}
        onArchive={doArchive}
        onDelete={doDelete}
        onCancel={() => setAdOpen({ open: false })}
      />

      <ConfirmDialog open={confirm.open} message={confirm.message} onCancel={confirm.cancel} onConfirm={confirm.confirm} />
    </section>
  );
}
