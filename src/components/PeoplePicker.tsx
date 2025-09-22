import { useEffect, useMemo, useRef, useState } from "react";
import "./people-picker.css";

export type Person = { id: string; name: string; email?: string; avatarUrl?: string };

type Props = {
  allPeople: Person[];
  /** Liste des NOMS sélectionnés (API actuelle conservée) */
  value: string[];
  onChange: (next: string[]) => void;
  /** Remonte l’annuaire si on ajoute/supprime des personnes */
  onDirectoryChange?: (next: Person[]) => void;
  /** Classe utilitaire pour l’ancrage (alignement) */
  anchorClassName?: string;
  /** Désactiver l’édition */
  disabled?: boolean;
  /** Accessibilité: étiquette lue par les lecteurs d’écran sur le bouton d’ouverture */
  ariaLabel?: string;
  /** Optionnel: limite de personnes sélectionnables */
  maxSelected?: number;
};

const uid = () => Math.random().toString(36).slice(2, 9);

export default function PeoplePicker({
  allPeople,
  value,
  onChange,
  onDirectoryChange,
  anchorClassName,
  disabled,
  ariaLabel = "Assigner des personnes",
  maxSelected,
}: Props) {
  const [open, setOpen] = useState(false);
  const [dir, setDir] = useState<Person[]>(allPeople);
  const [newName, setNewName] = useState("");
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // garder dir sync avec allPeople
  useEffect(() => setDir(allPeople), [allPeople]);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dir;
    return dir.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.email?.toLowerCase().includes(q) ?? false)
    );
  }, [dir, query]);

  const canAddMore = (nextLen: number) =>
    typeof maxSelected === "number" ? nextLen <= maxSelected : true;

  const toggleSelect = (name: string) => {
    if (disabled) return;
    if (selectedSet.has(name)) {
      onChange(value.filter((v) => v !== name));
    } else {
      const next = [...value, name];
      if (!canAddMore(next.length)) return;
      onChange(next);
    }
  };

  const addPerson = () => {
    const name = newName.trim();
    if (!name) return;
    // si déjà présent, ne pas dupliquer
    if (dir.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      setNewName("");
      return;
    }
    const p: Person = { id: uid(), name };
    const next = [...dir, p];
    setDir(next);
    onDirectoryChange?.(next);
    setNewName("");
  };

  const removePerson = (id: string) => {
    const removed = dir.find((p) => p.id === id)?.name;
    const nextDir = dir.filter((p) => p.id !== id);
    setDir(nextDir);
    onDirectoryChange?.(nextDir);
    if (removed && selectedSet.has(removed)) {
      onChange(value.filter((v) => v !== removed));
    }
  };

  // click extérieur → fermer
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const panel = panelRef.current;
      const wrap = wrapRef.current;
      const t = e.target as Node;
      if (panel && wrap && !panel.contains(t) && !wrap.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // ESC → fermer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={`pp-wrap ${anchorClassName || ""}`} ref={wrapRef}>
      {/* Sélection actuelle */}
      <div className="pp-selected">
        {value.length === 0 && <span className="pp-pill muted">—</span>}
        {value.map((n) => (
          <span key={n} className="pp-pill">
            {n}
          </span>
        ))}

        {!disabled && (
          <button
            type="button"
            className="pp-edit"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label={ariaLabel}
          >
            Assigner
          </button>
        )}
      </div>

      {/* Panneau */}
      {open && !disabled && (
        <div
          className="pp-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Sélection de personnes"
        >
          <div className="pp-head">
            <strong>Assigner des personnes</strong>
            <button className="pp-close" onClick={() => setOpen(false)}>
              Fermer
            </button>
          </div>

          <div className="pp-tools">
            <input
              className="pp-input search"
              placeholder="Rechercher dans l’annuaire…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="pp-list">
            {filtered.length === 0 && (
              <div className="pp-empty">Aucun résultat</div>
            )}
            {filtered.map((p) => (
              <label key={p.id} className="pp-row">
                <input
                  type="checkbox"
                  checked={selectedSet.has(p.name)}
                  onChange={() => toggleSelect(p.name)}
                />
                <span className="pp-name">
                  {p.avatarUrl ? (
                    <img className="pp-avatar" src={p.avatarUrl} alt="" />
                  ) : (
                    <span className="pp-avatar pp-avatar--fallback">
                      {getInitials(p.name)}
                    </span>
                  )}
                  {p.name}
                  {p.email && <span className="pp-email"> · {p.email}</span>}
                </span>
                <button
                  type="button"
                  className="pp-remove"
                  onClick={() => removePerson(p.id)}
                  aria-label={`Supprimer ${p.name} de l’annuaire`}
                  title="Supprimer de l’annuaire"
                >
                  ✕
                </button>
              </label>
            ))}
          </div>

          <div className="pp-add">
            <input
              className="pp-input"
              placeholder="Ajouter une personne (nom complet)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addPerson();
              }}
            />
            <button className="pp-btn" onClick={addPerson}>
              Ajouter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------- utils -------- */
function getInitials(name: string) {
  const parts = name
    .split(" ")
    .map((s) => s.trim())
    .filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
