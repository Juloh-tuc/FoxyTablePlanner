import { useMemo, useState } from "react";
import type { Task } from "../types";
import { canLink, wouldCreateCycle } from "../utils/deps";

export interface DependencyPickerProps {
  /** La tâche source depuis laquelle on crée le lien */
  source: Task;
  /** Toutes les tâches (id != source.id idéalement filtré par le parent) */
  tasks: Task[];
  /** Index par id pour l’anti-cycle */
  byId: Map<string, Task>;
  /**
   * Mode de création :
   * - "blocks"    : on crée un lien source -> target   (source bloque target)
   * - "dependsOn" : on crée un lien target -> source   (source dépend de target)
   */
  mode?: "blocks" | "dependsOn";
  /** Callback quand on choisit une cible */
  onSelect: (target: Task) => void;
  /** Fermer la popup */
  onClose: () => void;
  /** Titre optionnel du modal */
  title?: string;
}

export default function DependencyPicker({
  source,
  tasks,
  byId,
  mode = "blocks",
  onSelect,
  onClose,
  title,
}: DependencyPickerProps) {
  const [q, setQ] = useState("");

  const candidates = useMemo(() => {
    const ql = q.trim().toLowerCase();

    // On ne propose pas la source elle-même, ni les archivées
    const base = tasks.filter((t) => t.id !== source.id && !t.archived);

    // Politique (même kind / même epic / whitelist) + anti-cycle
    const filtered = base.filter((t) => {
      // Politique
      const pol = canLink(mode === "blocks" ? source : t, mode === "blocks" ? t : source);
      if (!pol.ok) return false;

      // Anti-cycle: vérifie l'orientation réelle de l'edge à créer
      // mode "blocks"    : on ajoute edge  source -> t
      // mode "dependsOn" : on ajoute edge  t -> source
      if (mode === "blocks") {
        return !wouldCreateCycle(byId, source.id, t.id);
      } else {
        return !wouldCreateCycle(byId, t.id, source.id);
      }
    });

    // Recherche texte
    const byText = filtered.filter((t) => {
      if (!ql) return true;
      const hay = [
        t.id,
        t.titre ?? t.title ?? "",
        t.kind ?? "",
        t.domain ?? "",
        t.epicId ?? "",
        ...(t.etiquettes ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(ql);
    });

    // Tri simple par titre
    byText.sort((a, b) => (a.titre ?? a.title ?? "").localeCompare(b.titre ?? b.title ?? ""));
    return byText.slice(0, 50);
  }, [q, tasks, byId, source, mode]);

  return (
    <div className="ft-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ft-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ft-modal-head">
          <h3>
            {title ??
              (mode === "blocks"
                ? `Lier une tâche bloquée par « ${source.titre || source.title} »`
                : `Lier une dépendance de « ${source.titre || source.title} »`)}
          </h3>
          <button className="ft-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>

        <div className="ft-modal-body">
          <input
            className="ft-input"
            placeholder="Rechercher par titre, id, epic, tag…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <ul className="ft-list" style={{ marginTop: 12 }}>
            {candidates.map((t) => (
              <li key={t.id}>
                <button
                  className="ft-item"
                  onClick={() => onSelect(t)}
                  title={
                    mode === "blocks"
                      ? `${source.titre || source.title} → bloque → ${t.titre || t.title}`
                      : `${source.titre || source.title} → dépend de → ${t.titre || t.title}`
                  }
                >
                  <div className="ft-item-title">{t.titre || t.title}</div>
                  <div className="ft-item-meta">
                    <span className="badge">#{t.id}</span>
                    {t.kind && <span className="badge">{t.kind}</span>}
                    {t.domain && <span className="badge">{t.domain}</span>}
                    {t.epicId && <span className="badge">epic:{t.epicId}</span>}
                    {(t.etiquettes ?? []).slice(0, 3).map((tag) => (
                      <span key={tag} className="badge">
                        {tag}
                      </span>
                    ))}
                    <span className="badge" style={{ marginLeft: "auto" }}>
                      {t.statut}
                    </span>
                  </div>
                </button>
              </li>
            ))}

            {candidates.length === 0 && (
              <li className="ft-empty">Aucun résultat (filtré par politique/anti-cycle).</li>
            )}
          </ul>
        </div>

        <div className="ft-modal-foot">
          <button className="ft-btn" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
