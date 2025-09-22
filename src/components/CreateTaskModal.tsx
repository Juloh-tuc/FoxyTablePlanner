import { useEffect, useRef, useState } from "react";
import type { Task, Statut } from "../types";
import "./edit-task-modal.css";

type Props = {
  onCreate: (t: Task) => void;
  onClose: () => void;
};

const PRIOS = ["Faible", "Moyen", "Élevé"] as const;

const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);

export default function CreateTaskModal({ onCreate, onClose }: Props) {
  const [titre, setTitre] = useState("");
  const [statut, setStatut] = useState<Statut>("Pas commencé");
  const [priorite, setPriorite] = useState<Task["priorite"]>("Moyen");
  const [debut, setDebut] = useState<string>(today());
  const [echeance, setEcheance] = useState<string>("");
  const [budget, setBudget] = useState<number>(0);
  const [avancement, setAvancement] = useState<number>(0);
  const [remarques, setRemarques] = useState<string>("");

  const firstRef = useRef<HTMLInputElement>(null);
  useEffect(() => { firstRef.current?.focus(); }, []);

  const submit = () => {
    const t: Task = {
      id: uid(),
      titre: titre.trim() || "Nouvelle tâche",
      statut,
      priorite,
      debut,
      echeance: echeance || undefined,
      budget,
      avancement,
      remarques: remarques?.trim() || "",
    };
    onCreate(t);
  };

  return (
    <div className="etm-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="etm-panel" onClick={(e) => e.stopPropagation()}>
        <header className="etm-head">
          <h3>Créer une tâche</h3>
          <button className="etm-close" onClick={onClose} aria-label="Fermer">✕</button>
        </header>

        <div className="etm-grid">
          <label className="field span-2">
            <span className="label">Titre</span>
            <input
              ref={firstRef}
              className="input"
              value={titre}
              onChange={e => setTitre(e.target.value)}
              placeholder="Titre de la tâche…"
            />
          </label>

          <label className="field">
            <span className="label">Statut</span>
            <select className="select" value={statut} onChange={e => setStatut(e.target.value as Statut)}>
              <option value="Pas commencé">Pas commencé</option>
              <option value="En cours">En cours</option>
              <option value="Bloqué">Bloqué</option>
              <option value="Terminé">Terminé</option>
              <option value="En attente">En attente</option>
            </select>
          </label>

          <label className="field">
            <span className="label">Priorité</span>
            <select className="select" value={priorite} onChange={e => setPriorite(e.target.value as Task["priorite"])}>
              {PRIOS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>

          <label className="field">
            <span className="label">Début</span>
            <input type="date" className="input" value={debut} onChange={e => setDebut(e.target.value)} />
          </label>

          <label className="field">
            <span className="label">Échéance</span>
            <input type="date" className="input" value={echeance} onChange={e => setEcheance(e.target.value)} />
          </label>

          <label className="field">
            <span className="label">Budget</span>
            <input type="number" className="input" value={budget} onChange={e => setBudget(Number(e.target.value))} />
          </label>

          <label className="field">
            <span className="label">Avancement</span>
            <input
              type="number"
              min={0} max={100}
              className="input"
              value={avancement}
              onChange={e => setAvancement(Math.max(0, Math.min(100, Number(e.target.value))))}
            />
          </label>

          <label className="field span-2">
            <span className="label">Remarques (250 caractères max)</span>
            <textarea
              className="textarea"
              maxLength={250}
              rows={4}
              value={remarques}
              onChange={e => setRemarques(e.target.value)}
              placeholder="Détail / contexte…"
            />
            <div className="help">{remarques.length}/250</div>
          </label>
        </div>

        <footer className="etm-actions">
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn primary" onClick={submit}>Créer</button>
        </footer>
      </div>
    </div>
  );
}
