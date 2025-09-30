// src/components/EditTaskModal.tsx
import { useMemo, useState } from "react";
import ReactDOM from "react-dom";
import "./edit-task-modal.css";
import type { Task, Statut, Priorite } from "../types";

/* ---------- Constantes & helpers ---------- */

const STATUTS: Statut[] = ["Pas commencé", "En cours", "En attente", "Bloqué", "Terminé"];

/** uniq robuste: accepte string | null | undefined en entrée, renvoie string[] */
const uniq = (arr: Array<string | null | undefined>): string[] =>
  Array.from(
    new Set(
      arr
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((s) => s.trim())
    )
  );

/** coerce vers string pour value des <input> contrôlés */
const s = (v?: string | null) => v ?? "";

/** borne pour le pourcentage d’avancement */
const toPct = (n: unknown) => {
  const v = Number(n);
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
};

type Props = {
  open: boolean;
  task: Task;
  tasks: Task[];             // liste globale pour les dépendances
  admins: string[];
  onSave: (updated: Task) => void;
  onClose: () => void;
  onAskArchiveDelete: (t: Task) => void;
};

export default function EditTaskModal({
  open,
  task,
  tasks,
  admins: _admins, // non utilisé ici, on garde la signature
  onSave,
  onClose,
  onAskArchiveDelete,
}: Props) {

  // 🔒 Normalisation initiale : admin = string, assignees = string[]
  const [draft, setDraft] = useState<Task>({
    ...task,
    admin: typeof task.admin === "string" ? task.admin : "",
    assignees: Array.isArray(task.assignees) ? task.assignees : [],
  });

  const [assigneeInput, setAssigneeInput] = useState<string>("");

  // recherches pickers dépendances
  const [qIn, setQIn] = useState("");
  const [qOut, setQOut] = useState("");

  const change = <K extends keyof Task>(key: K, value: Task[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const addAssignee = () => {
    const v = assigneeInput.trim();
    if (!v) return;
    setDraft((d) => ({ ...d, assignees: uniq([...(d.assignees ?? []), v]) }));
    setAssigneeInput("");
  };

  const removeAssignee = (name: string) =>
    setDraft((d) => ({ ...d, assignees: (d.assignees ?? []).filter((a) => a !== name) }));

  const toggleDep = (key: "dependsOn" | "blocks", id: string) => {
    setDraft((d) => {
      const cur = new Set([...(d[key] ?? [])]);
      if (cur.has(id)) cur.delete(id);
      else cur.add(id);
      // anti auto-référence
      cur.delete(d.id);
      return { ...d, [key]: Array.from(cur) };
    });
  };

  const otherTasks = useMemo(
    () => tasks.filter((t) => t.id !== draft.id && !t.archived),
    [tasks, draft.id]
  );

  const inChoices = useMemo(
    () =>
      otherTasks
        .filter((t) => (t.titre || t.title || "").toLowerCase().includes(qIn.trim().toLowerCase()))
        .sort((a, b) => (a.titre || a.title || "").localeCompare(b.titre || b.title || "")),
    [otherTasks, qIn]
  );

  const outChoices = useMemo(
    () =>
      otherTasks
        .filter((t) => (t.titre || t.title || "").toLowerCase().includes(qOut.trim().toLowerCase()))
        .sort((a, b) => (a.titre || a.title || "").localeCompare(b.titre || b.title || "")),
    [otherTasks, qOut]
  );

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="ft-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="ft-modal ft-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ft-modal-header">
          <h3 className="ft-modal-title">Modifier la tâche</h3>
          <button className="ft-icon-btn" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {/* Form */}
        <div className="tdm-grid">
          {/* Titre (compat: utilise draft.titre OU draft.title) */}
          <label className="tdm-field">
            <span className="tdm-label">Titre</span>
            <input
              className="cell-input"
              value={s(draft.titre ?? draft.title)}
              onChange={(e) => {
                // on remplit les deux pour rester compatible avec les deux mondes
                const v = e.target.value;
                setDraft((d) => ({ ...d, titre: v, title: v }));
              }}
              placeholder="Nom de la tâche"
            />
          </label>

         {/* Admin */}
<label className="tdm-field">
  <span className="tdm-label">Admin</span>
  <input
    list="admins-list"
    className="cell-input"
    value={draft.admin ?? ""} // ← toujours une string (jamais undefined)
    onChange={(e) =>
      setDraft((d) => ({ ...d, admin: e.target.value })) // ← on force bien une string
    }
    placeholder="Sélectionner ou saisir…"
  />
</label>


          {/* Statut */}
          <label className="tdm-field">
            <span className="tdm-label">Statut</span>
            <select
              className="ft-select"
              value={draft.statut}
              onChange={(e) => change("statut", e.target.value as Statut)}
            >
              {STATUTS.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </label>

          {/* Priorité */}
          <label className="tdm-field">
            <span className="tdm-label">Priorité</span>
            <select
              className="ft-select"
              value={(draft.priorite ?? draft.priority) ?? ""} // compat
              onChange={(e) => {
                const v = e.target.value as "" | Priorite;
                setDraft((d) => ({
                  ...d,
                  priorite: v === "" ? undefined : v,
                  priority: v === "" ? undefined : v, // synchro alias
                }));
              }}
            >
              <option value="">—</option>
              <option value="Élevé">Élevé</option>
              <option value="Moyen">Moyen</option>
              <option value="Faible">Faible</option>
            </select>
          </label>

          {/* Dates */}
          <label className="tdm-field">
            <span className="tdm-label">Début</span>
            <input
              type="date"
              className="cell-input"
              value={(draft.debut ?? draft.startDate) ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, debut: e.target.value || undefined, startDate: e.target.value || undefined }))
              }
            />
          </label>

          <label className="tdm-field">
            <span className="tdm-label">Échéance</span>
            <input
              type="date"
              className="cell-input"
              value={(draft.echeance ?? draft.dueDate) ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, echeance: e.target.value || undefined, dueDate: e.target.value || undefined }))
              }
            />
          </label>

          {/* Avancement */}
          <label className="tdm-field">
            <span className="tdm-label">Avancement (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              step={5}
              className="cell-input"
              value={typeof draft.avancement === "number" ? draft.avancement : 0}
              onChange={(e) => setDraft((d) => ({ ...d, avancement: toPct(e.target.value) }))}
            />
          </label>

          {/* Blocages texte */}
          <label className="tdm-field">
            <span className="tdm-label">Bloqué (raison)</span>
            <input
              className="cell-input"
              placeholder="Raison du blocage"
              value={s(draft.bloque ?? (draft.blockedBy || ""))}
              onChange={(e) => {
                const v = e.target.value.trim();
                setDraft((d) => ({
                  ...d,
                  bloque: v === "" ? undefined : v,
                  blockedBy: v === "" ? undefined : v, // synchro alias
                }));
              }}
            />
          </label>

          <label className="tdm-field">
            <span className="tdm-label">Bloqué par (qui/quoi)</span>
            <input
              className="cell-input"
              placeholder='Ex: "Léo (Design)" / "API Back"'
              value={s(draft.bloquePar)}
              onChange={(e) => {
                const v = e.target.value.trim();
                setDraft((d) => ({ ...d, bloquePar: v === "" ? undefined : v }));
              }}
            />
          </label>

          {/* Dépendances */}
          <div className="tdm-field span-2">
            <span className="tdm-label">Dépend de</span>
            <div style={{ display: "grid", gap: 8 }}>
              <input
                className="cell-input"
                placeholder="Rechercher…"
                value={qIn}
                onChange={(e) => setQIn(e.target.value)}
              />
              <div style={{ maxHeight: 220, overflow: "auto", display: "grid", gap: 6 }}>
                {inChoices.map((t) => (
                  <label key={t.id} className="af-row">
                    <input
                      type="checkbox"
                      checked={(draft.dependsOn ?? []).includes(t.id)}
                      onChange={() => toggleDep("dependsOn", t.id)}
                    />
                    <span style={{ fontWeight: 600 }}>{t.titre || t.title}</span>
                    <span style={{ marginLeft: "auto" }} className="badge">
                      {t.statut}
                    </span>
                  </label>
                ))}
                {!inChoices.length && <div className="ft-empty">Aucun résultat.</div>}
              </div>
            </div>
          </div>

          <div className="tdm-field span-2">
            <span className="tdm-label">Bloque</span>
            <div style={{ display: "grid", gap: 8 }}>
              <input
                className="cell-input"
                placeholder="Rechercher…"
                value={qOut}
                onChange={(e) => setQOut(e.target.value)}
              />
              <div style={{ maxHeight: 220, overflow: "auto", display: "grid", gap: 6 }}>
                {outChoices.map((t) => (
                  <label key={t.id} className="af-row">
                    <input
                      type="checkbox"
                      checked={(draft.blocks ?? []).includes(t.id)}
                      onChange={() => toggleDep("blocks", t.id)}
                    />
                    <span style={{ fontWeight: 600 }}>{t.titre || t.title}</span>
                    <span style={{ marginLeft: "auto" }} className="badge">
                      {t.statut}
                    </span>
                  </label>
                ))}
                {!outChoices.length && <div className="ft-empty">Aucun résultat.</div>}
              </div>
            </div>
          </div>

          {/* Remarques */}
          <label className="tdm-field span-2">
            <span className="tdm-label">Remarques</span>
            <textarea
              className="remarks-textarea"
              rows={4}
              value={s(draft.remarques)}
              onChange={(e) => {
                const v = e.target.value;
                setDraft((d) => ({ ...d, remarques: v.trim() === "" ? undefined : v }));
              }}
              placeholder="Notes internes, contexte…"
            />
          </label>

          {/* Assignees (multi simple) */}
          <div className="tdm-field span-2">
            <span className="tdm-label">Assignees (multi)</span>
            <div className="assignees-chips">
              {(draft.assignees ?? []).map((a) => (
                <span key={a} className="chip">
                  {a}
                  <button className="chip-x" onClick={() => removeAssignee(a)} title="Retirer" type="button">×</button>
                </span>
              ))}
            </div>
            <div className="assignees-add">
              <input
                list="admins-list"
                className="cell-input"
                placeholder="Saisir un nom puis Entrée"
                value={assigneeInput}
                onChange={(e) => setAssigneeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAssignee(); } }}
              />
              <button className="ft-btn" type="button" onClick={addAssignee}>Ajouter</button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="ft-modal-actions space-between">
          <div>
            <button className="ft-btn danger" type="button" onClick={() => onAskArchiveDelete(draft)}>
              Archiver / Supprimer…
            </button>
          </div>
          <div>
            <button
              className="ft-btn primary"
              type="button"
              onClick={() => {
                // nom sûr (jamais undefined)
                const name = (draft.titre ?? draft.title ?? "").trim();

                onSave({
                  ...draft,

                  // titre/title: toujours une string
                  titre: name,
                  title: name,

                  // 🔒 admin: toujours string (potentiellement vide)
                  admin: typeof draft.admin === "string" ? draft.admin : "",

                  // priorités (alias)
                  priorite: draft.priorite ?? draft.priority,
                  priority: draft.priorite ?? draft.priority,

                  // dates (alias) — OK si undefined côté type (optionnel)
                  debut: (draft.debut ?? draft.startDate) || undefined,
                  startDate: (draft.debut ?? draft.startDate) || undefined,
                  echeance: (draft.echeance ?? draft.dueDate) || undefined,
                  dueDate: (draft.echeance ?? draft.dueDate) || undefined,

                  // champs texte optionnels: on nettoie en undefined si vide
                  bloque: (draft.bloque ?? "").trim() || undefined,
                  blockedBy: (draft.bloque ?? "").trim() ? (draft.bloque ?? "").trim() : draft.blockedBy,
                  bloquePar: (draft.bloquePar ?? "").trim() || undefined,
                  remarques: (draft.remarques ?? "").trim() || undefined,

                  // tableaux nettoyés
                  assignees: uniq(draft.assignees ?? []),  // ← garantit string[]
                  dependsOn: uniq(draft.dependsOn ?? []),
                  blocks: uniq(draft.blocks ?? []),

                  // nombres bornés
                  avancement: typeof draft.avancement === "number" ? toPct(draft.avancement) : 0,
                });
              }}
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
