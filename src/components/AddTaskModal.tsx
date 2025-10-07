// src/components/AddTaskModal.tsx
import { useEffect, useMemo, useState } from "react";
import type { Task, Statut, Etiquette, Priorite } from "../types";
import { STATUTS_ALL, PRIORITES_ALL } from "../types";
import "../styles/add-task-modal.css"; // 👈 styles dédiés au formulaire

type Props = {
  open: boolean;
  admins: string[];
  tags: Etiquette[];
  onCreate: (task: Task) => Promise<void> | void;
  onClose: () => void;
};

const STATUTS   = [...STATUTS_ALL];
const PRIORITES = [...PRIORITES_ALL];

export default function AddTaskModal({ open, admins, tags, onCreate, onClose }: Props) {
  const [titre, setTitre] = useState("");
  const [admin, setAdmin] = useState("");
  const [statut, setStatut] = useState<Statut>("Pas commencé");
  const [priorite, setPriorite] = useState<Priorite>("Moyen");
  const [debut, setDebut] = useState("");
  const [echeance, setEcheance] = useState("");
  const [etiquettes, setEtiquettes] = useState<Etiquette[]>([]);
  const [remarques, setRemarques] = useState("");
  const [newTag, setNewTag] = useState(""); // 👈 étiquette perso
  const [submitting, setSubmitting] = useState(false);

  // étiquettes proposées = presets + tout ce qui existe déjà
  const allTags = useMemo<Etiquette[]>(() => {
    return Array.from(new Set([...tags, ...etiquettes]));
  }, [tags, etiquettes]);

  useEffect(() => {
    if (!open) {
      setTitre(""); setAdmin(""); setStatut("Pas commencé"); setPriorite("Moyen");
      setDebut(""); setEcheance(""); setEtiquettes([]); setRemarques(""); setNewTag(""); setSubmitting(false);
    }
  }, [open]);

  const canSubmit = useMemo(() => titre.trim().length > 0 && !submitting, [titre, submitting]);
  if (!open) return null;

  const addTag = () => {
    const v = newTag.trim();
    if (!v) return;
    setEtiquettes(prev => (prev.includes(v as Etiquette) ? prev : [...prev, v as Etiquette]));
    setNewTag("");
  };

  return (
    <div className="ft-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="ft-modal ft-lg" onClick={(e) => e.stopPropagation()}>
        <div className="ft-modal-header">
          <h3 className="ft-modal-title">Ajouter une tâche</h3>
          <button className="ft-icon-btn" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="ft-form">
          <label className="ft-field">
            <span className="ft-label">Titre *</span>
            <input
              className="cell-input"
              value={titre}
              onChange={(e) => setTitre(e.target.value.slice(0, 80))}
              placeholder="Ex: Corriger le bug d’auth"
              autoFocus
            />
          </label>

          <div className="ft-grid-2">
            <label className="ft-field">
              <span className="ft-label">Admin</span>
              <input
                className="cell-input"
                value={admin}
                onChange={(e) => setAdmin(e.target.value)}
                list="admins-list"
                placeholder="Nom du responsable"
              />
            </label>
            <label className="ft-field">
              <span className="ft-label">Statut</span>
              <select
                className="cell-input"
                value={statut}
                onChange={(e) => setStatut(e.target.value as Statut)}
              >
                {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>

          <div className="ft-grid-2">
            <label className="ft-field">
              <span className="ft-label">Priorité</span>
              <select
                className="cell-input"
                value={priorite}
                onChange={(e) => setPriorite(e.target.value as Priorite)}
              >
                {PRIORITES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>

            <div className="ft-grid-2 inner-dates">
              <label className="ft-field">
                <span className="ft-label">Début</span>
                <input
                  className="cell-input"
                  type="date"
                  value={debut}
                  onChange={(e) => setDebut(e.target.value)}
                />
              </label>
              <label className="ft-field">
                <span className="ft-label">Échéance</span>
                <input
                  className="cell-input"
                  type="date"
                  value={echeance}
                  onChange={(e) => setEcheance(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="ft-field">
            <span className="ft-label">Étiquettes</span>

            {/* saisie d'une étiquette perso */}
            <div className="ft-row">
              <input
                className="cell-input"
                placeholder="Ajouter une étiquette (Ex: SEO, Urgent…)"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              />
              <button className="ft-btn" type="button" onClick={addTag}>Ajouter</button>
            </div>

            <div className="tags-picker">
              {allTags.map((lbl) => (
                <label key={lbl} className="tag-option">
                  <input
                    type="checkbox"
                    checked={etiquettes.includes(lbl)}
                    onChange={() =>
                      setEtiquettes(prev => prev.includes(lbl) ? prev.filter(x => x !== lbl) : [...prev, lbl])
                    }
                  />
                  <span>{lbl}</span>
                </label>
              ))}
              {!allTags.length && <div className="ft-empty">Aucune étiquette.</div>}
            </div>
          </div>

          <label className="ft-field">
            <span className="ft-label">Remarques</span>
            <textarea
              className="cell-input"
              rows={3}
              value={remarques}
              onChange={(e) => setRemarques(e.target.value.slice(0, 250))}
            />
          </label>
        </div>

        <div className="ft-modal-actions end">
          <button className="ft-btn ghost" onClick={onClose} disabled={submitting}>Annuler</button>
          <button
            className="ft-btn"
            disabled={!canSubmit}
            onClick={async () => {
              if (!canSubmit) return;
              setSubmitting(true);

              const newTask: Task = {
                id: (typeof crypto !== "undefined" && "randomUUID" in crypto)
                  ? crypto.randomUUID()
                  : "t-" + Math.random().toString(36).slice(2, 10),
                titre: titre.trim(),
                admin: admin.trim(),
                statut,
                priorite,
                debut: debut || undefined,
                echeance: echeance || undefined,
                dependsOn: [],
                blocks: [],
                bloque: "",
                bloquePar: "",
                remarques: remarques.trim(),
                etiquettes: etiquettes,
                assignees: [],
                avancement: 0,
                budget: 0,
                archived: false,
                archivedAt: null,
              };

              await onCreate(newTask);
              setSubmitting(false);
            }}
          >
            Créer
          </button>
        </div>

        {/* On peut retirer cette datalist si elle existe déjà dans la page.
            Ici je la garde pour l’autonomie du composant. */}
        <datalist id="admins-list">{admins.map(a => <option key={a} value={a} />)}</datalist>
      </div>
    </div>
  );
}
