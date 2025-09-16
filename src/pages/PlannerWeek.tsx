import React, { useMemo, useState, useCallback } from "react";
import { seed } from "../data";
import type { Task, Statut } from "../types";
import "../styles/planner-common.css";
import "../styles/planner-week.css";

/* ----------------------- Constants & Types ----------------------- */
const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const PRIORITIES = ["Faible", "Moyen", "Élevé"] as const;
type Priority = typeof PRIORITIES[number];

const STATUSES = ["Pas commencé", "En attente", "En cours", "Bloqué", "Terminé"] as const;
type StatusLocal = typeof STATUSES[number];

const STATUS_STYLE_MAP = {
  "Terminé": "done",
  "En cours": "progress", 
  "Bloqué": "blocked",
  "En attente": "wait",
  "Pas commencé": "info"
} as const;

interface TaskBar {
  task: Task;
  startIdx: number;
  endIdx: number;
  row: number;
}

interface TaskDraft {
  id?: string;
  titre: string;
  admin: string;
  priorite: Priority;
  statut: StatusLocal;
  debut: string;
  echeance: string;
}

/* ----------------------- Utility Functions ----------------------- */
const dateUtils = {
  toISO: (date: Date): string => date.toISOString().slice(0, 10),
  
  addDays: (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },
  
  getStartOfWeek: (baseDate = new Date()): Date => {
    const date = new Date(baseDate);
    date.setHours(0, 0, 0, 0);
    const dayOfWeek = date.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    date.setDate(date.getDate() - daysToSubtract);
    return date;
  },
  
  getDaysDifference: (date1: Date, date2: Date): number =>
    Math.floor((date1.getTime() - date2.getTime()) / DAY_MS),
    
  isDateInRange: (date: Date, start: Date, end: Date): boolean =>
    date >= start && date <= end
};

const taskUtils = {
  validatePriority: (priority: unknown): Priority =>
    PRIORITIES.includes(priority as Priority) ? (priority as Priority) : "Moyen",
    
  validateStatus: (status: unknown): StatusLocal =>
    STATUSES.includes(status as StatusLocal) ? (status as StatusLocal) : "Pas commencé",
    
  getStatusStyleKey: (status: Statut): string =>
    STATUS_STYLE_MAP[status as keyof typeof STATUS_STYLE_MAP] || "info",
    
  generateId: (): string => Math.random().toString(36).slice(2, 9)
};

/* ----------------------- Custom Hooks ----------------------- */
const useTasks = (initialTasks: Task[]) => {
  const [tasks, setTasks] = useState<Task[]>(() => 
    JSON.parse(JSON.stringify(initialTasks))
  );

  const addTask = useCallback((newTask: Omit<Task, 'id'>) => {
    const taskWithId = { ...newTask, id: taskUtils.generateId() };
    setTasks(prev => [...prev, taskWithId]);
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, ...updates } : task
    ));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  }, []);

  const admins = useMemo(() => 
    Array.from(new Set(tasks.map(task => task.admin).filter(Boolean))),
    [tasks]
  );

  return { tasks, addTask, updateTask, deleteTask, admins };
};

const useTaskBars = (tasks: Task[], weekStart: Date, weekEnd: Date) => {
  return useMemo(() => {
    const visibleTasks = tasks.filter(task => {
      const startDate = task.debut ? new Date(task.debut) : null;
      const endDate = task.echeance ? new Date(task.echeance) : startDate;
      
      if (!startDate || !endDate) return false;
      return startDate <= weekEnd && endDate >= weekStart;
    });

    const baseBars = visibleTasks.map(task => {
      const startDate = task.debut ? new Date(task.debut) : weekStart;
      const endDate = task.echeance ? new Date(task.echeance) : startDate;
      
      const clampedStart = startDate < weekStart ? weekStart : startDate;
      const clampedEnd = endDate > weekEnd ? weekEnd : endDate;
      
      const startIdx = Math.max(0, Math.min(6, 
        dateUtils.getDaysDifference(clampedStart, weekStart)
      ));
      const endIdx = Math.max(0, Math.min(6, 
        dateUtils.getDaysDifference(clampedEnd, weekStart)
      ));
      
      return { task, startIdx, endIdx };
    }).sort((a, b) => {
      const startDiff = a.startIdx - b.startIdx;
      if (startDiff !== 0) return startDiff;
      return (b.endIdx - b.startIdx) - (a.endIdx - a.startIdx);
    });

    const rowEndPositions: number[] = [];
    const taskBars: TaskBar[] = [];
    
    baseBars.forEach(bar => {
      let row = 0;
      while (rowEndPositions[row] !== undefined && rowEndPositions[row] >= bar.startIdx) {
        row++;
      }
      rowEndPositions[row] = bar.endIdx;
      taskBars.push({ ...bar, row });
    });

    return {
      bars: taskBars,
      maxRows: taskBars.reduce((max, bar) => Math.max(max, bar.row), 0) + 1
    };
  }, [tasks, weekStart, weekEnd]);
};

