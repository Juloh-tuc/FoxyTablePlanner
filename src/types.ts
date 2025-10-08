/* =========================================
   Statuts / Priorités / Étiquettes
   ========================================= */
export const STATUTS_ALL = [
  "Terminé",
  "En cours",
  "En attente",
  "Bloqué",
  "Pas commencé",
] as const;
export type Statut = typeof STATUTS_ALL[number];

export const PRIORITES_ALL = ["Faible", "Moyen", "Élevé"] as const;
export type Priorite = typeof PRIORITES_ALL[number];

export const ETIQUETTES_PRESET = [
  "Web",
  "Front-BO",
  "Back-FO",
  "Front-FO",
  "Back-BO",
  "API",
  "Design",
  "Mobile",
  "Autre",
] as const;
export type Etiquette = typeof ETIQUETTES_PRESET[number] | (string & {});

/** Raccourcis sûrs pour utiliser les statuts sans retomber en `string` */
export const S = {
  TERMINE: "Terminé",
  EN_COURS: "En cours",
  EN_ATTENTE: "En attente",
  BLOQUE: "Bloqué",
  PAS_COMMENCE: "Pas commencé",
} as const satisfies Record<string, Statut>;

/* =========================================
   Natures / Domaines / Epic
   ========================================= */
export const KINDS_ALL = ["Dev", "Design", "Ops", "Comms", "Product", "Admin"] as const;
export type Kind = typeof KINDS_ALL[number];

export const DOMAINS_ALL = [
  "Frontend",
  "Backend",
  "API",
  "Mobile",
  "People",
  "Legal",
  "Autre",
] as const;
export type Domain = typeof DOMAINS_ALL[number];

/* =========================================
   Modèles de données
   ========================================= */
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

  // ---- Structuration (NOUVEAU — optionnels pour compat)
  kind?: Kind;          // nature de tâche (ex: "Dev")
  domain?: Domain;      // sous-domaine (ex: "API")
  epicId?: string;      // rattachement projet/epic

  // ---- Dépendances
  dependsOn?: string[]; // entrantes (ids des tâches qui bloquent celle-ci)
  blocks?: string[];    // sortantes (ids des tâches que celle-ci bloque)

  // ---- Blocages / remarques (notes libres)
  bloque?: string;
  bloquePar?: string;
  remarques?: string;

  // ---- Étiquettes / personnes / progression
  etiquettes?: Etiquette[];
  assignees: string[]; // toujours un tableau

  avancement?: number; // 0–100
  budget?: number;

  // ---- Archivage (NE JAMAIS SUPPRIMER)
  archived: boolean;
  archivedAt?: string | null;     // ISO
  archivedReason?: string | null; // optionnelle

  // ---- Timestamps
  createdAt?: string; // ISO
  updatedAt?: string; // ISO

  // ---------- ALIAS (compat) ----------
  title?: string;       // alias de `titre`
  priority?: Priorite;  // alias de `priorite`
  startDate?: string;   // alias de `debut`
  dueDate?: string;     // alias de `echeance`
  blocked?: boolean;    // miroir bool
  blockedBy?: string;   // alias de `bloque`
}

/* =========================================
   Utils
   ========================================= */
const genId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : "t-" + Math.random().toString(36).slice(2, 10);

export function isStatut(x: any): x is Statut {
  return (STATUTS_ALL as readonly string[]).includes(x);
}
export function isPriorite(x: any): x is Priorite {
  return (PRIORITES_ALL as readonly string[]).includes(x);
}
export function isKind(x: any): x is Kind {
  return (KINDS_ALL as readonly string[]).includes(x);
}
export function isDomain(x: any): x is Domain {
  return (DOMAINS_ALL as readonly string[]).includes(x);
}

const uniq = (arr: any[] | undefined) =>
  Array.from(new Set((arr ?? []).filter(Boolean))) as string[];

/** Normalise une tâche partielle -> Task (defaults + alias + garde-fous) */
export function normalizeTask(draft: Partial<Task>): Task {
  const s = (v: any) => (typeof v === "string" ? v : v == null ? "" : String(v));
  const now = new Date().toISOString();

  const titre = s(draft.titre ?? draft.title).trim();
  const priorite = draft.priorite ?? draft.priority;
  const debut = draft.debut ?? draft.startDate;
  const echeance = draft.echeance ?? draft.dueDate;

  const assignees = Array.isArray(draft.assignees) ? draft.assignees.filter(Boolean) : [];

  // Sécurise le statut pour rester dans l’union
  const statut: Statut = isStatut(draft.statut) ? draft.statut : S.PAS_COMMENCE;

  // Nouvelles structures (optionnelles)
  const kind = isKind(draft.kind) ? draft.kind : undefined;
  const domain = isDomain(draft.domain) ? draft.domain : undefined;
  const epicId = s(draft.epicId) || undefined;

  return {
    id: s(draft.id) || genId(),

    // principaux
    titre: titre || "Sans titre",
    admin: s(draft.admin ?? ""),
    team: draft.team,
    statut,

    priorite: isPriorite(priorite) ? priorite : priorite, // laisse passer custom si besoin
    debut,
    echeance,

    // structuration
    kind,
    domain,
    epicId,

    // dépendances / blocage
    dependsOn: uniq(draft.dependsOn),
    blocks:    uniq(draft.blocks),
    bloque: draft.bloque,
    bloquePar: draft.bloquePar,
    remarques: draft.remarques,

    // étiquettes / personnes / progression
    etiquettes: Array.isArray(draft.etiquettes) ? draft.etiquettes : [],
    assignees,
    avancement: typeof draft.avancement === "number" ? draft.avancement : undefined,
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
    blocked: typeof draft.blocked === "boolean" ? draft.blocked : !!draft.bloque,
    blockedBy: draft.blockedBy,
  };
}

/** Migration rapide d’un tableau (seed/localStorage) -> Task[] normalisées */
export function ensureArchivedFields<T extends Partial<Task>>(items: T[]): Task[] {
  return items.map((t) =>
    normalizeTask({
      ...t,
      archived: typeof t.archived === "boolean" ? t.archived : false,
      archivedAt: t?.archivedAt ?? null,
      archivedReason: (t as any)?.archivedReason ?? null,
      assignees: Array.isArray(t.assignees) ? t.assignees : [],
    })
  );
}

/* =========================================
   Notes (si tu les utilises)
   ========================================= */
export interface Note {
  id: string;
  titre: string;           // titre affiché
  contenu: string;         // corps de la note
  archived: boolean;       // jamais de delete
  archivedAt?: string | null;
  archivedReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function normalizeNote(draft: Partial<Note>): Note {
  const now = new Date().toISOString();
  const titre = (draft.titre ?? draft.contenu ?? "")
    .toString()
    .split("\n")[0]
    .trim()
    .slice(0, 80) || "Sans titre";

  return {
    id:
      draft.id ??
      ((typeof crypto !== "undefined" && "randomUUID" in crypto)
        ? crypto.randomUUID()
        : "n-" + Math.random().toString(36).slice(2)),
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
  return items.map((n) => normalizeNote(n));
}
