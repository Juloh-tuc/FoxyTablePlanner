import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  start?: string | null;     // "YYYY-MM-DD"
  end?: string | null;       // "YYYY-MM-DD"
  onCancel: () => void;
  onConfirm: (range: { start: string | null; end: string | null }) => void;
};

/**
 * Modal simple, centré, pour choisir une plage de dates (début/fin).
 * - Affiche deux <input type="date"> (solution native, fiable sur desktop + mobile).
 * - Raccourcis clavier: ESC = annuler, ENTER = confirmer.
 * - Boutons: Annuler (gris), Confirmer (violet).
 * - Petits presets pratiques.
 */
export default function DateRangeModal({ open, start, end, onCancel, onConfirm }: Props) {
  const [draftStart, setDraftStart] = useState<string | "">("");
  const [draftEnd, setDraftEnd] = useState<string | "">("");

  useEffect(() => {
    if (open) {
      setDraftStart(start ?? "");
      setDraftEnd(end ?? "");
    }
  }, [open, start, end]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") {
        e.preventDefault();
        handleConfirm();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draftStart, draftEnd]);

  const todayISO = () => new Date().toISOString().slice(0, 10);
  const addDays = (fromISO: string, days: number) => {
    const d = new Date(fromISO);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const setPreset = (preset: "today" | "tomorrow" | "thisWeek" | "nextWeek") => {
    const t = todayISO();
    if (preset === "today") { setDraftStart(t); setDraftEnd(t); }
    if (preset === "tomorrow") { const tm = addDays(t, 1); setDraftStart(tm); setDraftEnd(tm); }
    if (preset === "thisWeek") {
      const d = new Date(t);
      const day = d.getDay(); // 0..6
      const diffToMon = (day + 6) % 7; // Lundi = 0
      const monday = addDays(t, -diffToMon);
      const sunday = addDays(monday, 6);
      setDraftStart(monday); setDraftEnd(sunday);
    }
    if (preset === "nextWeek") {
      const d = new Date(t);
      const day = d.getDay();
      const diffToMon = (day + 6) % 7;
      const nextMon = addDays(t, 7 - diffToMon);
      const nextSun = addDays(nextMon, 6);
      setDraftStart(nextMon); setDraftEnd(nextSun);
    }
  };

  const handleConfirm = () => {
    const s = draftStart || null;
    const e = draftEnd || null;
    // si une seule date, on autorise (cas "date unique")
    // si deux dates et end < start → on swap
    if (s && e && e < s) {
      onConfirm({ start: e, end: s });
    } else {
      onConfirm({ start: s, end: e });
    }
  };

  if (!open) return null;

  return (
    <div className="cd-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="cd-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Sélectionner les dates</h3>

        <div className="drm-grid">
          <div className="drm-field">
            <label className="drm-label">Date de début</label>
            <input
              className="drm-input"
              type="date"
              value={draftStart}
              onChange={(e) => setDraftStart(e.target.value)}
            />
          </div>
          <div className="drm-field">
            <label className="drm-label">Date de fin</label>
            <input
              className="drm-input"
              type="date"
              value={draftEnd}
              onChange={(e) => setDraftEnd(e.target.value)}
            />
          </div>
        </div>

        <div className="drm-presets">
          <span className="drm-presets__title">Presets :</span>
          <button className="drm-chip" onClick={() => setPreset("today")}>Aujourd’hui</button>
          <button className="drm-chip" onClick={() => setPreset("tomorrow")}>Demain</button>
          <button className="drm-chip" onClick={() => setPreset("thisWeek")}>Cette semaine</button>
          <button className="drm-chip" onClick={() => setPreset("nextWeek")}>Semaine prochaine</button>
        </div>

        <div className="cd-actions">
          <button className="cd-btn cd-cancel" onClick={onCancel}>Annuler (Esc)</button>
          <button className="cd-btn cd-confirm" onClick={handleConfirm}>Confirmer (Entrée)</button>
        </div>
      </div>
    </div>
  );
}

/* ----- styles optionnels (à copier dans planner-common.css si tu veux) -----

.drm-grid{ display:grid; grid-template-columns: 1fr 1fr; gap:.75rem; margin:.25rem 0 1rem; }
.drm-field{ display:flex; flex-direction:column; gap:.375rem; }
.drm-label{ font-weight:700; color:#111827; }
.drm-input{
  padding:.5rem .625rem; border:1px solid rgba(0,0,0,.08); border-radius:.625rem; font:inherit; background:#fff;
}

.drm-presets{ display:flex; align-items:center; flex-wrap:wrap; gap:.5rem; margin-bottom:.75rem; }
.drm-presets__title{ font-weight:700; color:#6b7280; margin-right:.25rem; }
.drm-chip{
  padding:.375rem .625rem; border-radius:999px; border:1px dashed rgba(0,0,0,.12); background:#fff; cursor:pointer;
}

-------------------------------------------------------------------------- */
