// src/components/NotesQuick.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import "./notes-quick.css";

type Note = {
  id: string;
  title: string;
  text: string;
  createdAt: string;      // ISO
  updatedAt: string;      // ISO
  archived: boolean;
  archivedAt?: string | null;
};

type Props = {
  storageKey?: string;    // clé localStorage
  readOnly?: boolean;     // désactive l’édition (ex: mode réunion)
};

const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

/* --------- Load / Save + migration depuis l'ancien schéma --------- */
function loadNotes(storageKey: string): Note[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const arr = JSON.parse(raw) as any[];

    return (Array.isArray(arr) ? arr : []).map((n) => {
      // ancien format : { id, text, createdAt:number }
      const isOld = typeof n?.createdAt === "number";
      const createdIso = isOld
        ? new Date(n.createdAt).toISOString()
        : (n?.createdAt ?? new Date().toISOString());

      const title =
        typeof n?.title === "string" && n.title.trim().length
          ? n.title.trim()
          : String(n?.text ?? "")
              .trim()
              .split("\n")[0]
              .slice(0, 40) || "(Sans titre)";

      return {
        id: String(n?.id ?? uid()),
        title,
        text: String(n?.text ?? "").trim(),
        createdAt: createdIso,
        updatedAt: n?.updatedAt ?? createdIso,
        archived: !!n?.archived,
        archivedAt: n?.archivedAt ?? null,
      } as Note;
    });
  } catch {
    return [];
  }
}

function saveNotes(storageKey: string, list: Note[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(list));
  } catch {}
}

/* =========================
   Composant
   ========================= */
