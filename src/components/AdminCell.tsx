// src/components/AdminCell.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";

type AdminCellProps = {
  admin?: string | null;
  assignees?: string[] | null;
  options: string[];
  disabled?: boolean;
  onChange: (v: { admin: string | ""; assignees: string[] }) => void;
};

function computeAnchor(
  el: HTMLElement,
  popW = 320,
  popH = 360
): { left: number; top: number; dir: "up" | "down" } {
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = Math.min(Math.max(8, r.left), Math.max(8, vw - popW - 8));
  const spaceBelow = vh - r.bottom;
  const dir: "up" | "down" = spaceBelow >= popH + 12 ? "down" : "up";
  let top = dir === "down" ? r.bottom + 6 : r.top - popH - 6;
  top = Math.min(Math.max(8, top), Math.max(8, vh - popH - 8));
  return { left, top, dir };
}

export default function AdminCell({
  admin,
  assignees,
  options,
  disabled,
  onChange,
}: AdminCellProps) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ left: number; top: number; dir: "up" | "down" } | null>(null);

  const initial = useMemo<string[]>(
    () => (Array.isArray(assignees) && assignees.length ? assignees : admin ? [admin] : []),
    [admin, assignees]
  );
  const [draft, setDraft] = useState<string[]>(initial);
  const [draftAdmin, setDraftAdmin] = useState<string>(admin || initial[0] || "");
  const [q, setQ] = useState("");

  useEffect(() => {
    // Sync when row changes
    const init = Array.isArray(assignees) && assignees.length ? assignees : admin ? [admin] : [];
    setDraft(init);
    setDraftAdmin(admin || init[0] || "");
  }, [admin, assignees]);

  // Close on outside click only (PAS sur scroll)
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const shown = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return qq ? options.filter((o) => o.toLowerCase().includes(qq)) : options;
  }, [options, q]);

  const confirm = () => {
    const adminFinal = draftAdmin || draft[0] || "";
    onChange({ admin: adminFinal, assignees: Array.from(new Set(draft)) });
    setOpen(false);
  };

  const openPicker = () => {
    if (disabled) return;
    const el = btnRef.current;
    if (!el) return;
    setAnchor(computeAnchor(el, 320, 360));
    setOpen(true);
  };

  const togglePerson = (name: string) => {
    setDraft((prev) => {
      const has = prev.includes(name);
      const next = has ? prev.filter((n) => n !== name) : [...prev, name];
      if (!has && !draftAdmin) setDraftAdmin(name);
      if (has && draftAdmin === name) setDraftAdmin(next[0] || "");
      return next;
    });
  };

  // IMPORTANT : empêcher la propagation des scrolls/gestes pour ne PAS scroller la page/table.
  const stopScroll = (e: React.UIEvent | React.WheelEvent | React.TouchEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="ac-cell">
      <button
        ref={btnRef}
        className="ft-btn ac-trigger"
        type="button"
        disabled={disabled}
        onClick={openPicker}
        title="Assigner des personnes / définir l'admin"
      >
        {admin ? `Admin: ${admin}` : (assignees?.length ? assignees.join(", ") : "Choisir…")}
      </button>

      {open && anchor && (
        <div
          ref={popRef}
          className={`ac-popover ${anchor.dir === "up" ? "dir-up" : "dir-down"}`}
          style={{ position: "fixed", left: anchor.left, top: anchor.top, width: 320, maxHeight: 360 }}
          // Bloque la propagation des scrolls/gestes vers les parents
          onWheel={stopScroll}
          onScroll={stopScroll}
          onTouchMove={stopScroll}
        >
          <div className="ac-head">
            <strong>Personnes</strong>
            <input
              className="ac-search"
              placeholder="Rechercher…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="spacer" />
            <button className="ft-btn small ghost" onClick={() => { setDraft([]); setDraftAdmin(""); }}>
              Aucun
            </button>
            <button className="ft-btn small ghost" onClick={() => { setDraft([...options]); setDraftAdmin(options[0] || ""); }}>
              Tous
            </button>
            <button className="ft-icon-btn" onClick={() => setOpen(false)} aria-label="Fermer">✕</button>
          </div>

          <div
            className="ac-list"
            // double sécurité pour le scroll interne
            onWheel={stopScroll}
            onScroll={stopScroll}
            onTouchMove={stopScroll}
          >
            {shown.map((name) => (
              <label key={name} className="ac-row">
                <input
                  type="checkbox"
                  checked={draft.includes(name)}
                  onChange={() => togglePerson(name)}
                />
                <span className="ac-name">{name}</span>
                <span className="spacer" />
                <label className="ac-admin-radio" title="Définir admin">
                  <input
                    type="radio"
                    name="ac-admin"
                    checked={draftAdmin === name}
                    onChange={() => {
                      if (!draft.includes(name)) setDraft((p) => [...p, name]);
                      setDraftAdmin(name);
                    }}
                  />
                  <span className="ac-admin-label">Admin</span>
                </label>
              </label>
            ))}
            {shown.length === 0 && <div className="ft-empty">Aucun résultat…</div>}
          </div>

          <div className="ac-actions">
            <button className="ft-btn small" onClick={confirm}>Enregistrer</button>
            <button className="ft-btn ghost small" onClick={() => setOpen(false)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
