// src/components/EditTaskModal.tsx
import { useState } from "react";
import ReactDOM from "react-dom";
import "./edit-task-modal.css";
import type { Task, Statut, Priorite } from "../types";

/* ---------- Types & helpers ---------- */

// Cohérent avec src/types.ts (inclut "En attente")
const STATUTS: Statut[] = ["Pas commencé", "En cours", "En attente", "Bloqué", "Terminé"];

/** uniq robuste: accepte string | null | undefined en entrée, renvoie string[] */
const uniq = (arr: Array<string | null | undefined>): string[] =>
  Array.from(
    new Set(
      arr
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((s) => s.trim())
    )
  );

/** coerce vers string pour value des <input> contrôlés */
const s = (v?: string | null) => v ?? "";

/** borne pour le pourcentage d’avancement */
const toPct = (n: unknown) => {
  const v = Number(n);
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
};

type Props = {
  open: boolean;
  task: Task;
  admins: string[];
  onSave: (updated: Task) => void;
  onClose: () => void;
  onAskArchiveDelete: (t: Task) => void;
};

export default function EditTaskModal({
  open,
  task,
  admins,
  onSave,
  onClose,
  onAskArchiveDelete,
}: Props) {
  const [draft, setDraft] = useState<Task>({ ...task });
  const [assigneeInput, setAssigneeInput] = useState<string>("");

  const change = <K extends keyof Task>(key: K, value: Task[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const addAssignee = () => {
    const v = assigneeInput.trim();
    if (!v) return;
    setDraft((d) => ({ ...d, assignees: uniq([...(d.assignees ?? []), v]) }));
    setAssigneeInput("");
  };

  const removeAssignee = (name: string) =>
    setDraft((d) => ({
      ...d,
      assignees: (d.assignees ?? []).filter((a) => a !== name),
    }));

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="ft-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="ft-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ft-modal-header">
          <h3 className="ft-modal-title">Modifier la tâche</h3>
          <button className="ft-icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="tdm-grid">
          <label className="tdm-field">
            <span className="tdm-label">Titre</span>
            <input
              className="cell-input"
              value={s(draft.titre)}
              onChange={(e) => change("titre", e.target.value)}
              placeholder="Nom de la tâche"
            />
          </label>

          <label className="tdm-field">
            <span className="tdm-label">Admin</span>
            <input
              list="admins-list"
              className="cell-input"
              value={s(draft.admin)}
              onChange={(e) => {
                const val = e.target.value.trim();
                // Task.admin est requis (string) -> si vide, on garde l'existant
                change("admin", (val !== "" ? val : draft.admin) as Task["admin"]);
              }}
              placeholder="Sélectionner ou saisir…"
            />
          </label>

          <label className="tdm-field">
            <span className="tdm-label">Statut</span>
            <select
              className="ft-select"
              value={draft.statut}
              onChange={(e) => change("statut", e.target.value as Statut)}
            >
              {STATUTS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </label>

          <label className="tdm-field">
            <span className="tdm-label">Priorité</span>
            <select
              className="ft-select"
              value={draft.priorite ?? ""} // contrôlé: string
              onChange={(e) => {
                const v = e.target.value as "" | Priorite;
                change("priorite", v === "" ? undefined : v);
              }}
            >
              <option value="">—</option>
              <option value="Élevé">Élevé</option>
              <option value="Moyen">Moyen</option>
              <option value="Faible">Faible</option>
            </select>
          </label>

          <label className="tdm-field">
            <span className="tdm-label">Avancement (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              step={5}
              className="cell-input"
              value={typeof draft.avancement === "number" ? draft.avancement : 0}
              onChange={(e) => change("avancement", toPct(e.target.value) as any)}
            />
          </label>

          <label className="tdm-field">
            <span className="tdm-label">Bloqué</span>
            <input
              className="cell-input"
              placeholder="Raison du blocage"
              value={s(draft.bloque)}
              onChange={(e) => {
                const v = e.target.value.trim();
                change("bloque", v === "" ? undefined : v);
              }}
            />
          </label>

          <label className="tdm-field">
            <span className="tdm-label">Bloqué par</span>
            <input
              className="cell-input"
              placeholder="Personne/service bloquant"
              value={s(draft.bloquePar)}
              onChange={(e) => {
                const v = e.target.value.trim();
                change("bloquePar", v === "" ? undefined : v);
              }}
            />
          </label>

          <label className="tdm-field span-2">
            <span className="tdm-label">Remarques</span>
            <textarea
              className="remarks-textarea"
              rows={4}
              value={s(draft.remarques)}
              onChange={(e) => {
                const v = e.target.value;
                change("remarques", v.trim() === "" ? undefined : v);
              }}
              placeholder="Notes internes, contexte…"
            />
          </label>

          <div className="tdm-field span-2">
            <span className="tdm-label">Assignees (multi)</span>
            <div className="assignees-chips">
              {(draft.assignees ?? []).map((a) => (
                <span key={a} className="chip">
                  {a}
                  <button
                    className="chip-x"
                    onClick={() => removeAssignee(a)}
                    title="Retirer"
                    type="button"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="assignees-add">
              <input
                list="admins-list"
                className="cell-input"
                placeholder="Saisir un nom puis Entrée"
                value={assigneeInput}
                onChange={(e) => setAssigneeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAssignee();
                  }
                }}
              />
              <button className="ft-btn" type="button" onClick={addAssignee}>
                Ajouter
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="ft-modal-actions space-between">
          <div>
            <button
              className="ft-btn danger"
              type="button"
              onClick={() => onAskArchiveDelete(draft)}
            >
              Archiver / Supprimer…
            </button>
          </div>
          <div>
            <button className="ft-btn ghost" type="button" onClick={onClose}>
              Annuler
            </button>
            <button
              className="ft-btn primary"
              type="button"
              onClick={() =>
                onSave({
                  ...draft,
                  // titre: string (requis) — on garde la valeur précédente si vide
                  titre: s(draft.titre).trim() || draft.titre,
                  // admin: string (requis)
                  admin: s(draft.admin).trim() || draft.admin,
                  // champs optionnels: undefined si vide (pas de null)
                  bloque: s(draft.bloque).trim() === "" ? undefined : s(draft.bloque),
                  bloquePar: s(draft.bloquePar).trim() === "" ? undefined : s(draft.bloquePar),
                  remarques: s(draft.remarques).trim() === "" ? undefined : s(draft.remarques),
                  priorite: draft.priorite ?? undefined,
                  assignees: uniq(draft.assignees ?? []),
                  avancement:
                    typeof draft.avancement === "number"
                      ? toPct(draft.avancement)
                      : 0,
                })
              }
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
