// src/utils/deps.ts
import type { Task } from "../types";

/* ============================
   Politique de dépendances
   ============================ */
export type DependencyPolicy =
  | "StrictSameKind"
  | "SameEpicOrSameKind"
  | "WhitelistCrossKind";

export type DependencyConfig = {
  policy: DependencyPolicy;
  /** autorisations explicites de croisement de types (facultatif) */
  crossKindWhitelist?: Array<{ from: string; to: string }>;
};

export const dependencyConfig: DependencyConfig = {
  policy: "SameEpicOrSameKind",
  crossKindWhitelist: [
    { from: "Comms", to: "Dev" },
    { from: "Product", to: "Dev" },
  ],
};

/* ============================
   Helpers locaux (arrays sûrs)
   ============================ */
const uniq = (xs?: string[]) =>
  Array.from(new Set((xs ?? []).filter(Boolean)));

const ensureDeps = (t: Task): Task => ({
  ...t,
  dependsOn: uniq(t.dependsOn),
  blocks: uniq(t.blocks),
});

/* ============================
   Règle d’éligibilité (canLink)
   ============================ */
export function canLink(
  blocker: Task, // A (qui bloque)
  blocked: Task, // B (qui est bloqué)
  config: DependencyConfig = dependencyConfig
): { ok: boolean; reason?: string } {
  // pas d’auto-lien
  if (!blocker?.id || blocker.id === blocked?.id) {
    return { ok: false, reason: "Auto-lien interdit" };
  }

  // 🔒 Verrou DOMAINE : si les 2 ont un domaine, ils doivent être identiques
  const hasDomains = !!blocker.domain && !!blocked.domain;
  if (hasDomains && blocker.domain !== blocked.domain) {
    return { ok: false, reason: "Domaines différents" };
  }

  // Compat: champs optionnels (ne cassent pas si absents)
  const sameKind =
    typeof blocker.kind === "string" &&
    typeof blocked.kind === "string" &&
    blocker.kind === blocked.kind;

  const sameEpic = !!blocker.epicId && blocker.epicId === blocked.epicId;

  switch (config.policy) {
    case "StrictSameKind":
      if (!sameKind)
        return {
          ok: false,
          reason: "Les dépendances doivent être dans le même type de tâche.",
        };
      return { ok: true };

    case "SameEpicOrSameKind":
      if (sameKind || sameEpic) return { ok: true };
      return {
        ok: false,
        reason: "Lien refusé : ni même type, ni même epic/projet.",
      };

    case "WhitelistCrossKind":
      if (sameKind || sameEpic) return { ok: true };
      if (
        typeof blocker.kind === "string" &&
        typeof blocked.kind === "string" &&
        config.crossKindWhitelist?.some(
          (w) => w.from === blocker.kind && w.to === blocked.kind
        )
      ) {
        return { ok: true };
      }
      return {
        ok: false,
        reason: "Croisement de types non autorisé par la politique.",
      };
  }
}

/* =========================================
   Anti-cycle : empêche A→B si B mène déjà à A
   (on parcourt les edges sortants: blocks)
   ========================================= */
export function wouldCreateCycle(
  all: Map<string, Task>,
  blockerId: string, // A
  blockedId: string  // B
): boolean {
  const seen = new Set<string>();
  const stack = [blockedId];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === blockerId) return true; // on est revenu à A → cycle
    if (seen.has(cur)) continue;
    seen.add(cur);
    const t = all.get(cur);
    if (!t) continue;
    for (const nxt of t.blocks ?? []) stack.push(nxt);
  }
  return false;
}

/* =========================================
   Lier / Délier (MAJ SYMÉTRIQUE)
   - IMPORTANT: on synchronise blocks <-> dependsOn
   ========================================= */
export function linkPair(a: Task, b: Task): { a: Task; b: Task } {
  // a bloque b  =>  a.blocks += b.id   ET   b.dependsOn += a.id
  const A = ensureDeps(a);
  const B = ensureDeps(b);
  A.blocks = uniq([...(A.blocks ?? []), B.id]);
  B.dependsOn = uniq([...(B.dependsOn ?? []), A.id]);
  return { a: A, b: B };
}

export function unlinkPair(a: Task, b: Task): { a: Task; b: Task } {
  // Retirer la relation dans les deux sens
  const A = ensureDeps(a);
  const B = ensureDeps(b);
  A.blocks = (A.blocks ?? []).filter((id) => id !== B.id);
  B.dependsOn = (B.dependsOn ?? []).filter((id) => id !== A.id);
  return { a: A, b: B };
}

/* =========================================
   Suggestions (non liantes)
   Score = sameDomain(12) + sameEpic(10) + sameKind(5) + étiquettes communes
   On applique aussi la politique canLink
   ========================================= */
export function suggestCandidates(
  source: Task,
  all: Task[],
  limit = 8
): Task[] {
  return all
    .filter((t) => t.id !== source.id && !t.archived)
    .map((t) => {
      const sameDomain =
        source.domain && t.domain && source.domain === t.domain ? 12 : 0;
      const sameEpic = !!source.epicId && source.epicId === t.epicId ? 10 : 0;
      const sameKind =
        source.kind && t.kind && source.kind === t.kind ? 5 : 0;
      const commonTags = (source.etiquettes ?? []).filter((x) =>
        (t.etiquettes ?? []).includes(x)
      ).length;
      return { t, score: sameDomain + sameEpic + sameKind + commonTags };
    })
    .filter(({ t }) => canLink(source, t).ok)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ t }) => t);
}
