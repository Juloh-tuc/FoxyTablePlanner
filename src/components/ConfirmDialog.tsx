import { useEffect } from "react";
import "./confirm-dialog.css";

type Props = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title = "Confirmation",
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();        // Esc = annuler
      if (e.key === "Enter") onConfirm();        // Enter = confirmer
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div className="cd-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="cd-panel">
        {title && <h3 className="cd-title">{title}</h3>}
        <p className="cd-message">{message}</p>
        <div className="cd-actions">
          <button className="cd-btn cd-cancel" onClick={onCancel}>{cancelLabel}</button>
          <button className="cd-btn cd-confirm" onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
