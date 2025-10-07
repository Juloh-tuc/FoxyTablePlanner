import type { Note } from "../types";
import { getNotesRepo } from "./client";

const repo = getNotesRepo();

export async function fetchActiveNotes(): Promise<Note[]> { return repo.list({ archived: false }); }
export async function fetchArchivedNotes(): Promise<Note[]> { return repo.list({ archived: true }); }
export async function upsertNote(n: Note): Promise<Note> { return repo.upsert(n); }
export async function patchNote(id: string, p: Partial<Note>): Promise<Note> { return repo.patch(id, p); }
export async function archiveNote(id: string, reason?: string): Promise<Note> { return repo.archive(id, reason); }
export async function restoreNote(id: string): Promise<Note> { return repo.restore(id); }
export { onNotesChanged } from "./client";
