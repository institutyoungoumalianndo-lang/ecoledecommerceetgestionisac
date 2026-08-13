import { cn } from "../lib/cn";

export type StatRingColor = "blue" | "violet" | "sky" | "pink" | "emerald" | "amber";

const RING_COLORS: Record<StatRingColor, string> = {
  blue: "#3B82F6",
  violet: "#8B5CF6",
  sky: "#0EA5E9",
  pink: "#EC4899",
  emerald: "#10B981",
  amber: "#F59E0B",
};

/** Au-delà de 3 caractères (montants formatés, ex. "1 250 000"), le chiffre ne tient plus dans
 * l'anneau : celui-ci reste alors un simple repère de couleur et la valeur s'affiche à côté. */
const RING_INLINE_MAX_LENGTH = 3;

export interface StatRingCardProps {
  label: string;
  value?: number | string | null;
  color?: StatRingColor;
  className?: string;
}

/**
 * Carte statistique "anneau de progression" des tableaux de bord de module (Inscriptions, Paie,
 * Comptabilité, Caisse, Frais, Pédagogie, Enseignants, Pointage, Communication...) — retenue le
 * 2026-07-31 après plusieurs itérations sur maquette, en remplacement de la carte à bordure
 * colorée jusque-là dupliquée dans chacun de ces écrans.
 *
 * Distincte de `StatCard` (même dossier) : celle-ci reste la carte pleine et animée du tableau de
 * bord d'accueil (refonte UI/UX Phase 3), non concernée par ce changement.
 */
export function StatRingCard({ label, value, color = "blue", className }: StatRingCardProps) {
  const text = value === undefined || value === null ? "—" : String(value);
  const fitsInRing = text.length <= RING_INLINE_MAX_LENGTH;

  return (
    <div
      className={cn(
        "flex items-center gap-3.5 rounded-2xl bg-background p-4 text-foreground shadow-[0_10px_22px_-14px_rgba(16,32,46,0.4)]",
        className
      )}
    >
      <div
        className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ backgroundColor: RING_COLORS[color] }}
      >
        {fitsInRing ? text : ""}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-semibold text-muted-foreground">{label}</p>
        {!fitsInRing && <p className="truncate text-lg font-bold">{text}</p>}
      </div>
    </div>
  );
}
