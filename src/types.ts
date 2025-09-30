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

/** Modèle de tâche — **unique** pour toute l'app */
export interface Task {
  id: string;

  // ---- Champs FR (principaux)
  titre: string;           // nom affiché
  admin: string;           // responsable principal (toujours une string, peut être vide)
  team?: string;
  statut: Statut;

  priorite?: Priorite;
  debut?: string;          // ISO yyyy-mm-dd
  echeance?: string;       // ISO yyyy-mm-dd

  // ---- Dépendances
  /** celles qui bloquent cette tâche (entrantes) */
  dependsOn?: string[];
  /** celles que cette tâche bloque (sortantes) */
  blocks?: string[];

  // ---- Blocages / remarques
  bloque?: string;         // raison (texte)
  bloquePar?: string;      // qui/quoi
  remarques?: string;      // notes internes

  // ---- Étiquettes / personnes / progression
  etiquettes?: Etiquette[];

  /** Désormais **toujours** un tableau (éventuellement vide) */
  assignees: string[];

  avancement?: number;     // 0–100
  budget?: number;

  // ---- Archivage
  archived?: boolean;
  archivedAt?: string | null;

  // ---------- ALIAS (facultatifs) pour compat avec code existant ----------
  // Si certains composants utilisent encore l’anglais, ces champs évitent les erreurs.
  title?: string;          // alias de `titre`
  priority?: Priorite;     // alias de `priorite`
  startDate?: string;      // alias de `debut`
  dueDate?: string;        // alias de `echeance`

  // Alias de blocage en anglais (si déjà utilisés quelque part)
  blocked?: boolean;       // miroir bool si tu veux, optionnel
  blockedBy?: string;      // alias de `bloque`
}

/* === Notes d’intégration (à appliquer côté code, pas ici) ==================
1) Partout où tu crées / charges des tâches, assure `assignees` défini :
   - à la création      : assignees: []
   - au chargement seed : t.assignees ??= []
   - lors des updates   : assignees: [...new Set(nextList)].filter(Boolean)

2) Si tu avais du code qui mettait `assignees` à `undefined`,
   remplace par un tableau vide `[]`.

3) `admin` reste une string requise (peut être vide ""), donc ne lui mets plus `undefined`.
========================================================================== */
