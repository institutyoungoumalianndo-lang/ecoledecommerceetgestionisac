import { useCallback, useState } from "react";

export interface SortRule {
  key: string;
  direction: "asc" | "desc";
}

/**
 * Tri multi-colonnes côté client (refonte UI/UX Phase 4, 2026-07-30) : clic = tri sur cette seule
 * colonne (asc → desc → aucun) ; Maj+clic = ajoute/retire cette colonne comme critère secondaire
 * sans perdre les précédents. Réservé à `DataTable` (données déjà en mémoire) — `ServerDataTable`
 * garde un tri mono-colonne délégué au serveur, son contrat actuel ne portant qu'une seule clé.
 */
export function useMultiSort() {
  const [rules, setRules] = useState<SortRule[]>([]);

  const toggleSort = useCallback((key: string, additive: boolean) => {
    setRules((prev) => {
      const index = prev.findIndex((r) => r.key === key);
      if (!additive) {
        if (prev.length === 1 && index === 0) {
          if (prev[0]!.direction === "asc") return [{ key, direction: "desc" }];
          return [];
        }
        return [{ key, direction: "asc" }];
      }
      if (index === -1) return [...prev, { key, direction: "asc" }];
      const rule = prev[index]!;
      if (rule.direction === "asc") {
        const next = [...prev];
        next[index] = { key, direction: "desc" };
        return next;
      }
      return prev.filter((r) => r.key !== key);
    });
  }, []);

  const ruleFor = useCallback((key: string) => rules.find((r) => r.key === key), [rules]);

  return { rules, toggleSort, ruleFor };
}

export function applySortRules<T>(rows: T[], rules: SortRule[], valueOf: (row: T, key: string) => string | number): T[] {
  if (rules.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const rule of rules) {
      const va = valueOf(a, rule.key);
      const vb = valueOf(b, rule.key);
      const factor = rule.direction === "asc" ? 1 : -1;
      if (va < vb) return -1 * factor;
      if (va > vb) return 1 * factor;
    }
    return 0;
  });
}
