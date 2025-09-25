// src/utils/taskAdapters.ts
import type { Task, Statut, Priorite } from "../types";

/** 👉 On EXPORTe bien ce type */
export type LegacyTask = {
  id: string;
  title: string;
  admin: string;
  statut: Statut;
  priority?: Priorite;
  startDate?: string;
  dueDate?: string;
  blocked?: boolean;
  blockedBy?: string;
  archived?: boolean;
  archivedAt?: string | null;
  remarks?: string;
  tags?: string[];
};

export function fromLegacy(t: LegacyTask): Task {
  return {
    id: t.id,
    titre: t.title,
    admin: t.admin,
    statut: t.statut,
    priorite: t.priority,
    debut: t.startDate,
    echeance: t.dueDate,
    bloque: t.blocked ? "Bloqué" : undefined,
    bloquePar: t.blockedBy,
    remarques: t.remarks,
    etiquettes: t.tags as Task["etiquettes"],
    archived: t.archived,
    archivedAt: t.archivedAt ?? undefined,
  };
}

export function toLegacy(t: Task): LegacyTask {
  return {
    id: t.id,
    title: t.titre,
    admin: t.admin,
    statut: t.statut,
    priority: t.priorite,
    startDate: t.debut,
    dueDate: t.echeance,
    blocked: !!(t.bloque || t.statut === "Bloqué"),
    blockedBy: t.bloquePar,
    remarks: t.remarques,
    tags: t.etiquettes as string[] | undefined,
    archived: !!t.archived,
    archivedAt: t.archivedAt ?? null,
  };
}