export default function NotesQuick({
  storageKey = "kanban-quick-notes",
  readOnly = false,
}: Props) {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes(storageKey));

  // éditeur
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // modale “toutes les notes”
  const [listOpen, setListOpen] = useState(false);

  // filtres / tri (utilisés dans la modale)
  const [qTitle, setQTitle] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "title">("date");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [showArchived, setShowArchived] = useState<"actives" | "archivees">("actives");

  // persist
  useEffect(() => { saveNotes(storageKey, notes); }, [notes, storageKey]);

  // sync cross-onglets
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey) setNotes(loadNotes(storageKey));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageKey]);

  // fermer modale avec Échap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setListOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const countAll = notes.length;
  const canCreate = (title.trim().length > 0 || text.trim().length > 0) && !readOnly;

  /* --------- actions --------- */
  function createNote() {
    if (!canCreate) return;
    const now = new Date().toISOString();
    const safeTitle =
      title.trim() ||
      (text.trim().split("\n")[0] || "").slice(0, 40) ||
      "(Sans titre)";
    const n: Note = {
      id: uid(),
      title: safeTitle,
      text: text.trim(),
      createdAt: now,
      updatedAt: now,
      archived: false,
      archivedAt: null,
    };
    setNotes((prev) => [n, ...prev]);
    setTitle("");
    setText("");
    inputRef.current?.focus();
  }

  function archiveNote(id: string) {
    if (readOnly) return;
    const now = new Date().toISOString();
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, archived: true, archivedAt: now, updatedAt: now } : n))
    );
  }

  function restoreNote(id: string) {
    if (readOnly) return;
    const now = new Date().toISOString();
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, archived: false, archivedAt: null, updatedAt: now } : n))
    );
  }

  /* --------- dérivés --------- */
  const activeSorted = useMemo(() => {
    return notes
      .filter((n) => !n.archived)
      .slice()
      .sort((a, b) => String(b.updatedAt ?? b.createdAt).localeCompare(String(a.updatedAt ?? a.createdAt)));
  }, [notes]);

  // liste filtrée + tri (modale)
  const filteredSorted = useMemo(() => {
    const q = qTitle.trim().toLowerCase();
    let list = notes.filter((n) => (showArchived === "archivees" ? n.archived : !n.archived));
    if (q) list = list.filter((n) => n.title.toLowerCase().includes(q));

    list.sort((a, b) => {
      if (sortBy === "title") {
        const cmp = a.title.localeCompare(b.title, "fr", { sensitivity: "base" });
        return sortDir === "asc" ? cmp : -cmp;
      } else {
        const da = a.updatedAt ?? a.createdAt;
        const db = b.updatedAt ?? b.createdAt;
        const cmp = String(db).localeCompare(String(da)); // desc par défaut
        return sortDir === "asc" ? -cmp : cmp;
      }
    });
    return list;
  }, [notes, qTitle, sortBy, sortDir, showArchived]);

  const dashboardList = activeSorted.slice(0, 5);

  /* --------- rendu --------- */
  return (
    <section className="nq">
      <div className="nq__head">
        <h2 className="nq__title">📝 Notes rapides</h2>
        <button
          type="button"
          className="nq__count"
          onClick={() => setListOpen(true)}
          aria-haspopup="dialog"
        >
          Voir toutes <span className="nq__pill">{countAll}</span>
        </button>
      </div>

      {/* Zone principale */}
      <div className="nq__box">
        {/* ÉDITEUR */}
        <div className="nq__editor">
          <input
            className="nq__title-input"
            placeholder="Titre (ex: Rétro sprint)"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            disabled={readOnly}
          />
          <textarea
            ref={inputRef}
            className="nq__textarea"
            placeholder="Votre note (2 lignes visibles ici — le reste dans la modale)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            rows={3}
            disabled={readOnly}
          />
          <div className="nq__actions">
            <span className="nq__len">{(title + text).length} car.</span>
            <button
              className="nq__btn primary"
              onClick={createNote}
              disabled={!canCreate}
            >
              + Ajouter une note
            </button>
          </div>
        </div>

        {/* LISTE COMPACTE (5 dernières actives) */}
        <ul className="nq__list">
          {dashboardList.map((n) => (
            <li key={n.id} className="nq__item">
              <div>
                <div className="nq__title-row">
                  <span className="nq__note-title" title={n.title}>{n.title}</span>
                  <div className="nq__meta">
                    <span className="nq__date">
                      {new Date(n.updatedAt ?? n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="nq__body">
                  <div className="nq__text" title={n.text}>{n.text || "—"}</div>
                </div>
              </div>
              <div className="nq__row-actions">
                <button
                  className="nq__icon-btn nq__archive"
                  title="Archiver"
                  onClick={() => archiveNote(n.id)}
                  disabled={readOnly}
                >
                  🗄️
                </button>
              </div>
            </li>
          ))}
          {dashboardList.length === 0 && (
            <li className="nq__empty">Aucune note active.</li>
          )}
          {activeSorted.length > 5 && (
            <li className="nq__more">
              <button className="nq__btn link" onClick={() => setListOpen(true)}>
                Afficher tout
              </button>
            </li>
          )}
        </ul>
      </div>

      {/* MODALE — toutes les notes (scroll interne) */}
      {listOpen && (
        <div className="cd-overlay" onClick={() => setListOpen(false)}>
          <div className="cd-panel" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Toutes les notes ({countAll})</h3>

            {/* Filtres / tri */}
            <div className="nq__controls">
              <input
                className="nq__filter-input"
                placeholder="Filtrer par titre…"
                value={qTitle}
                onChange={(e) => setQTitle(e.target.value)}
              />
              <select
                className="nq__select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "title")}
              >
                <option value="date">Trier par date</option>
                <option value="title">Trier par titre</option>
              </select>
              <select
                className="nq__select"
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value as "desc" | "asc")}
              >
                <option value="desc">Décroissant</option>
                <option value="asc">Croissant</option>
              </select>
              <select
                className="nq__select"
                value={showArchived}
                onChange={(e) => setShowArchived(e.target.value as "actives" | "archivees")}
              >
                <option value="actives">Actives</option>
                <option value="archivees">Archivées</option>
              </select>
            </div>

            {/* Zone scrollable interne */}
            <div className="nq__modal-body">
              <ul className="nq__full">
                {filteredSorted.map((n) => (
                  <li key={n.id} className="nq__row">
                    <div>
                      <div className="nq__title-row">
                        <span className="nq__note-title" title={n.title}>{n.title}</span>
                        <div className="nq__meta">
                          <span className="nq__date">
                            {new Date(n.updatedAt ?? n.createdAt).toLocaleString()}
                          </span>
                          {n.archived && <span className="nq__badge nq__badge--archived">Archivée</span>}
                        </div>
                      </div>
                      <div className="nq__body">
                        <div className="nq__text" title={n.text}>{n.text || "—"}</div>
                      </div>
                    </div>
                    <div className="nq__row-actions">
                      {!n.archived ? (
                        <button
                          className="nq__icon-btn nq__archive"
                          onClick={() => archiveNote(n.id)}
                          disabled={readOnly}
                          title="Archiver"
                        >
                          🗄️
                        </button>
                      ) : (
                        <button
                          className="nq__icon-btn nq__restore"
                          onClick={() => restoreNote(n.id)}
                          disabled={readOnly}
                          title="Restaurer"
                        >
                          ↩️
                        </button>
                      )}
                    </div>
                  </li>
                ))}
                {filteredSorted.length === 0 && (
                  <li className="nq__empty">Aucune note.</li>
                )}
              </ul>
            </div>

            <div className="cd-actions">
              <button className="cd-btn cd-cancel" onClick={() => setListOpen(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
