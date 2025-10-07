import { useState } from "react";
import { useTasks } from "../store/tasksStore";
import ArchiveConfirmDialog from "./ArchiveConfirmDialog";
import type { Task } from "../types";

type Props = {
  task: Task;
  onChange?: (next: Task) => void; // facultatif : compat avec tes parents
};

function TaskActions({ task, onChange }: Props) {
  const { archive, restore } = useTasks();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const label = task.titre || task.title || "la tâche";
  const isArchived = !!task.archived;

  function doArchive(reason?: string) {
    if (busy) return;
    setBusy(true);
    // mutation store
    archive(task.id, reason);
    // compat éventuelle avec des parents qui attendent onChange
    onChange?.({
      ...task,
      archived: true,
      archivedAt: new Date().toISOString(),
      archivedReason: reason ?? null,
    });
    setConfirm(false);
    setBusy(false);
  }

  function doRestore() {
    if (busy) return;
    setBusy(true);
    restore(task.id);
    onChange?.({
      ...task,
      archived: false,
      archivedAt: null,
      archivedReason: null,
    });
    setBusy(false);
  }

  return (
    <>
      {!isArchived ? (
        <button
          className="btn-ghost dangerish"
          onClick={() => setConfirm(true)}
          title="Archiver"
          disabled={busy}
        >
          Archiver
        </button>
      ) : (
        <button
          className="btn-ghost"
          onClick={doRestore}
          title="Restaurer"
          disabled={busy}
        >
          Restaurer
        </button>
      )}

      <ArchiveConfirmDialog
        open={confirm}
        label={label}
        onConfirm={doArchive}
        onClose={() => setConfirm(false)}
      />
    </>
  );
}

export default TaskActions;
