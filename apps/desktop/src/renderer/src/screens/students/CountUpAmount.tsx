import { useEffect, useRef, useState } from "react";

/**
 * Montant qui s'incrémente à l'affichage (refonte "Contraste marine" de la fiche élève, 2026-08-02,
 * retour du porteur du projet : "plus joli et plus animé"). Ré-anime à chaque changement de `value`
 * (ex. changement d'étudiant) — pas seulement au montage.
 */
export function CountUpAmount({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const frame = useRef<number>();

  useEffect(() => {
    const start = performance.now();
    const duration = 700;
    const from = 0;

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value]);

  return (
    <span className="tabular-nums">
      {display.toLocaleString("fr-FR")}
      {suffix}
    </span>
  );
}
