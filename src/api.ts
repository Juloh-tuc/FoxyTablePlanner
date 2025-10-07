/* API front-only : délègue au repo localStorage */
import type { Task } from "./types";
import { createLocalTaskRepo, bootstrapFromSeed, migrateArchivedFields, STORAGE_KEY } from "./storage/taskRepo";
import { seed } from "./data";

const repo = createLocalTaskRepo();

/* Démarrage : migration + bootstrap si vide */
migrateArchivedFields();
bootstrapFromSeed(seed);

/* Fonctions utilisées par tes pages */
export async function fetchActiveTasks(): Promise<Task[]> {
  return repo.list({ archived: false });
}
export async function fetchArchivedTasks(): Promise<Task[]> {
  return repo.list({ archived: true });
}
export async function patchTask(id: string, patch: Partial<Task>): Promise<Task> {
  return repo.patch(id, patch);
}
export async function upsertTask(task: Task): Promise<Task> {
  return repo.upsert(task);
}
export async function archiveTask(id: string, reason?: string): Promise<Task> {
  return repo.archive(id, reason);
}
export async function restoreTask(id: string): Promise<Task> {
  return repo.restore(id);
}

/* bonus: écoute des mises à jour cross-onglets */
export function onTasksChanged(cb: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
