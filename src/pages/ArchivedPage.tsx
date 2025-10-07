import { useEffect, useMemo, useState } from "react";
// src/pages/ArchivedPage.tsx
import { fetchArchivedTasks } from "../api";
import TaskActions from "../components/TaskActions";
import type { Task, Etiquette, Statut } from "../types";

function ArchivedPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<Etiquette | "">("");
  const [statut, setStatut] = useState<Statut | "">("");

  useEffect(() => {
    fetchArchivedTasks().then(setTasks).catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      // 🔁 Remplace `description` -> `remarques` ; `tags` -> `etiquettes`
      const hay =
        `${(t.titre || t.title || "").toLowerCase()} ` +
        `${(t.remarques || "").toLowerCase()} ` +
        `${(t.bloque || "").toLowerCase()} ` + // bonus: on cherche aussi dans "bloque"
        `${(t.admin || "").toLowerCase()}`;

      const okQ = q ? hay.includes(q.toLowerCase()) : true;
      const okTag = tag ? (t.etiquettes ?? []).includes(tag) : true;
      const okSt = statut ? t.statut === statut : true;
      return okQ && okTag && okSt;
    });
  }, [tasks, q, tag, statut]);

  function onChange(next: Task) {
    setTasks((old) => {
      if (!next.archived) return old.filter((t) => t.id !== next.id); // restaurée → sort de la page
      return old.map((t) => (t.id === next.id ? next : t));
    });
  }

  return (
    <div className="archived-page">
      <header className="ft-page-header">
        <h1>Archivées</h1>
        <p className="muted">Toutes les tâches archivées, restaurables à tout moment.</p>
      </header>

      <div className="ft-filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" />
        <select value={tag} onChange={(e) => setTag((e.target.value || "") as any)}>
          <option value="">Toutes étiquettes</option>
          <option>Web</option>
          <option>Front-BO</option>
          <option>Back-FO</option>
          <option>Front-FO</option>
          <option>Back-BO</option>
          <option>API</option>
          <option>Design</option>
          <option>Mobile</option>
          <option>Autre</option>
        </select>
        <select value={statut} onChange={(e) => setStatut((e.target.value || "") as any)}>
          <option value="">Tous statuts</option>
          <option>Terminé</option>
          <option>En cours</option>
          <option>En attente</option>
          <option>Bloqué</option>
          <option>Pas commencé</option>
        </select>
      </div>

      <ul className="ft-list">
        {filtered.map((t) => (
          <li key={t.id} className="ft-card">
            <div className="ft-card-main">
              <h3>{t.titre || t.title}</h3>
              {/* Ces champs existent si tu les as ajoutés à Task. Sinon, supprime-les ici. */}
              {"archivedReason" in t && t.archivedReason ? (
                <p className="muted">Raison : {t.archivedReason}</p>
              ) : null}
              {t.archivedAt ? (
                <p className="muted">Archivée le {new Date(t.archivedAt).toLocaleDateString("fr-FR")}</p>
              ) : null}
              {t.remarques ? <p className="muted">Remarques : {t.remarques}</p> : null}
              {t.etiquettes && t.etiquettes.length > 0 ? (
                <p className="muted">Étiquettes : {t.etiquettes.join(", ")}</p>
              ) : null}
            </div>
            <div className="ft-card-actions">
              <TaskActions task={t} onChange={onChange} />
            </div>
          </li>
        ))}
        {filtered.length === 0 && <p className="muted">Aucune tâche archivée.</p>}
      </ul>
    </div>
  );
}

export default ArchivedPage;
