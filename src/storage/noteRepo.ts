import { ensureArchivedFieldsNotes } from "../types";
import type { Note } from "../types";
const KEY = "foxy:mvp:notes:v1";

function load(): Note[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function save(notes: Note[]) {
  localStorage.setItem(KEY, JSON.stringify(notes));
  try { localStorage.setItem(KEY + ":ts", String(Date.now())); } catch {}
}

export function migrateNotesArchivedFields() { save(ensureArchivedFieldsNotes(load())); }
export function bootstrapNotesFromSeed(seed: Partial<Note>[] = []) {
  const cur = load(); if (cur.length) return;
  save(ensureArchivedFieldsNotes(seed));
}

export function createLocalNoteRepo() {
  return {
    async list(opts?: { archived?: boolean }) {
      const all = load();
      if (opts?.archived === true)  return all.filter(n => n.archived);
      if (opts?.archived === false) return all.filter(n => !n.archived);
      return all;
    },
    async get(id: string) {
      return load().find(n => n.id === id) ?? null;
    },
    async upsert(note: Note) {
      const all = load();
      const i = all.findIndex(n => n.id === note.id);
      const updated = { ...note, updatedAt: new Date().toISOString() };
      if (i >= 0) all[i] = updated; else all.unshift(updated);
      save(all); return updated;
    },
    async patch(id: string, p: Partial<Note>) {
      const all = load();
      const i = all.findIndex(n => n.id === id);
      if (i < 0) throw new Error("Note not found");
      all[i] = { ...all[i], ...p, updatedAt: new Date().toISOString() };
      save(all); return all[i];
    },
    async archive(id: string, reason?: string) {
      return this.patch(id, { archived: true, archivedAt: new Date().toISOString(), archivedReason: reason ?? null });
    },
    async restore(id: string) {
      return this.patch(id, { archived: false, archivedAt: null, archivedReason: null });
    },
  };
}
