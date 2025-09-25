// src/api/tasks.local.ts
import type { Task } from "../types";
import { fromLegacy, type LegacyTask, toLegacy } from "../utils/taskAdapters";

/* =========================
   OPTION A — json-server
   ========================= */
// URL par défaut de json-server: npx json-server --watch mvp/db.json --port 3001
const API = "http://localhost:3001/tasks";

export async function loadTasks(): Promise<Task[]> {
  const res = await fetch(API);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as LegacyTask[] | Task[];
  // Si c’est déjà au bon format (Task), on passe au travers :
  return Array.isArray(data) && "titre" in (data[0] ?? {})
    ? (data as Task[])

    : (data as LegacyTask[]).map(fromLegacy);
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  // json-server gère le PUT sur la ressource /tasks (ou PATCH item par item)
  // Ici on pousse tout le tableau (selon ton mvp/db.json).
  const payload = tasks.map(toLegacy);
  await fetch(API.replace(/\/tasks$/, "/tasks"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/* =========================
   OPTION B — fichier statique
   (ex: public/tasks.json OU mvp/tasks.json servi statiquement)
   ========================= */

// export async function loadTasks(): Promise<Task[]> {
//   const res = await fetch("/mvp/tasks.json"); // ou "/tasks.json" si placé dans public/
//   if (!res.ok) throw new Error(`HTTP ${res.status}`);
//   const data = (await res.json()) as LegacyTask[] | Task[];
//   return Array.isArray(data) && "titre" in (data[0] ?? {})
//     ? (data as Task[])
//     : (data as LegacyTask[]).map(fromLegacy);
// }

// export async function saveTasks(_tasks: Task[]): Promise<void> {
//   // Fichier statique : pas de save côté client.
//   console.warn("saveTasks: non supporté en mode fichier statique.");
// }
