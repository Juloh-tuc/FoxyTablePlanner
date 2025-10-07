import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Task } from "../types";

type Ctx = {
  tasks: Task[];
  loading: boolean;
  create: (partial?: Partial<Task>) => Task | null;
  patch: (id: string, partial: Partial<Task>) => void;
  archive: (id: string, reason?: string) => void;
  restore: (id: string) => void;
  resetFromSeed: () => Promise<void>;
  exportJson: () => void;
  importJson: (file: File) => Promise<void>;
};

const TasksContext = createContext<Ctx | null>(null);

const LS_KEY = "foxy:mvp:tasks:v1";
const SEED_URL = "/tasks.seed.json";

const safeParse = (txt: string) => {
  try { return JSON.parse(txt) } catch { return null }
};

const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : "t-" + Math.random().toString(36).slice(2, 10);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // 1) Load from localStorage or seed
  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const data = safeParse(raw) as Task[] | null;
      if (Array.isArray(data)) {
        // Migration : assure les champs archivage
        setTasks(data.map(t => ({
          ...t,
          archived: t.archived ?? false,
          archivedAt: t.archivedAt ?? null,
          archivedReason: t.archivedReason ?? null
        })));
        setLoading(false);
        return;
      }
    }
    // fallback: fetch seed json
    fetch(SEED_URL)
      .then(r => r.ok ? r.json() : [])
      .then((data: Task[]) => {
        if (!Array.isArray(data)) data = [];
        const withArchive = data.map(t => ({
          ...t,
          archived: false,
          archivedAt: null,
          archivedReason: null
        }));
        setTasks(withArchive);
        localStorage.setItem(LS_KEY, JSON.stringify(withArchive));
      })
      .finally(() => setLoading(false));
  }, []);

  // 2) Persist on change
  useEffect(() => {
    if (!loading) {
      localStorage.setItem(LS_KEY, JSON.stringify(tasks));
    }
  }, [tasks, loading]);

  const create: Ctx["create"] = (partial = {}) => {
    const t: Task = {
      id: uid(),
      titre: partial.titre ?? "Nouvelle tâche",
      debut: partial.debut ?? new Date().toISOString().slice(0, 10),
      echeance: partial.echeance,
      admin: partial.admin ?? "👤",
      statut: partial.statut ?? "Pas commencé",
      priorite: partial.priorite ?? "Moyen",
      budget: partial.budget ?? 0,
      avancement: partial.avancement ?? 0,
      bloquePar: partial.bloquePar ?? "",
      remarques: partial.remarques ?? "",
      etiquettes: partial.etiquettes ?? [],
      assignees: partial.assignees ?? [],
      archived: false,
      archivedAt: null,
      archivedReason: null
    };
    setTasks(prev => [...prev, t]);
    return t;
  };

  const patch: Ctx["patch"] = (id, partial) =>
    setTasks(prev => prev.map(r => (r.id === id ? { ...r, ...partial } : r)));

  /** Archiver au lieu de supprimer */
  const archive: Ctx["archive"] = (id, reason) =>
    setTasks(prev => prev.map(r => r.id === id
      ? { ...r, archived: true, archivedAt: new Date().toISOString(), archivedReason: reason ?? null }
      : r));

  /** Restaurer une tâche archivée */
  const restore: Ctx["restore"] = (id) =>
    setTasks(prev => prev.map(r => r.id === id
      ? { ...r, archived: false, archivedAt: null, archivedReason: null }
      : r));

  const resetFromSeed: Ctx["resetFromSeed"] = async () => {
    setLoading(true);
    try {
      const data = await fetch(SEED_URL).then(r => r.ok ? r.json() : []);
      const withArchive = (Array.isArray(data) ? data : []).map((t: Task) => ({
        ...t,
        archived: false,
        archivedAt: null,
        archivedReason: null
      }));
      setTasks(withArchive);
      localStorage.setItem(LS_KEY, JSON.stringify(withArchive));
    } finally {
      setLoading(false);
    }
  };

  const exportJson: Ctx["exportJson"] = () => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "foxytable-tasks.json";
    document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
  };

  const importJson: Ctx["importJson"] = async (file: File) => {
    const txt = await file.text();
    const data = safeParse(txt);
    if (!Array.isArray(data)) throw new Error("Fichier JSON invalide");
    const withArchive = data.map((t: Task) => ({
      ...t,
      archived: t.archived ?? false,
      archivedAt: t.archivedAt ?? null,
      archivedReason: t.archivedReason ?? null
    }));
    setTasks(withArchive);
    localStorage.setItem(LS_KEY, JSON.stringify(withArchive));
  };

  const value = useMemo<Ctx>(() => ({
    tasks, loading, create, patch, archive, restore, resetFromSeed, exportJson, importJson
  }), [tasks, loading]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks() must be used inside <TasksProvider>");
  return ctx;
}
