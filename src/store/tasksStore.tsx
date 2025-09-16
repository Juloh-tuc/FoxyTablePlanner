import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Task } from "../types";

type Ctx = {
  tasks: Task[];
  loading: boolean;
  create: (partial?: Partial<Task>) => Task | null;
  patch: (id: string, partial: Partial<Task>) => void;
  remove: (id: string) => void;
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
        setTasks(data); setLoading(false);
        return;
      }
    }
    // fallback: fetch seed json
    fetch(SEED_URL)
      .then(r => r.ok ? r.json() : [])
      .then((data: Task[]) => {
        if (!Array.isArray(data)) data = [];
        setTasks(data);
        localStorage.setItem(LS_KEY, JSON.stringify(data));
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
      etiquettes: partial.etiquettes ?? []
    };
    setTasks(prev => [...prev, t]);
    return t;
  };

  const patch: Ctx["patch"] = (id, partial) =>
    setTasks(prev => prev.map(r => (r.id === id ? { ...r, ...partial } : r)));

  const remove: Ctx["remove"] = (id) =>
    setTasks(prev => prev.filter(r => r.id !== id));

  const resetFromSeed: Ctx["resetFromSeed"] = async () => {
    setLoading(true);
    try {
      const data = await fetch(SEED_URL).then(r => r.ok ? r.json() : []);
      setTasks(Array.isArray(data) ? data : []);
      localStorage.setItem(LS_KEY, JSON.stringify(Array.isArray(data) ? data : []));
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
    setTasks(data);
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  };

  const value = useMemo<Ctx>(() => ({
    tasks, loading, create, patch, remove, resetFromSeed, exportJson, importJson
  }), [tasks, loading]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks() must be used inside <TasksProvider>");
  return ctx;
}
