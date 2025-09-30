// -- Statuts / Priorités
export type Statut = "Terminé" | "En cours" | "En attente" | "Bloqué" | "Pas commencé";
export type Priorite = "Faible" | "Moyen" | "Élevé";

/**
 * Modèle de tâche.
 * NOTE: pour ne rien casser, on garde tes champs existants
 * et on ajoute les nouveaux + quelques alias optionnels (titre/priorite/etc.).
 */
export interface Task {
  id: string;

  // ---- Nommage actuel (anglais) ----
  title: string;          // nom "anglais" existant
  priority?: Priorite;    // priorité "anglaise"
  dueDate?: string;       // ISO (échéance)
  startDate?: string;     // ISO (début)

  admin: string;          // personne assignée
  team?: string;
  statut: Statut;

  // --- Nouveaux champs pour les dépendances ---
  /** Dépendances ENTRANTES: celles qui doivent être "Terminé" avant de commencer */
  dependsOn?: string[];
  /** Dépendances SORTANTES: celles que cette tâche bloque tant qu’elle n’est pas "Terminé" */
  blocks?: string[];

  // --- Blocage / Archivage (déjà présents) ---
  blocked?: boolean;      // miroir rapide (peut être piloté par les deps)
  blockedBy?: string;     // texte libre (ex: "Attente maquettes - Léo")
  archived?: boolean;
  archivedAt?: string;

  // --------- ALIAS (optionnels) pour compat TS avec le reste de ton code ---------
  // Ces champs ne sont pas "obligatoires", ils existent uniquement pour ne pas casser
  // les composants qui utilisent encore le nommage FR (titre/priorite/etc.).

  /** Alias FR du titre. Si défini, l'UI peut afficher `titre` en priorité. */
  titre?: string;
  /** Alias FR de priority */
  priorite?: Priorite;
  /** Participants multiples */
  assignees?: string[];
  /** Progression 0–100 */
  avancement?: number;
  /** Raison du blocage (texte) */
  bloque?: string;
  /** Qui/quoi bloque (texte) */
  bloquePar?: string;
  /** Notes internes */
  remarques?: string;
  /** Alias FR des dates (si certaines vues utilisent encore ces noms) */
  debut?: string;
  echeance?: string;
}
