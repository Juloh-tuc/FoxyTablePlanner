// ---------------- Types de base ----------------
export type Statut =
  | "Pas commencé"
  | "En attente"
  | "En cours"
  | "Bloqué"
  | "Terminé";

export type Priorite = "Faible" | "Moyen" | "Élevé";

// ---------------- Étiquettes ----------------
// ⚠️ Aligne bien les valeurs sur celles utilisées dans TAGS de PlannerTable.tsx
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

// ---------------- Tâche ----------------
export type Task = {
  id: string;
  titre: string;
  debut?: string;
  echeance?: string;
  admin?: string;
  assignees?: string[];
  statut: Statut;
  priorite?: Priorite;
  budget?: number;
  avancement?: number;
  etiquettes?: Etiquette[]; // ✅ typé strictement
  bloquePar?: string;
  remarques?: string;
  dependencies?: string; // champ optionnel si tu veux le garder
};
