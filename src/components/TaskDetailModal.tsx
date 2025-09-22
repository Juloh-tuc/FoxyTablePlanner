import type { Task } from "../types";
import "./task-detail-modal.css";

type Props = {
  task: Task;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  readOnly?: boolean; // en calendrier: true
};

const statusKey = (s: Task["statut"]) =>
  s === "Terminé" ? "done" :
  s === "En cours" ? "progress" :
  s === "Bloqué" ? "blocked" : "todo";

export default function TaskDetailModal({
  task,
  onClose,
  onEdit,
  onDelete,
  readOnly = true,
}: Props) {
  const assignees = task.assignees?.length ? task.assignees : (task.admin ? [task.admin] : []);

  return (
    <div className="tdm-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="tdm-panel" onClick={(e) => e.stopPropagation()}>
        <header className="tdm-head">
          <h3 className="tdm-title">{task.titre}</h3>
          <button className="tdm-close" onClick={onClose} aria-label="Fermer">✕</button>
        </header>

        <section className="tdm-grid">
          <div className="tdm-field">
            <span className="tdm-label">Statut</span>
            <span className={`tdm-chip is-${statusKey(task.statut)}`}>{task.statut}</span>
          </div>

          <div className="tdm-field">
            <span className="tdm-label">Priorité</span>
            <span className="tdm-pill">{task.priorite ?? "Moyen"}</span>
          </div>

          <div className="tdm-field">
            <span className="tdm-label">Assignés</span>
            <div className="tdm-avatars">
              {assignees.length ? assignees.map(n => (
                <span key={n} className="tdm-avatar" title={n}>
                  {n.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              )) : "—"}
            </div>
          </div>

          <div className="tdm-field">
            <span className="tdm-label">Début</span>
            <span className="tdm-text">{task.debut ?? "—"}</span>
          </div>

          <div className="tdm-field">
            <span className="tdm-label">Échéance</span>
            <span className="tdm-text">{task.echeance ?? "—"}</span>
          </div>

          <div className="tdm-field">
            <span className="tdm-label">Budget</span>
            <span className="tdm-text">{task.budget ?? 0}</span>
          </div>

          <div className="tdm-field">
            <span className="tdm-label">Avancement</span>
            <span className="tdm-text">{(task.avancement ?? 0) + "%"}</span>
          </div>

          <div className="tdm-field span-2">
            <span className="tdm-label">Bloqué par</span>
            <span className="tdm-text">{task.bloquePar?.trim() || "—"}</span>
          </div>

          <div className="tdm-field span-2">
            <span className="tdm-label">Remarques</span>
            <div className="tdm-box">{(task.remarques ?? "").trim() || "—"}</div>
          </div>

          {task.etiquettes?.length ? (
            <div className="tdm-field span-2">
              <span className="tdm-label">Étiquettes</span>
              <div className="tdm-tags">
                {task.etiquettes.map(lbl => <span key={lbl} className="tdm-tag">{lbl}</span>)}
              </div>
            </div>
          ) : null}
        </section>

        <footer className="tdm-actions">
          {!readOnly && (
            <button className="tdm-btn danger" onClick={() => onDelete(task.id)}>Supprimer</button>
          )}
          {!readOnly && (
            <button className="tdm-btn" onClick={() => onEdit(task)}>Modifier</button>
          )}
          <button className="tdm-btn primary" onClick={onClose}>Fermer</button>
        </footer>
      </div>
    </div>
  );
}
