// src/api/client.ts
// Source de données : repos localStorage (Tasks + Notes).
// Plus tard, tu pourras brancher json-server / vraie API sans toucher au reste.

import {
  createLocalTaskRepo,
  bootstrapFromSeed as bootstrapTasksFromSeed,
  migrateArchivedFields as migrateTasksArchivedFields,
} from "../storage/taskRepo";
import {
  createLocalNoteRepo,
  bootstrapNotesFromSeed,
  migrateNotesArchivedFields,
} from "../storage/noteRepo";

import { seed as tasksSeed } from "../data"; // ton seed de tâches (garde si tu en as)

// === Clés de stockage (doivent matcher celles utilisées par les repos) ===
export const TASKS_STORAGE_KEY = "foxy:mvp:tasks:v1";
export const NOTES_STORAGE_KEY = "foxy:mvp:notes:v1";

// Évite de re-bootstrap lors des rechargements HMR
declare global {
  interface Window {
    __tasksRepoBootstrapped__?: boolean;
    __notesRepoBootstrapped__?: boolean;
  }
}

// --- Instanciation des repos locaux ---
const localTasksRepo = createLocalTaskRepo();
const localNotesRepo = createLocalNoteRepo();

// --- Bootstraps (1 seule fois, même avec HMR) ---
if (!window.__tasksRepoBootstrapped__) {
  migrateTasksArchivedFields();
  bootstrapTasksFromSeed(tasksSeed);
  window.__tasksRepoBootstrapped__ = true;
}

if (!window.__notesRepoBootstrapped__) {
  migrateNotesArchivedFields();
  bootstrapNotesFromSeed([]); // passe un seedNotes[] si tu en as
  window.__notesRepoBootstrapped__ = true;
}

// =========================
// Interfaces exposées
// =========================
export type TasksRepo = {
  list: (opts?: { archived?: boolean }) => Promise<import("../types").Task[]>;
  get: (id: string) => Promise<import("../types").Task | null>;
  upsert: (t: import("../types").Task) => Promise<import("../types").Task>;
  patch: (id: string, p: Partial<import("../types").Task>) => Promise<import("../types").Task>;
  archive: (id: string, reason?: string) => Promise<import("../types").Task>;
  restore: (id: string) => Promise<import("../types").Task>;
};

export type NotesRepo = {
  list: (opts?: { archived?: boolean }) => Promise<import("../types").Note[]>;
  get: (id: string) => Promise<import("../types").Note | null>;
  upsert: (n: import("../types").Note) => Promise<import("../types").Note>;
  patch: (id: string, p: Partial<import("../types").Note>) => Promise<import("../types").Note>;
  archive: (id: string, reason?: string) => Promise<import("../types").Note>;
  restore: (id: string) => Promise<import("../types").Note>;
};

// =========================
// Getters de repo
// =========================
export function getTasksRepo(): TasksRepo {
  return localTasksRepo as TasksRepo;
}

export function getNotesRepo(): NotesRepo {
  return localNotesRepo as NotesRepo;
}

// =========================
/* Listeners de changement (cross-onglets) */
// =========================
export function onTasksChanged(cb: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === TASKS_STORAGE_KEY) cb();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export function onNotesChanged(cb: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === NOTES_STORAGE_KEY) cb();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
