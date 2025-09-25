// src/types.ts

/** Statut de la tâche */
export type Statut =
  | "Terminé"
  | "En cours"
  | "En attente"
  | "Bloqué"
  | "Pas commencé";

/** Priorité (optionnelle) */
export type Priorite = "Faible" | "Moyen" | "Élevé";

/**
 * Étiquette (label). On liste tes presets + on autorise d'autres valeurs custom.
 * Le `(string & {})` permet d'ajouter des étiquettes non prévues sans casser TS.
 */
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

/** Modèle de tâche central pour toute l'app */
export type Task = {
  id: string;
  titre: string;               // nom de la tâche (max 80 côté UI)
  admin: string;               // responsable/admin
  statut: Statut;

  priorite?: Priorite;
  debut?: string;              // ISO yyyy-mm-dd
  echeance?: string;           // ISO yyyy-mm-dd

  // 🔁 Bloqué = TEXTE (raison), et "bloqué par" = qui/quoi
  bloque?: string;             // ex: "Specs manquantes", "Attente PO"
  bloquePar?: string;          // ex: "Léo (Design)", "API Back"

  remarques?: string;          // max 250 côté UI
  etiquettes?: Etiquette[];    // labels multiples
  assignees?: string[];        // personnes assignées (initiales dans UI)

  budget?: number;             // si tu l'utilises dans la modale
  avancement?: number;         // 0–100

  archived?: boolean;          // tache archivée ?
  archivedAt?: string | null;  // ISO
};
