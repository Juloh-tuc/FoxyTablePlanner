// src/components/EditTaskModal.tsx
import { useEffect, useState } from "react";
import type { Task, Statut, Priorite, Etiquette } from "../types";

/** Options (cohérent avec l'app) */
const STATUTS: Statut[] = ["Terminé", "En cours", "En attente", "Bloqué", "Pas commencé"];
const PRESET_TAGS: Etiquette[] = ["Web", "Front-BO", "Back-FO", "Front-FO", "Back-BO", "API", "Design", "Mobile", "Autre"];

type Props = {
  task: Task;
  onClose: () => void;
  onSave: (updated: Task) => void;
};

export default function EditTaskModal({ task, onClose, onSave }: Props) {
  // --- Form state (aligné avec src/types.ts) ---
  const [titre, setTitre] = useState(task.titre ?? "");
  const [admin, setAdmin] = useState(task.admin ?? "");
  const [statut, setStatut] = useState<Statut>(task.statut);
  const [priorite, setPriorite] = useState<Priorite | undefined>(task.priorite);
  const [debut, setDebut] = useState(task.debut ?? "");
  const [echeance, setEcheance] = useState(task.echeance ?? "");

  // Bloqué (raison) + Bloqué par
  const [bloque, setBloque] = useState(task.bloque ?? "");
  const [bloquePar, setBloquePar] = useState(task.bloquePar ?? "");

  const [remarques, setRemarques] = useState(task.remarques ?? "");
  const [etiquettes, setEtiquettes] = useState<Etiquette[]>(
    Array.isArray(task.etiquettes) ? task.etiquettes : []
  );

  // Reset quand on change de tâche
  useEffect(() => {
    setTitre(task.titre ?? "");
    setAdmin(task.admin ?? "");
    setStatut(task.statut);
    setPriorite(task.priorite);
    setDebut(task.debut ?? "");
    setEcheance(task.echeance ?? "");
    setBloque(task.bloque ?? "");
    setBloquePar(task.bloquePar ?? "");
    setRemarques(task.remarques ?? "");
    setEtiquettes(Array.isArray(task.etiquettes) ? task.etiquettes : []);
  }, [task]);

  // Helpers
  const toggleTag = (lbl: Etiquette) => {
    setEtiquettes((prev) => (prev.includes(lbl) ? prev.filter((t) => t !== lbl) : [...prev, lbl]));
  };

  const save = () => {
    const updated: Task = {
      ...task,
      titre: (titre || "").slice(0, 80).trim(),
      admin: (admin || "").trim(),
      statut,
      priorite,
      debut: debut || undefined,
      echeance: echeance || undefined,
      bloque: (bloque || "").slice(0, 200).trim(),
      bloquePar: (bloquePar || "").slice(0, 200).trim(),
      remarques: (remarques || "").slice(0, 250),
      etiquettes: [...etiquettes],
    };
    onSave(updated);
  };

  return (
    <div className="ft-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="ft-modal ft-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ft-modal-header">
          <h3 className="ft-modal-title">Éditer la tâche</h3>
          <button className="ft-icon-btn" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {/* Form grid (réutilise les styles communs) */}
        <div className="tdm-grid" style={{ marginTop: 8 }}>
          {/* Titre */}
          <div className="tdm-field span-2">
            <span className="tdm-label">Titre (max 80)</span>
            <input
              className="cell-input"
              value={titre}
              onChange={(e) => setTitre(e.target.value.slice(0, 80))}
              placeholder="Nom de la tâche"
              autoFocus
              maxLength={80}
            />
            <div className="remarks-meta">{(titre ?? "").length}/80</div>
          </div>

          {/* Admin */}
          <div className="tdm-field">
            <span className="tdm-label">Admin</span>
            <input
              className="cell-input"
              value={admin}
              onChange={(e) => setAdmin(e.target.value)}
              placeholder="Responsable…"
              list="admins-list"
            />
          </div>

          {/* Statut */}
          <div className="tdm-field">
            <span className="tdm-label">Statut</span>
            <select className="cell-input" value={statut} onChange={(e) => setStatut(e.target.value as Statut)}>
              {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Priorité */}
          <div className="tdm-field">
            <span className="tdm-label">Priorité</span>
            <select
              className="cell-input"
              value={priorite ?? ""}
              onChange={(e) => setPriorite((e.target.value || "") as Priorite || undefined)}
            >
              <option value="">—</option>
              <option value="Faible">Faible</option>
              <option value="Moyen">Moyen</option>
              <option value="Élevé">Élevé</option>
            </select>
          </div>

          {/* Début */}
          <div className="tdm-field">
            <span className="tdm-label">Début</span>
            <input type="date" className="cell-input" value={debut || ""} onChange={(e) => setDebut(e.target.value)} />
          </div>

          {/* Échéance */}
          <div className="tdm-field">
            <span className="tdm-label">Échéance</span>
            <input type="date" className="cell-input" value={echeance || ""} onChange={(e) => setEcheance(e.target.value)} />
          </div>

          {/* Bloqué (raison) */}
          <div className="tdm-field span-2">
            <span className="tdm-label">Bloqué (raison)</span>
            <input
              className="cell-input"
              value={bloque}
              onChange={(e) => setBloque(e.target.value.slice(0, 200))}
              placeholder="Ex: En attente de specs / budget / validation…"
              maxLength={200}
            />
            <div className="remarks-meta">{(bloque ?? "").length}/200</div>
          </div>

          {/* Bloqué par (qui/quoi) */}
          <div className="tdm-field span-2">
            <span className="tdm-label">Bloqué par (qui/quoi)</span>
            <input
              className="cell-input"
              value={bloquePar}
              onChange={(e) => setBloquePar(e.target.value.slice(0, 200))}
              placeholder="Ex: Maquettes (Léo) / API (Team Back)…"
              maxLength={200}
            />
            <div className="remarks-meta">{(bloquePar ?? "").length}/200</div>
          </div>

          {/* Étiquettes */}
          <div className="tdm-field span-2">
            <span className="tdm-label">Étiquettes</span>
            <div className="tag-popover-list" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {PRESET_TAGS.map((lbl) => (
                <label key={lbl} className="tag-option">
                  <input type="checkbox" checked={etiquettes.includes(lbl)} onChange={() => toggleTag(lbl)} />
                  <span>{lbl}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Remarques */}
          <div className="tdm-field span-2">
            <span className="tdm-label">Remarques (max 250)</span>
            <textarea
              className="remarks-textarea"
              value={remarques}
              onChange={(e) => setRemarques(e.target.value.slice(0, 250))}
              placeholder="Détails complets, liens, bloquants…"
              maxLength={250}
            />
            <div className="remarks-meta">{(remarques ?? "").length}/250</div>
          </div>
        </div>

        {/* Actions */}
        <div className="ft-modal-actions end" style={{ marginTop: 8 }}>
          {/* ⬇️ AJOUT du modificateur `primary` pour le style violet */}
          <button className="ft-btn primary save" onClick={save}>Enregistrer</button>
          <button className="ft-btn ghost" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}
