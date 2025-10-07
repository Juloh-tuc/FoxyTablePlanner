/** Statut de la tâche */
export type Statut =
  | "Terminé"
  | "En cours"
  | "En attente"
  | "Bloqué"
  | "Pas commencé";

/** Priorité (optionnelle) */
export type Priorite = "Faible" | "Moyen" | "Élevé";

/** Étiquette (presets + customs possibles) */
export type Etiquette =
  | "Web"
  | "Front-BO"
  | "Back-FO"
  | "Front-FO"
  | "Back-BO"
  | "API"
  | "Design"
  | "Mobile"
  | "Autre"
  | (string & {});

/** Modèle de tâche — unique pour toute l'app (NO DELETE, ARCHIVE ONLY) */
export interface Task {
  id: string;

  // ---- Champs FR (principaux)
  titre: string;
  admin: string;
  team?: string;
  statut: Statut;

  priorite?: Priorite;
  debut?: string;     // ISO yyyy-mm-dd
  echeance?: string;  // ISO yyyy-mm-dd

  // ---- Dépendances
  dependsOn?: string[]; // entrantes
  blocks?: string[];    // sortantes

  // ---- Blocages / remarques
  bloque?: string;
  bloquePar?: string;
  remarques?: string;

  // ---- Étiquettes / personnes / progression
  etiquettes?: Etiquette[];
  assignees: string[];        // toujours un tableau

  avancement?: number; // 0–100
  budget?: number;

  // ---- Archivage (NE JAMAIS SUPPRIMER)
  archived: boolean;
  archivedAt?: string | null;      // ISO
  archivedReason?: string | null;  // optionnelle

  // ---- Timestamps
  createdAt?: string; // ISO
  updatedAt?: string; // ISO

  // ---------- ALIAS (compat) ----------
  title?: string;          // alias de `titre`
  priority?: Priorite;     // alias de `priorite`
  startDate?: string;      // alias de `debut`
  dueDate?: string;        // alias de `echeance`
  blocked?: boolean;       // miroir bool
  blockedBy?: string;      // alias de `bloque`
}

/* ========= Utils conseillés ========================== */

const genId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : "t-" + Math.random().toString(36).slice(2, 10);

/** Normalise une tâche partielle -> Task (defaults + alias) */
export function normalizeTask(draft: Partial<Task>): Task {
  const s = (v: any) => (typeof v === "string" ? v : v == null ? "" : String(v));
  const now = new Date().toISOString();

  const titre = s(draft.titre ?? draft.title).trim();

  const priorite = draft.priorite ?? draft.priority;
  const debut = draft.debut ?? draft.startDate;
  const echeance = draft.echeance ?? draft.dueDate;

  const assignees = Array.isArray(draft.assignees) ? draft.assignees.filter(Boolean) : [];

  return {
    id: s(draft.id) || genId(),

    // principaux
    titre: titre || "Sans titre",
    admin: s(draft.admin ?? ""),
    team: draft.team,
    statut: (draft.statut as Statut) ?? "Pas commencé",

    priorite,
    debut,
    echeance,

    // dépendances / blocage
    dependsOn: draft.dependsOn ?? [],
    blocks: draft.blocks ?? [],
    bloque: draft.bloque,
    bloquePar: draft.bloquePar,
    remarques: draft.remarques,

    // étiquettes / personnes / progression
    etiquettes: draft.etiquettes ?? [],
    assignees,
    avancement: draft.avancement,
    budget: draft.budget,

    // archivage
    archived: !!draft.archived,
    archivedAt: draft.archivedAt ?? null,
    archivedReason: draft.archivedReason ?? null,

    // timestamps
    createdAt: draft.createdAt ?? now,
    updatedAt: now,

    // alias (on garde si présents)
    title: titre || undefined,
    priority: priorite,
    startDate: debut,
    dueDate: echeance,
    blocked: typeof draft.blocked === "boolean" ? draft.blocked : !!draft.bloque, // petit plus
    blockedBy: draft.blockedBy,
  };
}

/** Migration rapide d’un tableau (seed/localStorage) */
export function ensureArchivedFields<T extends Partial<Task>>(items: T[]): Task[] {
  return items.map((t) =>
    normalizeTask({
      ...t,
      archived: typeof t.archived === "boolean" ? t.archived : false,
      archivedAt: t.archivedAt ?? null,
      archivedReason: (t as any).archivedReason ?? null,
      assignees: Array.isArray(t.assignees) ? t.assignees : [],
    })
  );
}

/* === Presets centralisés (facultatif mais pratique) ====================== */
export const STATUTS_ALL: readonly Statut[] =
  ["Terminé", "En cours", "En attente", "Bloqué", "Pas commencé"] as const;

export const PRIORITES_ALL: readonly Priorite[] =
  ["Faible", "Moyen", "Élevé"] as const;

export const ETIQUETTES_PRESET: readonly Etiquette[] =
  ["Web", "Front-BO", "Back-FO", "Front-FO", "Back-BO", "API", "Design", "Mobile", "Autre"] as const;
  // --- NOTES ---
export interface Note {
  id: string;
  titre: string;           // nouveau: titre affiché
  contenu: string;         // corps de la note
  archived: boolean;       // jamais de delete
  archivedAt?: string | null;
  archivedReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function normalizeNote(draft: Partial<Note>): Note {
  const now = new Date().toISOString();
  const titre = (draft.titre ?? draft.contenu ?? "").toString().split("\n")[0].trim().slice(0, 80) || "Sans titre";
  return {
    id: draft.id ?? (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "n-" + Math.random().toString(36).slice(2)),
    titre,
    contenu: (draft.contenu ?? "").toString(),
    archived: !!draft.archived,
    archivedAt: draft.archivedAt ?? null,
    archivedReason: draft.archivedReason ?? null,
    createdAt: draft.createdAt ?? now,
    updatedAt: now,
  };
}

export function ensureArchivedFieldsNotes<T extends Partial<Note>>(items: T[]): Note[] {
  return items.map(n => normalizeNote(n));
}

