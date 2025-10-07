/* Front-only TaskRepo (localStorage) */
import type { Task } from "../types";
import { seed as defaultSeed } from "../data";

export const STORAGE_KEY = "foxy:mvp:tasks:v1"; // aligne avec ton store/LS_KEY

function nowISO() { return new Date().toISOString(); }

function read(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
}
function write(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  // notifier autres onglets
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: "updated" }));
}

export function migrateArchivedFields() {
  const tasks = read();
  let changed = false;
  const next = tasks.map(t => {
    const n: Task = {
      ...t,
      archived: typeof t.archived === "boolean" ? t.archived : false,
      archivedAt: t.archivedAt ?? null,
    
      archivedReason: (t as any).archivedReason ?? null,
      assignees: Array.isArray(t.assignees) ? t.assignees : [],
    };
    if (JSON.stringify(n) !== JSON.stringify(t)) changed = true;
    return n;
  });
  if (changed) write(next);
}

export function bootstrapFromSeed(seed: Task[] = defaultSeed) {
  const existing = read();
  if (existing.length > 0) return;
  const withDefaults = seed.map(t => ({
    ...t,
    archived: t.archived ?? false,
    archivedAt: t.archivedAt ?? null,
  
    archivedReason: (t as any)?.archivedReason ?? null,
    assignees: Array.isArray(t.assignees) ? t.assignees : [],
  })) as Task[];
  write(withDefaults);
}

export function createLocalTaskRepo() {
  return {
    async list(opts?: { archived?: boolean }): Promise<Task[]> {
      const tasks = read();
      if (opts?.archived === true) return tasks.filter(t => t.archived);
      if (opts?.archived === false) return tasks.filter(t => !t.archived);
      return tasks;
    },
    async get(id: string): Promise<Task | null> {
      return read().find(t => t.id === id) ?? null;
    },
    async upsert(task: Task): Promise<Task> {
      const tasks = read();
      const idx = tasks.findIndex(t => t.id === task.id);
      const next: Task = {
        ...task,
        archived: task.archived ?? false,
        archivedAt: task.archivedAt ?? null,
      };
      if (idx >= 0) tasks[idx] = next; else tasks.unshift(next);
      write(tasks);
      return next;
    },
    async patch(id: string, patch: Partial<Task>): Promise<Task> {
      const tasks = read();
      const idx = tasks.findIndex(t => t.id === id);
      if (idx < 0) throw new Error("Task not found");
      const next = { ...tasks[idx], ...patch };
      tasks[idx] = next;
      write(tasks);
      return next as Task;
    },
    async archive(id: string, reason?: string): Promise<Task> {
      return this.patch(id, { archived: true, archivedAt: nowISO(), /* @ts-ignore */ archivedReason: reason ?? null });
    },
    async restore(id: string): Promise<Task> {
      return this.patch(id, { archived: false, archivedAt: null, /* @ts-ignore */ archivedReason: null });
    },
  };
}