/* ----------------------- Modal Component ----------------------- */
interface TaskModalProps {
  isOpen: boolean;
  draft: TaskDraft | null;
  admins: string[];
  onClose: () => void;
  onSave: (draft: TaskDraft) => void;
  onDelete: () => void;
  onChange: (draft: TaskDraft) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  draft,
  admins,
  onClose,
  onSave,
  onDelete,
  onChange
}) => {
  if (!isOpen || !draft) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{draft.id ? "Modifier la tâche" : "Nouvelle tâche"}</h2>

        <div className="form">
          <label>
            <span>Titre</span>
            <input 
              value={draft.titre} 
              onChange={e => onChange({...draft, titre: e.target.value})}
              placeholder="Entrez le titre de la tâche"
            />
          </label>

          <label>
            <span>Responsable</span>
            <input 
              list="admins-list" 
              value={draft.admin} 
              onChange={e => onChange({...draft, admin: e.target.value})}
              placeholder="Nom du responsable"
            />
            <datalist id="admins-list">
              {admins.map(admin => <option key={admin} value={admin} />)}
            </datalist>
          </label>

          <label>
            <span>Statut</span>
            <select 
              value={draft.statut} 
              onChange={e => onChange({...draft, statut: e.target.value as StatusLocal})}
            >
              {STATUSES.map(status => 
                <option key={status} value={status}>{status}</option>
              )}
            </select>
          </label>

          <label>
            <span>Priorité</span>
            <select 
              value={draft.priorite} 
              onChange={e => onChange({...draft, priorite: e.target.value as Priority})}
            >
              {PRIORITIES.map(priority => 
                <option key={priority} value={priority}>{priority}</option>
              )}
            </select>
          </label>

          <label>
            <span>Date de début</span>
            <input 
              type="date" 
              value={draft.debut} 
              onChange={e => onChange({...draft, debut: e.target.value})} 
            />
          </label>

          <label>
            <span>Date de fin</span>
            <input 
              type="date" 
              value={draft.echeance} 
              onChange={e => onChange({...draft, echeance: e.target.value})} 
            />
          </label>
        </div>

        <div className="modal-actions">
          {draft.id && (
            <button className="btn danger" onClick={onDelete}>
              Supprimer
            </button>
          )}
          <div style={{flex: 1}} />
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn primary" onClick={() => onSave(draft)}>
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
};

