import { useEffect, useMemo, useRef, useState } from "react";
import "./notes-quick.css";

import ConfirmDialog from "./ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";

export type QuickNote = {
  id: string;
  text: string;
  createdAt: number;
};

type Props = {
  storageKey?: string;   // si tu veux persister localement
  readOnly?: boolean;    // désactive l’édition en mode réunion
};

const uid = () => Math.random().toString(36).slice(2, 9);

export default function NotesQuick({ storageKey = "kanban-quick-notes", readOnly = false }: Props) {
  const [notes, setNotes] = useState<QuickNote[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as QuickNote[]) : [];
    } catch {
      return [];
    }
  });

  // auto-save localStorage
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(notes)); } catch {}
  }, [notes, storageKey]);

  const [draft, setDraft] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const confirm = useConfirm();

  const count = notes.length;
  const hasNotes = count > 0;

  const addNote = () => {
    const v = draft.trim();
    if (!v) return;
    setNotes((prev) => [{ id: uid(), text: v, createdAt: Date.now() }, ...prev]);
    setDraft("");
    inputRef.current?.focus();
  };

  const removeNote = async (id: string) => {
    const toRemove = notes.find(n => n.id === id);
    const label = (toRemove?.text ?? "").slice(0, 24).replace(/\s+/g, " ");
    const ok = await confirm.ask(`Êtes-vous sûr de vouloir supprimer “${label}…” ? Cette action est définitive.`);
    if (ok) setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const allSorted = useMemo(
    () => [...notes].sort((a, b) => b.createdAt - a.createdAt),
    [notes]
  );

  return (
    <section className="nq">
      <div className="nq__head">
        <h2 className="nq__title">📝 Notes rapides</h2>
        <button type="button" className="nq__count" onClick={() => setListOpen(true)} aria-haspopup="dialog">
          {count} note{count > 1 ? "s" : ""} rapide{count > 1 ? "s" : ""}
        </button>
      </div>

      {/* Zone principale (une seule) */}
      <div className="nq__box">
        <div className="nq__editor">
          <textarea
            ref={inputRef}
            className="nq__textarea"
            placeholder="Écris une note rapide…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={250}
            disabled={readOnly}
          />
          <div className="nq__actions">
            <span className="nq__len">{draft.length}/250</span>
            <button
              className="nq__btn primary"
              onClick={addNote}
              disabled={readOnly || !draft.trim()}
            >
              + Ajouter une note
            </button>
          </div>
        </div>

        {/* Liste compacte en dessous (dernieres notes) */}
        {hasNotes && (
          <ul className="nq__list">
            {allSorted.slice(0, 5).map((n) => (
              <li key={n.id} className="nq__item">
                <span className="nq__text" title={n.text}>{n.text}</span>
                {!readOnly && (
                  <button className="nq__remove" onClick={() => removeNote(n.id)} aria-label="Supprimer">🗑</button>
                )}
              </li>
            ))}
            {count > 5 && (
              <li className="nq__more">
                <button className="nq__btn link" onClick={() => setListOpen(true)}>Voir toutes les notes…</button>
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Modal “toutes les notes” */}
      {listOpen && (
        <div className="cd-overlay" role="dialog" aria-modal="true" onClick={() => setListOpen(false)}>
          <div className="cd-panel" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Toutes les notes ({count})</h3>
            {hasNotes ? (
              <ul className="nq__full">
                {allSorted.map((n) => (
                  <li key={n.id} className="nq__row">
                    <span className="nq__text" title={n.text}>{n.text}</span>
                    {!readOnly && (
                      <button className="nq__remove" onClick={() => removeNote(n.id)} aria-label="Supprimer">🗑</button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="nq__empty">Aucune note pour l’instant.</div>
            )}
            <div className="cd-actions">
              <button className="cd-btn cd-cancel" onClick={() => setListOpen(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog interne au composant */}
      <ConfirmDialog
        open={confirm.open}
        message={confirm.message}
        onCancel={confirm.cancel}
        onConfirm={confirm.confirm}
      />
    </section>
  );
}
