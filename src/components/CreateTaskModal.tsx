// src/components/CreateTaskModal.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import type { Task, Statut, Priorite } from "../types";
import "./edit-task-modal.css"; // <-- ta feuille existante, on la garde

/* ====== Helpers ====== */
const PRIOS = ["Faible", "Moyen", "Élevé"] as const;
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);

const ADMIN_AVATARS: Record<string, string> = {
  Julie: "Foxy_Julie.png",
  Léo: "léo_foxy.png",
  Mohamed: "mohamed_foxy.png",
  Myriam: "myriam_foxy.png",
  Simon: "simon_foxy.png",
  Titouan: "titouan_foxy.png",
};
const avatarUrlFor = (name?: string | null) => {
  if (!name) return null;
  const f = ADMIN_AVATARS[name.trim()];
  return f ? `/avatars/${f}` : null;
};
const initials = (name: string) =>
  (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

/* ====== Mini composant: multi-select à cases ====== */
function AssigneesMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Choisir des personnes…",
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return options;
    return options.filter((n) => n.toLowerCase().includes(k));
  }, [options, q]);

  const toggle = (name: string) => {
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);
  };
  const allChecked = value.length > 0 && value.length === options.length;

  const label =
    value.length === 0
      ? placeholder
      : value.length <= 3
      ? value.join(", ")
      : `${value.slice(0, 3).join(", ")} +${value.length - 3}`;

  return (
    <div className="msel" ref={ref}>
      <button type="button" className={`msel-field ${open ? "open" : ""}`} onClick={() => setOpen((o) => !o)}>
        <span className={`msel-placeholder ${value.length ? "has" : ""}`}>{label}</span>
        <span className="msel-caret">▾</span>
      </button>

      {open && (
        <div className="msel-pop">
          <div className="msel-head">
            <input
              className="msel-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher…"
              autoFocus
            />
            <button
              type="button"
              className="ft-btn small ghost"
              onClick={() => onChange(allChecked ? [] : [...options])}
            >
              {allChecked ? "Aucun" : "Tout"}
            </button>
          </div>

          <div className="msel-list">
            {filtered.length === 0 && <div className="msel-empty">Aucun résultat</div>}
            {filtered.map((name) => (
              <label key={name} className="msel-opt">
                <input type="checkbox" checked={value.includes(name)} onChange={() => toggle(name)} />
                <span className="opt-avatar">
                  {avatarUrlFor(name) ? (
                    <img src={encodeURI(avatarUrlFor(name)!)} alt="" />
                  ) : (
                    <span className="fallback">{initials(name) || "?"}</span>
                  )}
                </span>
                <span className="opt-name">{name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ====== Props ====== */
type Props = {
  admins: string[];          // ⬅️ liste pour le multi-sélecteur
  onCreate: (t: Task) => void;
  onClose: () => void;
};

function CreateTaskModalInner({ admins, onCreate, onClose }: Props) {
  const [titre, setTitre] = useState("");
  const [statut, setStatut] = useState<Statut>("Pas commencé");
  const [priorite, setPriorite] = useState<Priorite | undefined>("Moyen");
  const [debut, setDebut] = useState<string>(today());
  const [echeance, setEcheance] = useState<string>("");
  const [budget, setBudget] = useState<number>(0);
  const [avancement, setAvancement] = useState<number>(0);
  const [remarques, setRemarques] = useState<string>("");

  // NEW: multi-assignation
  const [assignees, setAssignees] = useState<string[]>([]);

  const firstRef = useRef<HTMLInputElement>(null);
  useEffect(() => { firstRef.current?.focus(); }, []);

  const submit = () => {
    const safeTitre = (titre.trim() || "Nouvelle tâche").slice(0, 80);
    const first = assignees[0] ?? ""; // compat champ admin simple
    const t: Task = {
      id: uid(),
      titre: safeTitre,
      statut,
      priorite,
      debut,
      echeance: echeance || undefined,
      budget,
      avancement: Math.max(0, Math.min(100, Math.round(avancement))),
      remarques: (remarques ?? "").trim().slice(0, 250) || undefined,
      admin: first,
      assignees: assignees.length ? [...assignees] : (first ? [first] : []),
      archived: false,
      archivedAt: null,
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
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Titre de la tâche…"
              maxLength={80}
            />
          </label>

          <label className="field">
            <span className="label">Statut</span>
            <select className="select" value={statut} onChange={(e) => setStatut(e.target.value as Statut)}>
              <option value="Pas commencé">Pas commencé</option>
              <option value="En cours">En cours</option>
              <option value="Bloqué">Bloqué</option>
              <option value="Terminé">Terminé</option>
              <option value="En attente">En attente</option>
            </select>
          </label>

          <label className="field">
            <span className="label">Priorité</span>
            <select
              className="select"
              value={priorite ?? ""}
              onChange={(e) => setPriorite((e.target.value as Priorite) || undefined)}
            >
              <option value="">—</option>
              {PRIOS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          {/* NEW: Assignés (multi-select) */}
          <div className="field span-2">
            <span className="label">Assignés</span>
            <AssigneesMultiSelect
              options={admins}
              value={assignees}
              onChange={setAssignees}
              placeholder="Choisir des personnes…"
            />
          </div>

          <label className="field">
            <span className="label">Début</span>
            <input type="date" className="input" value={debut} onChange={(e) => setDebut(e.target.value)} />
          </label>

          <label className="field">
            <span className="label">Échéance</span>
            <input type="date" className="input" value={echeance} onChange={(e) => setEcheance(e.target.value)} />
          </label>

          <label className="field">
            <span className="label">Budget</span>
            <input
              type="number"
              className="input"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
          </label>

          <label className="field">
            <span className="label">Avancement</span>
            <input
              type="number"
              min={0}
              max={100}
              className="input"
              value={avancement}
              onChange={(e) => setAvancement(Math.max(0, Math.min(100, Number(e.target.value))))}
            />
          </label>

          <label className="field span-2">
            <span className="label">Remarques (250 caractères max)</span>
            <textarea
              className="textarea"
              maxLength={250}
              rows={4}
              value={remarques}
              onChange={(e) => setRemarques(e.target.value)}
              placeholder="Détail / contexte…"
            />
            <div className="help">{remarques.length}/250</div>
          </label>
        </div>

        <footer className="etm-actions">
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn primary" onClick={submit}>
            Créer
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function CreateTaskModal(props: Props) {
  // ⬇️ Portal pour passer au-dessus de tout (post-it, kanban, etc.)
  return ReactDOM.createPortal(<CreateTaskModalInner {...props} />, document.body);
}
