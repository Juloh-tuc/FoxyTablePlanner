// Types partagés

export type Statut =
  | "Terminé"
  | "En cours"
  | "En attente"
  | "Bloqué"
  | "Pas commencé";

export type Priorite = "Faible" | "Moyen" | "Élevé";

/** Étiquettes proposées (tu peux en ajouter d'autres si besoin) */
export type Etiquette =
  | "Site Web"
  | "Front - BO"
  | "Back - FO"
  | "Front - FO"
  | "Back - BO"
  | "API"
  | "Design"
  | "Mobile"
  | "Autre";

export interface Task {
  id: string;
  titre: string;

  debut?: string;      // YYYY-MM-DD
  echeance?: string;   // YYYY-MM-DD

  admin?: string;
  statut: Statut;
  priorite?: Priorite;

  budget?: number;
  avancement?: number; // 0..100
  bloquePar?: string;
  remarques?: string;

  /** NOUVEAU : liste d’étiquettes (tags) pour la tâche */
  etiquettes?: Etiquette[];
}
