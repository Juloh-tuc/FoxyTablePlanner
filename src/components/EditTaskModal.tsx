// src/components/EditTaskModal.tsx
import { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import "./edit-task-modal.css";
import type { Task, Statut, Priorite, Etiquette, Kind, Domain } from "../types";
import {
  STATUTS_ALL,
  PRIORITES_ALL,
  ETIQUETTES_PRESET,
  KINDS_ALL,
  DOMAINS_ALL,
} from "../types";
import { canLink, wouldCreateCycle } from "../utils/deps";

/* ---------- Helpers ---------- */
const uniqStrings = (arr: Array<string | null | undefined>): string[] =>
  Array.from(
    new Set(
      arr
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((s) => s.trim())
    )
  );

const s = (v?: string | null) => v ?? "";

const toPct = (n: unknown) => {
  const v = Number(n);
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
};

type Props = {
  open: boolean;
  task: Task;
  tasks: Task[];                 // pour les dépendances
  admins: string[];              // liste admins dispo
  onSave: (updated: Task) => void;
  onClose: () => void;
  onAskArchiveDelete: (t: Task) => void; // le parent gère l’archivage/restauration
};

export default function EditTaskModal({
  open,
  task,
  tasks = [],
  admins,
  onSave,
  onClose,
  onAskArchiveDelete,
}: Props) {
  if (!open || !task) return null;

  /* ---------- State brouillon ---------- */
  const [draft, setDraft] = useState<Task>(() => ({
    ...task,
    admin: typeof task.admin === "string" ? task.admin : "",
    assignees: Array.isArray(task.assignees) ? task.assignees : [],
    etiquettes: Array.isArray(task.etiquettes) ? task.etiquettes : [],
  }));

  // reset quand on rouvre / change de tâche
  useEffect(() => {
    if (!open) return;
    setDraft({
      ...task,
      admin: typeof task.admin === "string" ? task.admin : "",
      assignees: Array.isArray(task.assignees) ? task.assignees : [],
      etiquettes: Array.isArray(task.etiquettes) ? task.etiquettes : [],
    });
  }, [open, task]);

  const [assigneeInput, setAssigneeInput] = useState<string>("");
  const [newTag, setNewTag] = useState<string>("");

  // recherches pickers dépendances
  const [qIn, setQIn] = useState("");
  const [qOut, setQOut] = useState("");

  const change = <K extends keyof Task>(key: K, value: Task[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const addAssignee = () => {
    const v = assigneeInput.trim();
    if (!v) return;
    setDraft((d) => ({ ...d, assignees: uniqStrings([...(d.assignees ?? []), v]) }));
    setAssigneeInput("");
  };
  const removeAssignee = (name: string) =>
    setDraft((d) => ({ ...d, assignees: (d.assignees ?? []).filter((a) => a !== name) }));

  const toggleDep = (key: "dependsOn" | "blocks", id: string) => {
    setDraft((d) => {
      const cur = new Set([...(d[key] ?? [])]);
      if (cur.has(id)) cur.delete(id);
      else cur.add(id);
      cur.delete(d.id); // anti auto-référence
      return { ...d, [key]: Array.from(cur) };
    });
  };

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const otherTasks = useMemo(
    () => tasks.filter((t) => t.id !== draft.id && !t.archived),
    [tasks, draft.id]
  );

  /** 
   * IMPORTANT — sens des liens :
   * - "Dépend de"  : on crée   X -> draft   (donc canLink(X, draft), cycle(X, draft))
   * - "Bloque"     : on crée   draft -> X  (donc canLink(draft, X), cycle(draft, X))
   */
  const filteredForDepends = useMemo(
    () =>
      otherTasks.filter((t) => {
        const p = canLink(t, draft);
        if (!p.ok) return false;
        if (wouldCreateCycle(byId, t.id, draft.id)) return false; // t -> draft
        return true;
      }),
    [otherTasks, draft, byId]
  );

  const filteredForBlocks = useMemo(
    () =>
      otherTasks.filter((t) => {
        const p = canLink(draft, t);
        if (!p.ok) return false;
        if (wouldCreateCycle(byId, draft.id, t.id)) return false; // draft -> t
        return true;
      }),
    [otherTasks, draft, byId]
  );

  const inChoices = useMemo(
    () =>
      filteredForDepends
        .filter((t) =>
          (t.titre || t.title || "").toLowerCase().includes(qIn.trim().toLowerCase())
        )
        .sort((a, b) => (a.titre || a.title || "").localeCompare(b.titre || b.title || "")),
    [filteredForDepends, qIn]
  );

  const outChoices = useMemo(
    () =>
      filteredForBlocks
        .filter((t) =>
          (t.titre || t.title || "").toLowerCase().includes(qOut.trim().toLowerCase())
        )
        .sort((a, b) => (a.titre || a.title || "").localeCompare(b.titre || b.title || "")),
    [filteredForBlocks, qOut]
  );

  /* ---------- Actions ---------- */

  const handleSave = () => {
    const name = (draft.titre ?? draft.title ?? "").trim().slice(0, 80);
    if (!name) return; // bouton désactivé mais on sécurise
    const nowIso = new Date().toISOString();

    // Sanitize des sélections selon la politique et l’anti-cycle (au cas où)
    const cleanDependsOn = uniqStrings(draft.dependsOn ?? []).filter((id) => {
      if (id === draft.id) return false;
      const t = byId.get(id);
      return !!t && canLink(t, draft).ok && !wouldCreateCycle(byId, t.id, draft.id);
    });

    const cleanBlocks = uniqStrings(draft.blocks ?? []).filter((id) => {
      if (id === draft.id) return false;
      const t = byId.get(id);
      return !!t && canLink(draft, t).ok && !wouldCreateCycle(byId, draft.id, t.id);
    });

    onSave({
      ...draft,
      titre: name || "Sans titre",
      title: name || "Sans titre",

      admin: (draft.admin ?? "").trim(),

      // alias FR/EN cohérents
      priorite: draft.priorite ?? draft.priority,
      priority: draft.priorite ?? draft.priority,

      debut: (draft.debut ?? draft.startDate) || undefined,
      startDate: (draft.debut ?? draft.startDate) || undefined,
      echeance: (draft.echeance ?? draft.dueDate) || undefined,
      dueDate: (draft.echeance ?? draft.dueDate) || undefined,

      // notes libres
      bloque: (draft.bloque ?? "").trim() || undefined,
      blockedBy:
        (draft.bloque ?? "").trim() ? (draft.bloque ?? "").trim() : draft.blockedBy,
      bloquePar: (draft.bloquePar ?? "").trim() || undefined,

      // collections
      assignees: uniqStrings(draft.assignees ?? []),
      dependsOn: cleanDependsOn,
      blocks: cleanBlocks,
      etiquettes: uniqStrings(draft.etiquettes ?? []) as Etiquette[],

      // bornes
      avancement:
        typeof draft.avancement === "number" ? toPct(draft.avancement) : 0,

      // horodatage
      updatedAt: nowIso,
    });

    // NOTE: le parent garde la responsabilité de synchroniser le graphe
    // (miroirs dependsOn <-> blocks) pour toutes les tâches.
  };

  const askArchive = () => {
    const ok = window.confirm(
      'Archiver cette tâche ?\n\nVous pourrez la retrouver via la case "Afficher archivées" et la restaurer.'
    );
    if (ok) onAskArchiveDelete({ ...draft });
  };

  // Raccourcis clavier
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      const isSaveCombo =
        (e.metaKey || e.ctrlKey) &&
        (e.key.toLowerCase() === "s" || e.key === "Enter");
      if (isSaveCombo) {
        e.preventDefault();
        handleSave();
      }
      if (e.shiftKey && e.key === "Delete") {
        e.preventDefault();
        askArchive();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [draft, onClose]); // draft pour sauvegarder l’état courant

  const titleValue = s(draft.titre ?? draft.title);
  const saveDisabled = titleValue.trim().length === 0;

  /* ---------- Portal ---------- */
  return ReactDOM.createPortal(
    <div className="ft-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="ft-modal ft-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ft-modal-header">
          <h3 className="ft-modal-title">Éditer la tâche</h3>
          <button className="ft-icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="tdm-grid">
          {/* Titre */}
          <label className="tdm-field">
            <span className="tdm-label">Titre</span>
            <input
              className="cell-input"
              value={titleValue}
              onChange={(e) => {
                const v = e.target.value.slice(0, 80);
                setDraft((d) => ({ ...d, titre: v, title: v }));
              }}
              placeholder="Nom de la tâche"
            />
          </label>

          {/* Admin (saisie libre + suggestions) */}
          <label className="tdm-field">
            <span className="tdm-label">Admin</span>
            <input
              list="admins-list"
              className="cell-input"
              placeholder="Tape un prénom ou choisis…"
              value={draft.admin ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, admin: e.target.value }))}
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
              {STATUTS_ALL.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </label>

          {/* Priorité */}
          <label className="tdm-field">
            <span className="tdm-label">Priorité</span>
            <select
              className="ft-select"
              value={(draft.priorite ?? draft.priority) ?? ""}
              onChange={(e) => {
                const v = (e.target.value || "") as "" | Priorite;
                setDraft((d) => ({
                  ...d,
                  priorite: v === "" ? undefined : v,
                  priority: v === "" ? undefined : v,
                }));
              }}
            >
              <option value="">—</option>
              {PRIORITES_ALL.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
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
                setDraft((d) => ({
                  ...d,
                  debut: e.target.value || undefined,
                  startDate: e.target.value || undefined,
                }))
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
                setDraft((d) => ({
                  ...d,
                  echeance: e.target.value || undefined,
                  dueDate: e.target.value || undefined,
                }))
              }
            />
          </label>

          {/* === Nouvelles infos structurantes === */}
          <label className="tdm-field">
            <span className="tdm-label">Kind</span>
            <select
              className="ft-select"
              value={draft.kind ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  kind: (e.target.value || undefined) as Kind | undefined,
                }))
              }
            >
              <option value="">—</option>
              {KINDS_ALL.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>

          <label className="tdm-field">
            <span className="tdm-label">Domain</span>
            <select
              className="ft-select"
              value={draft.domain ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  domain: (e.target.value || undefined) as Domain | undefined,
                }))
              }
            >
              <option value="">—</option>
              {DOMAINS_ALL.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>

          <label className="tdm-field">
            <span className="tdm-label">Epic</span>
            <input
              className="cell-input"
              placeholder="ex: E-42"
              value={draft.epicId ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  epicId: e.target.value.trim() || undefined,
                }))
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
              onChange={(e) =>
                setDraft((d) => ({ ...d, avancement: toPct(e.target.value) }))
              }
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
                  blockedBy: v === "" ? undefined : v,
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

          {/* Dépendances : dépend de (entrantes) */}
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
                    <span className="badge" style={{ marginLeft: 8 }}>
                      {t.kind ?? "—"}
                    </span>
                    {t.epicId && (
                      <span className="badge" style={{ marginLeft: 6 }}>
                        epic:{t.epicId}
                      </span>
                    )}
                    <span style={{ marginLeft: "auto" }} className="badge">
                      {t.statut}
                    </span>
                  </label>
                ))}
                {!inChoices.length && (
                  <div className="ft-empty">Aucun résultat (politique/anti-cycle).</div>
                )}
              </div>
            </div>
          </div>

          {/* Dépendances : bloque (sortantes) */}
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
                    <span className="badge" style={{ marginLeft: 8 }}>
                      {t.kind ?? "—"}
                    </span>
                    {t.epicId && (
                      <span className="badge" style={{ marginLeft: 6 }}>
                        epic:{t.epicId}
                      </span>
                    )}
                    <span style={{ marginLeft: "auto" }} className="badge">
                      {t.statut}
                    </span>
                  </label>
                ))}
                {!outChoices.length && (
                  <div className="ft-empty">Aucun résultat (politique/anti-cycle).</div>
                )}
              </div>
            </div>
          </div>

          {/* Étiquettes */}
          <div className="tdm-field span-2">
            <span className="tdm-label">Étiquettes</span>

            {/* Presets */}
            <div className="tag-popover-list" style={{ marginBottom: 8 }}>
              {ETIQUETTES_PRESET.map((lbl) => (
                <label key={lbl} className="tag-option">
                  <input
                    type="checkbox"
                    checked={(draft.etiquettes ?? []).includes(lbl)}
                    onChange={() =>
                      setDraft((d) => {
                        const has = (d.etiquettes ?? []).includes(lbl);
                        const next = has
                          ? (d.etiquettes ?? []).filter((x) => x !== lbl)
                          : [...(d.etiquettes ?? []), lbl];
                        return { ...d, etiquettes: uniqStrings(next) as Etiquette[] };
                      })
                    }
                  />
                  <span>{lbl}</span>
                </label>
              ))}
            </div>

            {/* Liste actuelle + suppression */}
            <div className="assignees-chips" style={{ marginBottom: 8 }}>
              {(draft.etiquettes ?? []).map((tag) => (
                <span key={tag} className="chip">
                  {tag}
                  <button
                    className="chip-x"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        etiquettes: (d.etiquettes ?? []).filter((x) => x !== tag),
                      }))
                    }
                    title="Retirer"
                    type="button"
                  >
                    ×
                  </button>
                </span>
              ))}
              {(draft.etiquettes ?? []).length === 0 && (
                <span className="muted">Aucune étiquette</span>
              )}
            </div>

            {/* Ajout custom */}
            <div className="assignees-add">
              <input
                className="cell-input"
                placeholder="Ajouter une étiquette personnalisée… (Entrée)"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const t = newTag.trim();
                    if (t && !(draft.etiquettes ?? []).includes(t as Etiquette)) {
                      setDraft((d) => ({
                        ...d,
                        etiquettes: uniqStrings([...(d.etiquettes ?? []), t]) as Etiquette[],
                      }));
                    }
                    setNewTag("");
                  }
                }}
              />
              <button
                className="ft-btn"
                type="button"
                onClick={() => {
                  const t = newTag.trim();
                  if (t && !(draft.etiquettes ?? []).includes(t as Etiquette)) {
                    setDraft((d) => ({
                      ...d,
                      etiquettes: uniqStrings([...(d.etiquettes ?? []), t]) as Etiquette[],
                    }));
                  }
                  setNewTag("");
                }}
              >
                + Ajouter
              </button>
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
                const v = e.target.value.slice(0, 250);
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
                  <button
                    className="chip-x"
                    onClick={() => removeAssignee(a)}
                    title="Retirer"
                    type="button"
                  >
                    ×
                  </button>
                </span>
              ))}
              {(draft.assignees ?? []).length === 0 && (
                <span className="muted">Personne pour l’instant</span>
              )}
            </div>
            <div className="assignees-add">
              <input
                list="admins-list"
                className="cell-input"
                placeholder="Saisir un nom puis Entrée"
                value={assigneeInput}
                onChange={(e) => setAssigneeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAssignee();
                  }
                }}
              />
              <button className="ft-btn" type="button" onClick={addAssignee}>
                Ajouter
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="ft-modal-actions space-between">
          <div>
            <button className="ft-btn danger" type="button" onClick={askArchive}>
              Archiver
            </button>
          </div>
          <div>
            <button className="ft-btn ghost" type="button" onClick={onClose}>
              Annuler
            </button>
            <button
              className="ft-btn primary"
              type="button"
              onClick={handleSave}
              disabled={saveDisabled}
              title={saveDisabled ? "Le titre est requis" : "Enregistrer (Ctrl/Cmd+S)"}
            >
              Enregistrer
            </button>
          </div>
        </div>

        {/* datalist pour l’auto-complétion des assignés */}
        <datalist id="admins-list">
          {admins.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </div>
    </div>,
    document.body
  );
}
