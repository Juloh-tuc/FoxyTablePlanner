import type { Task, Statut } from "../types";
import "./task-detail-modal.css";

/** Compat: on autorise des champs optionnels courants */
type TaskCompat = Task & {
  bloque?: string;            // notes libres (raison)
  bloquePar?: string;         // notes libres (qui/quoi)
  debut?: string;
  echeance?: string;
  priorite?: "Faible" | "Moyen" | "Élevé";
  etiquettes?: string[];
  dependsOn?: string[];       // ids des tâches dont celle-ci dépend
  blocks?: string[];          // ids des tâches que celle-ci bloque
};

type Props = {
  task: TaskCompat;
  onClose: () => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;

  /** Optionnel : résout un ID de tâche vers son titre. */
  resolveTitleById?: (id: string) => string | undefined;
};

/** slug sans \p{Diacritic} (compat TS/Babel) */
const slug = (s: Statut | string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");

const short = (iso?: string) => (iso ? iso.slice(0, 10) : "—");

function renderListFromIds(ids: string[] | undefined, resolve?: (id: string) => string | undefined) {
  if (!ids || ids.length === 0) return "—";
  if (!resolve) return ids.join(", ");
  const titles = ids.map(id => resolve(id)).filter(Boolean) as string[];
  return titles.length ? titles.join(", ") : "—";
}

/** ===== Composant ===== */
export default function TaskDetailModal({
  task,
  onClose,
  onEdit,
  onDelete,
  resolveTitleById,
}: Props) {
  const assignees = task.assignees?.length
    ? task.assignees
    : task.admin
    ? [task.admin]
    : [];

  const blocksText = renderListFromIds(task.blocks, resolveTitleById);
  const dependsText = renderListFromIds(task.dependsOn, resolveTitleById);

  const hasBlockNotes = (task.bloque ?? "").trim() !== "" || (task.bloquePar ?? "").trim() !== "";

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

          {/* Structuration */}
          <div className="tdm-field">
            <span className="tdm-label">Kind</span>
            <span className="tdm-text">{task.kind ?? "—"}</span>
          </div>
          <div className="tdm-field">
            <span className="tdm-label">Domain</span>
            <span className="tdm-text">{task.domain ?? "—"}</span>
          </div>
          <div className="tdm-field">
            <span className="tdm-label">Epic</span>
            <span className="tdm-text">{task.epicId ?? "—"}</span>
          </div>

          {/* Relations structurelles */}
          <div className="tdm-field span-2">
            <span className="tdm-label">Bloque</span>
            <div className="tdm-box">{blocksText}</div>
          </div>

          <div className="tdm-field span-2">
            <span className="tdm-label">Bloqué par</span>
            <div className="tdm-box">{dependsText}</div>
          </div>

          {/* Assignés */}
          <div className="tdm-field span-2">
            <span className="tdm-label">Assignés</span>
            <div className="tdm-avatars">
              {assignees.length
                ? assignees.map((n) => (
                    <span key={n} className="tdm-avatar" title={n}>
                      {n.split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  ))
                : "—"}
            </div>
          </div>

          {/* Étiquettes */}
          {Array.isArray(task.etiquettes) && task.etiquettes.length > 0 && (
            <div className="tdm-field span-2">
              <span className="tdm-label">Étiquettes</span>
              <div className="tdm-tags">
                {task.etiquettes.map((lbl) => (
                  <span key={lbl} className="tdm-tag">{lbl}</span>
                ))}
              </div>
            </div>
          )}

          {/* Notes de blocage (facultatif, legacy) */}
      {/* Notes de blocage (facultatif, legacy) */}
{hasBlockNotes &&
  ((task.dependsOn?.length ?? 0) === 0 && (task.blocks?.length ?? 0) === 0) && (
    <>
      <div className="tdm-field span-2">
        <span className="tdm-label">Raison du blocage (notes)</span>
        <div className="tdm-box">{(task.bloque ?? "").trim() || "—"}</div>
      </div>

      <div className="tdm-field span-2">
        <span className="tdm-label">Bloqué par (notes)</span>
        <div className="tdm-box">{(task.bloquePar ?? "").trim() || "—"}</div>
      </div>
    </>
)}

          {/* Remarques */}
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
