// src/components/AdminPicker.tsx
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type AdminPickerProps = {
  value: string[];              // sélection (0..1 pour admin simple)
  options: string[];            // liste des admins
  onChange: (next: string[]) => void;
  buttonClassName?: string;
  panelClassName?: string;
  maxHeight?: number;           // px
  label?: string;
};

/** Outside-click qui accepte des refs de n'importe quel Element (et null). */
function useOutsideClick(
  refs: Array<React.RefObject<Element | null>>,
  onOutside: () => void,
  enabled: boolean,
  openLockRef: React.MutableRefObject<boolean>
) {
  useEffect(() => {
    if (!enabled) return;
    const onDown = (e: PointerEvent) => {
      if (openLockRef.current) return; // ignore tout de suite après l’ouverture
      const t = e.target as Node;
      const inside = refs.some((r) => r.current && r.current.contains(t));
      if (!inside) onOutside();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [enabled, refs, onOutside, openLockRef]);
}

/** closest() typé large pour tous Elements (pas seulement HTMLElement). */
function closest(el: Element | null, selector: string): Element | null {
  while (el) {
    // .matches est sur Element dans le DOM runtime
    if (el.matches && el.matches(selector)) return el;
    el = el.parentElement;
  }
  return null;
}

export default function AdminPicker({
  value,
  options,
  onChange,
  buttonClassName,
  panelClassName,
  maxHeight = 260,
  label = "Admins",
}: AdminPickerProps) {
  const [open, setOpen] = useState(false);

  // ✅ Refs précises (avec null), compatibles avec useOutsideClick ci-dessus
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const openLockRef = useRef(false);

  // Empêche qu’un handler global ferme le panneau : stop en capture

  // Fermer sur clic extérieur / Escape
  useOutsideClick([btnRef, panelRef], () => setOpen(false), open, openLockRef);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Ancrage : si dans .ft-modal => absolute (suit le scroll modale), sinon fixed
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  useLayoutEffect(() => {
    if (!open) return;
    const btn = btnRef.current;
    const panel = panelRef.current;
    if (!btn || !panel) return;

    const modalEl = closest(btn, ".ft-modal");
    const btnRect = btn.getBoundingClientRect();
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;

    const panelWidth = Math.min(320, Math.max(200, btnRect.width));

    if (modalEl) {
      const modalRect = (modalEl as HTMLElement).getBoundingClientRect();
      const belowSpace = modalRect.bottom - btnRect.bottom;
      const aboveSpace = btnRect.top - modalRect.top;
      const preferBelow = belowSpace >= 180 || belowSpace >= aboveSpace;

      const ph = panel.offsetHeight || 240;
      const top = preferBelow
        ? btnRect.bottom - modalRect.top + 8
        : btnRect.top - modalRect.top - ph - 8;

      const maxLeft = modalRect.width - panelWidth - 8;
      let left = btnRect.left - modalRect.left;
      if (left > maxLeft) left = Math.max(8, maxLeft);
      if (left < 8) left = 8;

      const maxH = Math.min(maxHeight, preferBelow ? belowSpace - 16 : aboveSpace - 16);

      setPanelStyle({
        position: "absolute",
        top,
        left,
        width: panelWidth,
        maxHeight: Math.max(160, maxH),
        overflow: "auto",
        zIndex: 1100,
      });
    } else {
      const belowSpace = vpH - btnRect.bottom;
      const aboveSpace = btnRect.top;
      const preferBelow = belowSpace >= 180 || belowSpace >= aboveSpace;
      const top = preferBelow ? btnRect.bottom + 8 : Math.max(8, btnRect.top - (panel.offsetHeight || 240) - 8);

      let left = btnRect.left;
      if (left + panelWidth > vpW - 8) left = Math.max(8, vpW - 8 - panelWidth);
      if (left < 8) left = 8;

      const maxH = Math.min(maxHeight, preferBelow ? belowSpace - 16 : aboveSpace - 16);

      setPanelStyle({
        position: "fixed",
        top,
        left,
        width: panelWidth,
        maxHeight: Math.max(160, maxH),
        overflow: "auto",
        zIndex: 1100,
      });
    }
  }, [open, maxHeight]);

  // Bloque les scroll events pour éviter les fermetures/scroll-chain
  useEffect(() => {
    if (!open) return;
    const el = panelRef.current;
    if (!el) return;

    const stop = (e: Event) => e.stopPropagation();
    const opts = { capture: true } as AddEventListenerOptions;

    el.addEventListener("wheel", stop, opts as any);
    el.addEventListener("mousewheel", stop as any, opts as any);
    el.addEventListener("DOMMouseScroll", stop as any, opts as any);
    el.addEventListener("touchmove", stop, opts);

    return () => {
      el.removeEventListener("wheel", stop, opts as any);
      el.removeEventListener("mousewheel", stop as any, opts as any);
      el.removeEventListener("DOMMouseScroll", stop as any, opts as any);
      el.removeEventListener("touchmove", stop, opts as any);
    };
  }, [open]);

  const selected = useMemo(() => new Set(value), [value]);
  const toggle = (name: string) => {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onChange(Array.from(next));
  };

  const buttonLabel =
    value.length === 0 ? "Aucun admin" : value.length === 1 ? value[0] : `${value[0]} +${value.length - 1}`;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={buttonClassName ?? "ft-admin-btn"}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onPointerDownCapture={(e) => e.stopPropagation()}
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (next) {
              openLockRef.current = true;
              setTimeout(() => { openLockRef.current = false; }, 0);
            }
            return next;
          });
        }}
      >
        {buttonLabel}
      </button>

      {open && (
        <div
          ref={panelRef}
          className={panelClassName ?? "ft-admin-panel"}
          style={panelStyle}
          role="listbox"
          onPointerDownCapture={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onWheelCapture={(e) => e.stopPropagation()}
          onTouchMoveCapture={(e) => e.stopPropagation()}
        >
          <div className="ft-admin-panel__header">{label}</div>

          <div className="ft-admin-panel__search">
            <input
              type="text"
              placeholder="Rechercher…"
              className="ft-admin-input"
              onChange={(e) => {
                const q = e.currentTarget.value.toLowerCase();
                const panel = panelRef.current;
                if (!panel) return;
                panel.querySelectorAll<HTMLButtonElement>(".ft-admin-row").forEach((row) => {
                  const name = row.dataset.name?.toLowerCase() ?? "";
                  row.style.display = name.includes(q) ? "flex" : "none";
                });
              }}
              onPointerDownCapture={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="ft-admin-panel__list">
            {options.map((name) => {
              const active = selected.has(name);
              return (
                <button
                  key={name}
                  type="button"
                  className={`ft-admin-row${active ? " is-active" : ""}`}
                  data-name={name}
                  onPointerDownCapture={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); toggle(name); }}
                >
                  <span className="ft-admin-row__check" aria-hidden>{active ? "✓" : ""}</span>
                  <span className="ft-admin-row__name">{name}</span>
                </button>
              );
            })}
          </div>

          <div className="ft-admin-panel__footer">
            <button type="button" className="ft-admin-secondary" onClick={(e) => { e.stopPropagation(); setOpen(false); }}>
              Fermer
            </button>
            <button type="button" className="ft-admin-primary" onClick={(e) => { e.stopPropagation(); setOpen(false); }}>
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
