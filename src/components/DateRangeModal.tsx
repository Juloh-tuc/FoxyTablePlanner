import React, { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  start?: string | null; // "YYYY-MM-DD"
  end?: string | null;   // "YYYY-MM-DD"
  onCancel: () => void;
  onConfirm: (range: { start: string | null; end: string | null }) => void;
};

// ====== Helpers dates (ISO "YYYY-MM-DD", semaine qui commence lundi) ======
const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const parseISO = (iso?: string | null) => (iso ? new Date(`${iso}T00:00:00`) : null);
const addDays = (iso: string, days: number) => {
  const d = parseISO(iso)!;
  d.setDate(d.getDate() + days);
  return toISO(d);
};
const addMonths = (base: Date, delta: number) => {
  const d = new Date(base);
  d.setMonth(d.getMonth() + delta);
  d.setDate(1);
  return d;
};
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const mondayOfWeek = (d: Date) => {
  const day = d.getDay(); // 0=dim ... 6=sam
  const diffToMon = (day + 6) % 7; // lundi=0
  const out = new Date(d);
  out.setDate(d.getDate() - diffToMon);
  return out;
};
const sameISO = (a?: string | null, b?: string | null) => !!a && !!b && a === b;
const inRange = (dayISO: string, startISO?: string | null, endISO?: string | null) => {
  if (!startISO && !endISO) return false;
  if (startISO && endISO) return dayISO >= startISO && dayISO <= endISO;
  return dayISO === (startISO ?? endISO!);
};

export default function DateRangeModal({ open, start, end, onCancel, onConfirm }: Props) {
  const [draftStart, setDraftStart] = useState<string | "">("");
  const [draftEnd, setDraftEnd] = useState<string | "">("");
  const initialAnchor = parseISO(start ?? end) ?? new Date();
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(initialAnchor));

  // init/reset à l’ouverture
  useEffect(() => {
    if (open) {
      setDraftStart(start ?? "");
      setDraftEnd(end ?? "");
      setViewMonth(startOfMonth(parseISO(start ?? end) ?? new Date()));
    }
  }, [open, start, end]);

  // raccourcis clavier
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") handleConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draftStart, draftEnd]);

  // grille de 6 semaines (42 cases), lundi→dimanche
  const grid = useMemo(() => {
    const first = startOfMonth(viewMonth);
    const last = endOfMonth(viewMonth);
    const gridStart = mondayOfWeek(first);
    const cells: { iso: string; inMonth: boolean; date: number }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const iso = toISO(d);
      cells.push({ iso, inMonth: d.getMonth() === viewMonth.getMonth(), date: d.getDate() });
    }
    return { cells, monthLabel: viewMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) };
  }, [viewMonth]);

  // sélection par clic (range)
  const onPick = (iso: string) => {
    const s = draftStart || null;
    const e = draftEnd || null;

    if (!s && !e) {
      setDraftStart(iso);
      return;
    }
    if (s && !e) {
      if (iso < s) {
        setDraftEnd(s);
        setDraftStart(iso);
      } else {
        setDraftEnd(iso);
      }
      return;
    }
    // s && e -> on recommence une sélection
    setDraftStart(iso);
    setDraftEnd("");
  };

  const setPreset = (preset: "today" | "tomorrow" | "thisWeek" | "nextWeek") => {
    const t = toISO(new Date());
    if (preset === "today") { setDraftStart(t); setDraftEnd(t); }
    if (preset === "tomorrow") { setDraftStart(addDays(t, 1)); setDraftEnd(addDays(t, 1)); }
    if (preset === "thisWeek") {
      const mon = mondayOfWeek(new Date());
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      setDraftStart(toISO(mon)); setDraftEnd(toISO(sun));
      setViewMonth(startOfMonth(mon));
    }
    if (preset === "nextWeek") {
      const mon0 = mondayOfWeek(new Date());
      const mon = new Date(mon0); mon.setDate(mon0.getDate() + 7);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      setDraftStart(toISO(mon)); setDraftEnd(toISO(sun));
      setViewMonth(startOfMonth(mon));
    }
  };

  const handleConfirm = () => {
    const s = draftStart || null;
    const e = draftEnd || null;
    if (s && e && e < s) onConfirm({ start: e, end: s });
    else onConfirm({ start: s, end: e });
  };

  if (!open) return null;

  const daysShort = ["L", "M", "M", "J", "V", "S", "D"]; // lundi→dimanche
  const brandRing = "rgba(25,25,112,.28)";

  return (
    <div className="cd-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="cd-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <h3 style={{ marginTop: 0, marginBottom: 4 }}>Sélectionner les dates</h3>

        {/* Champs natifs (accessibles + mobiles) */}
        <div className="drm-grid" style={{ marginTop: 6 }}>
          <div className="drm-field">
            <label className="drm-label">Début</label>
            <input
              className="drm-input"
              type="date"
              value={draftStart}
              onChange={(e) => setDraftStart(e.target.value)}
            />
          </div>
          <div className="drm-field">
            <label className="drm-label">Fin</label>
            <input
              className="drm-input"
              type="date"
              value={draftEnd}
              onChange={(e) => setDraftEnd(e.target.value)}
            />
          </div>
        </div>

        {/* Presets rapides */}
        <div className="drm-presets">
          <span className="drm-presets__title">Presets :</span>
          <button className="drm-chip" onClick={() => setPreset("today")}>Aujourd’hui</button>
          <button className="drm-chip" onClick={() => setPreset("tomorrow")}>Demain</button>
          <button className="drm-chip" onClick={() => setPreset("thisWeek")}>Cette semaine</button>
          <button className="drm-chip" onClick={() => setPreset("nextWeek")}>Semaine prochaine</button>
        </div>

        {/* Calendrier visuel (mini-agenda) */}
        <div className="cdr-cal">
          <div className="cdr-head">
            <button className="cdr-nav" onClick={() => setViewMonth(addMonths(viewMonth, -1))} aria-label="Mois précédent">‹</button>
            <div className="cdr-month">{grid.monthLabel}</div>
            <button className="cdr-nav" onClick={() => setViewMonth(addMonths(viewMonth, 1))} aria-label="Mois suivant">›</button>
          </div>

          <div className="cdr-grid">
            {daysShort.map((d) => (
              <div key={d} className="cdr-dayhead">{d}</div>
            ))}
            {grid.cells.map(({ iso, inMonth, date }) => {
              const isStart = sameISO(iso, draftStart);
              const isEnd = sameISO(iso, draftEnd);
              const isInRange = inRange(iso, draftStart, draftEnd);
              const today = iso === toISO(new Date());
              return (
                <button
                  key={iso}
                  type="button"
                  className={[
                    "cdr-cell",
                    inMonth ? "" : "is-out",
                    isInRange ? "is-range" : "",
                    isStart ? "is-start" : "",
                    isEnd ? "is-end" : "",
                    today ? "is-today" : "",
                  ].join(" ").trim()}
                  onClick={() => onPick(iso)}
                  aria-pressed={isInRange || isStart || isEnd}
                  title={iso}
                  style={isStart || isEnd ? { boxShadow: `0 0 0 3px ${brandRing}` } : undefined}
                >
                  <span className="cdr-date">{date}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="cd-actions">
          <button className="cd-btn cd-cancel" onClick={onCancel}>Annuler (Esc)</button>
          <button className="cd-btn cd-confirm" onClick={handleConfirm}>Confirmer (Entrée)</button>
        </div>
      </div>
    </div>
  );
}
