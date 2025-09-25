// src/components/TaskDetailModal.tsx
import type { Task, Statut } from "../types";
import "./task-detail-modal.css";

/** On autorise bloque/bloquePar même si ton Task global ne les a pas encore */
type TaskCompat = Task & { bloque?: string; bloquePar?: string; debut?: string; echeance?: string; priorite?: "Faible" | "Moyen" | "Élevé"; etiquettes?: string[] };

type Props = {
  task: TaskCompat;
  onClose: () => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
};

const slug = (s: Statut | string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-");

const short = (iso?: string) => (iso ? iso.slice(0, 10) : "—");

/** ===== Composant ===== */
function TaskDetailModal({ task, onClose, onEdit, onDelete }: Props) {
  const assignees = task.assignees?.length
    ? task.assignees
    : task.admin
    ? [task.admin]
    : [];

  return (
    <div className="tdm-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="tdm-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="tdm-head">
          <div className="tdm-title-wrap">
            <h3 className="tdm-title">{task.titre || "Tâche"}</h3>
            <span className={`badge badge-${slug(task.statut)}`}>{task.statut}</span>
          </div>
          <button className="tdm-close" onClick={onClose} aria-label="Fermer">✕</button>
        </header>

        {/* Infos principales */}
        <section className="tdm-grid">
          <div className="tdm-field">
            <span className="tdm-label">Admin</span>
            <span className="tdm-text">{task.admin || "—"}</span>
          </div>

          <div className="tdm-field">
            <span className="tdm-label">Priorité</span>
            <span className="tdm-pill">{task.priorite ?? "Moyen"}</span>
          </div>

          <div className="tdm-field">
            <span className="tdm-label">Début</span>
            <span className="tdm-text">{short(task.debut)}</span>
          </div>

          <div className="tdm-field">
            <span className="tdm-label">Échéance</span>
            <span className="tdm-text">{short(task.echeance)}</span>
          </div>

          {/* Bloqué = TEXTE (raison) */}
          <div className="tdm-field span-2">
            <span className="tdm-label">Bloqué (raison)</span>
            <div className="tdm-box">{(task.bloque ?? "").trim() || "—"}</div>
          </div>

          {/* Bloqué par = TEXTE (qui/quoi) */}
          <div className="tdm-field span-2">
            <span className="tdm-label">Bloqué par (qui/quoi)</span>
            <div className="tdm-box">{(task.bloquePar ?? "").trim() || "—"}</div>
          </div>

          <div className="tdm-field span-2">
            <span className="tdm-label">Assignés</span>
            <div className="tdm-avatars">
              {assignees.length
                ? assignees.map((n) => (
                    <span key={n} className="tdm-avatar" title={n}>
                      {n
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  ))
                : "—"}
            </div>
          </div>

          {Array.isArray(task.etiquettes) && task.etiquettes.length > 0 && (
            <div className="tdm-field span-2">
              <span className="tdm-label">Étiquettes</span>
              <div className="tdm-tags">
                {task.etiquettes.map((lbl) => (
                  <span key={lbl} className="tdm-tag">
                    {lbl}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(task.remarques ?? "").trim() !== "" && (
            <div className="tdm-field span-2">
              <span className="tdm-label">Remarques</span>
              <div className="tdm-box">{task.remarques}</div>
            </div>
          )}
        </section>

        {/* Actions */}
        <footer className="tdm-actions">
          <button className="tdm-btn primary" onClick={() => onEdit(task.id)}>✏️ Modifier</button>
          <button className="tdm-btn danger ghost" onClick={() => onDelete(task.id)}>🗑️ Supprimer…</button>
          <button className="tdm-btn" onClick={onClose}>Fermer</button>
        </footer>
      </div>
    </div>
  );
}

/** On expose à la fois l’export nommé ET l’export par défaut */
export { TaskDetailModal };
export default TaskDetailModal;
