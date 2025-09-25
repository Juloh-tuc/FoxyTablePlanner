export type Statut = "Terminé" | "En cours" | "En attente" | "Bloqué" | "Pas commencé";

export interface Task {
  id: string;
  title: string;
  admin: string;             // personne assignée
  team?: string;
  statut: Statut;
  priority?: "Faible" | "Moyen" | "Élevé";
  dueDate?: string;          // ISO
  startDate?: string;        // ISO (si utile pour la vue mois)
  // --- Nouveaux champs ---
  blocked?: boolean;         // miroir rapide du statut ou d’une dépendance
  blockedBy?: string;        // qui/quand/pourquoi (ex: "Attente maquettes - Léo")
  archived?: boolean;        // tache archivée (non visible par défaut)
  archivedAt?: string;       // ISO date d’archivage
}
