import { useState } from "react";

type Props = {
  open: boolean;
  label?: string;
  onConfirm: (reason?: string) => void;
  onClose: () => void;
};

function ArchiveConfirmDialog({ open, label, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState("");
  if (!open) return null;

  return (
    <div className="ft-modal-backdrop">
      <div className="ft-modal" role="dialog" aria-modal="true" aria-labelledby="arch-title">
        <h3 id="arch-title" className="ft-modal-title">Archiver {label ? `“${label}”` : "la tâche"} ?</h3>
        <p className="ft-modal-sub">La tâche sera masquée des vues actives, mais <b>pas supprimée</b>.</p>

        <label className="ft-field">
          <span>Raison (optionnel)</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: terminé, doublon, hors scope…"
          />
        </label>

        <div className="ft-modal-actions">
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={() => onConfirm(reason || undefined)}>Archiver</button>
        </div>
      </div>
    </div>
  );
}

export default ArchiveConfirmDialog;
