import React, { useEffect, useRef, useState } from "react";
import type { Task, Statut } from "../types";
import "./edit-task-modal.css";

type Props = {
  task: Task;                                  // brouillon à éditer (existant ou nouveau)
  onCancel: () => void;                        // ferme sans enregistrer
  onSave: (payload: Task) => void;             // enregistre les modifications
  onDelete: (taskId: string) => void;          // suppression (avec confirm géré à l'extérieur)
};

const STATUTS: Statut[] = ["Terminé", "En cours", "En attente", "Bloqué", "Pas commencé"];
const PRIOS = ["Faible", "Moyen", "Élevé"] as const;

export default function EditTaskModal({ task, onCancel, onSave, onDelete }: Props) {
  // On clone pour ne pas muter la prop
  const [draft, setDraft] = useState<Task>({ ...task });
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const update = <K extends keyof Task>(key: K, val: Task[K]) =>
    setDraft(prev => ({ ...prev, [key]: val }));

  const submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const titre = draft.titre?.trim();
    if (!titre) return;
    onSave({
      ...draft,
      titre,
      // garde des valeurs par défaut sûres
      priorite: draft.priorite ?? "Moyen",
      statut: draft.statut ?? "Pas commencé",
      avancement: typeof draft.avancement === "number" ? draft.avancement : 0,
      budget: typeof draft.budget === "number" ? draft.budget : 0,
      etiquettes: draft.etiquettes ?? [],
    });
  };

  return (
    <div className="etm-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="etm-panel" onClick={e => e.stopPropagation()}>
        <header className="etm-head">
          <h3 className="etm-title">{task.id ? "Modifier la tâche" : "Nouvelle tâche"}</h3>
          <button className="etm-close" onClick={onCancel} aria-label="Fermer">✕</button>
        </header>

        <form className="etm-grid" onSubmit={submit}>
          {/* Titre */}
          <label className="etm-field span-2">
            <span className="etm-label">Titre</span>
            <input
              ref={titleRef}
              className="etm-input"
              value={draft.titre ?? ""}
              onChange={e => update("titre", e.target.value)}
              placeholder="Intitulé de la tâche"
              required
            />
          </label>

          {/* Statut */}
          <label className="etm-field">
            <span className="etm-label">Statut</span>
            <select
              className="etm-select"
              value={draft.statut ?? "Pas commencé"}
              onChange={e => update("statut", e.target.value as Statut)}
            >
              {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          {/* Priorité */}
          <label className="etm-field">
            <span className="etm-label">Priorité</span>
            <select
              className="etm-select"
              value={draft.priorite ?? "Moyen"}
              onChange={e => update("priorite", e.target.value as Task["priorite"])}
            >
              {PRIOS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>

          {/* Début / Échéance */}
          <label className="etm-field">
            <span className="etm-label">Début</span>
            <input
              type="date"
              className="etm-input"
              value={draft.debut ?? ""}
              onChange={e => update("debut", e.target.value)}
            />
          </label>
          <label className="etm-field">
            <span className="etm-label">Échéance</span>
            <input
              type="date"
              className="etm-input"
              value={draft.echeance ?? ""}
              onChange={e => update("echeance", e.target.value)}
            />
          </label>

          {/* Admin (champ simple, tu pourras brancher PeoplePicker si tu veux) */}
          <label className="etm-field">
            <span className="etm-label">Admin / Assigné principal</span>
            <input
              className="etm-input"
              value={draft.admin ?? ""}
              onChange={e => update("admin", e.target.value)}
              placeholder="Nom"
            />
          </label>

          {/* Budget */}
          <label className="etm-field">
            <span className="etm-label">Budget</span>
            <input
              type="number"
              min={0}
              className="etm-input"
              value={draft.budget ?? 0}
              onChange={e => update("budget", Number(e.target.value))}
            />
          </label>

          {/* Avancement */}
          <label className="etm-field">
            <span className="etm-label">Avancement</span>
            <input
              type="range"
              min={0}
              max={100}
              className="etm-range"
              value={draft.avancement ?? 0}
              onChange={e => update("avancement", Number(e.target.value))}
            />
            <div className="etm-hint">{draft.avancement ?? 0}%</div>
          </label>

          {/* Bloqué par */}
          <label className="etm-field">
            <span className="etm-label">Bloqué par</span>
            <input
              className="etm-input"
              value={draft.bloquePar ?? ""}
              onChange={e => update("bloquePar", e.target.value)}
              placeholder="Ex : Attente validation, dépendance…"
            />
          </label>

          {/* Remarques */}
          <label className="etm-field span-2">
            <span className="etm-label">Remarques</span>
            <textarea
              className="etm-textarea"
              rows={3}
              maxLength={250}
              value={draft.remarques ?? ""}
              onChange={e => update("remarques", e.target.value.slice(0, 250))}
              placeholder="Détail (max 250 caractères)"
            />
          </label>

          {/* Actions */}
          <div className="etm-actions span-2">
            {task.id && (
              <button
                type="button"
                className="etm-btn danger"
                onClick={() => onDelete(task.id)}
                title="Supprimer la tâche"
              >
                Supprimer
              </button>
            )}
            <div className="spacer" />
            <button type="button" className="etm-btn" onClick={onCancel}>Annuler</button>
            <button type="submit" className="etm-btn primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
}
