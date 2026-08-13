import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";

export type StatCardAccent = "primary" | "secondary" | "success" | "destructive" | "warning";

// Couleur du badge d'icône uniquement (retour du porteur du projet 2026-07-31, maquette "Carte
// blanche, badge coloré" retenue parmi 5 propositions) — la carte elle-même est désormais blanche ;
// seule l'icône porte la couleur, sémantique (alerte/validation/avertissement) ou décorative.
const accentSolidClasses: Record<StatCardAccent, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  success: "bg-success",
  destructive: "bg-destructive",
  warning: "bg-warning",
};

/** Anime un nombre de sa valeur précédente vers `target` (refonte UI/UX Phase 3, 2026-07-30). */
function useAnimatedNumber(target: number, durationMs = 700): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    let frame: number;

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = target;
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

export interface StatCardProps {
  label: string;
  value: number | null;
  icon: LucideIcon;
  /** Teinte sémantique (rouge/vert/orange = alerte/validation/avertissement, jamais décoratifs). */
  accent?: StatCardAccent;
  /**
   * Couleur décorative brute (hex), pour les indicateurs neutres qui ne portent aucun statut —
   * réutilise la palette catégorielle déjà validée (compétence dataviz) plutôt que de détourner
   * les jetons sémantiques. Prioritaire sur `accent` si fourni.
   */
  color?: string;
  formatValue?: (value: number) => string;
  className?: string;
}

/** Carte statistique animée du tableau de bord d'accueil (refonte UI/UX Phase 3, restylée
 * "carte blanche, badge coloré" le 2026-07-31). */
export function StatCard({ label, value, icon: Icon, accent = "primary", color, formatValue, className }: StatCardProps) {
  const animated = useAnimatedNumber(value ?? 0);
  if (value === null) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-background p-4 text-foreground shadow-[0_10px_22px_-14px_rgba(16,32,46,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-16px_rgba(16,32,46,0.5)]",
        className
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white",
          !color && accentSolidClasses[accent]
        )}
        style={color ? { backgroundColor: color } : undefined}
      >
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tabular-nums text-foreground">
          {formatValue ? formatValue(animated) : animated.toLocaleString("fr-FR")}
        </p>
      </div>
    </div>
  );
}
