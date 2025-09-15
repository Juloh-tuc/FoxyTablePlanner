import type { Task } from "./types";

export const seed: Task[] = [
  { id:"t1", titre:"Tâche 1", admin:"👩 Ana", statut:"Terminé", priorite:"Moyen", debut:"2025-09-08", fin:"2025-09-09", budget:300, avancement:100, echeance:"2025-09-10" },
  { id:"t2", titre:"Tâche 2", admin:"🧑‍💻 Ben", statut:"En cours", priorite:"Élevé", debut:"2025-09-09", fin:"2025-09-10", budget:500, avancement:55,  echeance:"2025-09-15" },
  { id:"t3", titre:"Tâche 3", admin:"👩 Ana", statut:"En attente", priorite:"Moyen", debut:"2025-09-10", budget:120, avancement:0,   echeance:"2025-09-20" },
  { id:"t4", titre:"Tâche 4", admin:"🧑 Sam", statut:"Bloqué", priorite:"Élevé", debut:"2025-09-11", budget:0,   avancement:20,  bloquePar:"Dépendance X" },
  { id:"t5", titre:"Tâche 5", admin:"🧑 Sam", statut:"Pas commencé", priorite:"Faible", debut:"2025-09-12", budget:80, avancement:0 },
];