/* ----------------------- Main Component ----------------------- */
export default function PlannerWeek() {
  const { tasks, addTask, updateTask, deleteTask, admins } = useTasks(seed);
  const [weekStart, setWeekStart] = useState(() => dateUtils.getStartOfWeek());
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    draft: TaskDraft | null;
  }>({
    isOpen: false,
    draft: null
  });

  const weekEnd = dateUtils.addDays(weekStart, 6);
  const weekDays = useMemo(() => 
    Array.from({length: 7}, (_, i) => dateUtils.addDays(weekStart, i)),
    [weekStart]
  );

  const { bars, maxRows } = useTaskBars(tasks, weekStart, weekEnd);

  const today = new Date();
  const todayIndex = dateUtils.isDateInRange(today, weekStart, weekEnd)
    ? dateUtils.getDaysDifference(today, weekStart)
    : -1;

  /* ----------------------- Event Handlers ----------------------- */
  const navigateWeek = useCallback((direction: -1 | 1) => {
    setWeekStart(prev => dateUtils.addDays(prev, direction * 7));
  }, []);

  const openNewTaskModal = useCallback((dayIndex: number) => {
    const selectedDay = dateUtils.toISO(dateUtils.addDays(weekStart, dayIndex));
    setModalState({
      isOpen: true,
      draft: {
        titre: "",
        admin: admins[0] || "",
        priorite: "Moyen",
        statut: "Pas commencé",
        debut: selectedDay,
        echeance: selectedDay,
      }
    });
  }, [weekStart, admins]);

  const openEditTaskModal = useCallback((task: Task) => {
    setModalState({
      isOpen: true,
      draft: {
        id: task.id,
        titre: task.titre,
        admin: task.admin || "",
        priorite: taskUtils.validatePriority(task.priorite),
        statut: taskUtils.validateStatus(task.statut),
        debut: task.debut || dateUtils.toISO(new Date()),
        echeance: task.echeance || task.debut || dateUtils.toISO(new Date()),
      }
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({ isOpen: false, draft: null });
  }, []);

  const saveTask = useCallback((draft: TaskDraft) => {
    const taskData: Task = {
      id: draft.id || taskUtils.generateId(),
      titre: draft.titre,
      admin: draft.admin,
      priorite: draft.priorite,
      statut: draft.statut as Statut,
      debut: draft.debut,
      echeance: draft.echeance,
      budget: 0,
      avancement: 0,
      remarques: "",
    };

    if (draft.id) {
      updateTask(draft.id, taskData);
    } else {
      addTask(taskData);
    }
    
    closeModal();
  }, [addTask, updateTask, closeModal]);

  const handleDeleteTask = useCallback(() => {
    if (modalState.draft?.id) {
      deleteTask(modalState.draft.id);
      closeModal();
    }
  }, [modalState.draft?.id, deleteTask, closeModal]);

  const updateDraft = useCallback((newDraft: TaskDraft) => {
    setModalState(prev => ({ ...prev, draft: newDraft }));
  }, []);

  /* ----------------------- Render ----------------------- */
  return (
    <section className="week-cells">
      <h1 className="visually-hidden">Planificateur - Vue Semaine</h1>

      <div className="week-controls">
        <button 
          className="btn" 
          onClick={() => navigateWeek(-1)}
          aria-label="Semaine précédente"
        >
          ←
        </button>
        <div className="week-title">
          Semaine du {dateUtils.toISO(weekStart)} au {dateUtils.toISO(weekEnd)}
        </div>
        <button 
          className="btn" 
          onClick={() => navigateWeek(1)}
          aria-label="Semaine suivante"
        >
          →
        </button>
      </div>

      <div className="bleed-xl">
        <div className="board card">
          <div className="head grid7">
            <div className="day-head spacer">Projet</div>
            {weekDays.map((day, index) => (
              <div 
                key={index} 
                className={`day-head ${index === todayIndex ? "is-today" : ""}`}
              >
                <div className="dow">{DAYS_OF_WEEK[index]}</div>
                <div className="dom">
                  {String(day.getDate()).padStart(2, "0")}
                </div>
              </div>
            ))}
          </div>

          <div 
            className="body grid7" 
            style={{ 
              gridTemplateRows: `repeat(${Math.max(2, maxRows)}, var(--row-h))` 
            }}
          >
            <div className="col-left" />

            {weekDays.map((_, index) => (
              <div 
                key={index} 
                className="cell" 
                onClick={() => openNewTaskModal(index)}
              >
                <button type="button" className="add-btn">
                  + Ajouter une tâche
                </button>
              </div>
            ))}

            {Array.from({ length: Math.max(1, maxRows - 1) }).map((_, rowIndex) => (
              <React.Fragment key={`row-${rowIndex}`}>
                <div className="col-left" />
                {Array.from({ length: 7 }).map((_, colIndex) => (
                  <div 
                    key={`cell-${rowIndex}-${colIndex}`} 
                    className="cell pad" 
                  />
                ))}
              </React.Fragment>
            ))}

            {bars.map(bar => (
              <div
                key={bar.task.id}
                className={`task-bar is-${taskUtils.getStatusStyleKey(bar.task.statut)}`}
                style={{
                  gridColumn: `${bar.startIdx + 2} / ${bar.endIdx + 3}`,
                  gridRow: bar.row + 1,
                }}
                title={`${bar.task.titre} — ${bar.task.debut}${
                  bar.task.echeance ? " → " + bar.task.echeance : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  openEditTaskModal(bar.task);
                }}
              >
                <div className="bar-title">{bar.task.titre}</div>
                <div className="bar-meta">
                  <span 
                    className="badge-prio" 
                    data-level={taskUtils.validatePriority(bar.task.priorite)}
                  >
                    <span className="dot" />
                    {taskUtils.validatePriority(bar.task.priorite)}
                  </span>
                  <span 
                    className={`status-chip is-${taskUtils.getStatusStyleKey(bar.task.statut)}`}
                  >
                    <span 
                      className={`dot ${taskUtils.getStatusStyleKey(bar.task.statut)}`} 
                    />
                    {bar.task.statut}
                  </span>
                  <span className="tag">{bar.task.admin || "👤"}</span>
                </div>
              </div>
            ))}

            {todayIndex >= 0 && (
              <div
                className="today-line"
                style={{ 
                  gridColumn: `${todayIndex + 2} / span 1`, 
                  gridRow: `1 / ${Math.max(2, maxRows) + 1}` 
                }}
              />
            )}
          </div>
        </div>
      </div>

      <TaskModal
        isOpen={modalState.isOpen}
        draft={modalState.draft}
        admins={admins.filter((admin): admin is string => admin !== undefined)}
        onClose={closeModal}
        onSave={saveTask}
        onDelete={handleDeleteTask}
        onChange={updateDraft}
      />
    </section>
  );
}