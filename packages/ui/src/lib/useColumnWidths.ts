import { useCallback, useRef, useState } from "react";

const MIN_COLUMN_WIDTH = 60;

/**
 * Redimensionnement de colonnes par glissement (refonte UI/UX Phase 4, 2026-07-30) — partagé entre
 * `DataTable` et `ServerDataTable`. `initial` vient des préférences persistées (voir `tablePrefs.ts`)
 * quand un `columnStorageKey` est fourni ; sinon les colonnes gardent leur largeur naturelle tant
 * qu'aucun glissement n'a eu lieu (clé absente de `widths`).
 */
export function useColumnWidths(initial: Record<string, number> = {}) {
  const [widths, setWidths] = useState<Record<string, number>>(initial);
  const drag = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const startResize = useCallback(
    (key: string, currentWidth: number) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      drag.current = { key, startX: e.clientX, startWidth: currentWidth };

      function onMove(ev: MouseEvent) {
        if (!drag.current) return;
        const delta = ev.clientX - drag.current.startX;
        const nextWidth = Math.max(MIN_COLUMN_WIDTH, drag.current.startWidth + delta);
        setWidths((w) => ({ ...w, [drag.current!.key]: nextWidth }));
      }
      function onUp() {
        drag.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    []
  );

  return { widths, startResize, setWidths };
}
