import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";
import { cn } from "../lib/cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success" | "warning";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Icône (lucide-react) affichée à côté du libellé — voir refonte UI/UX Phase 1 (2026-07-30). */
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

const variantClasses: Record<ButtonVariant, string> = {
  // Distinct de --primary : personnalisable indépendamment (Module 2 §3.15).
  primary: "bg-button text-button-foreground shadow-sm hover:opacity-90 hover:shadow-md",
  secondary: "bg-secondary text-secondary-foreground shadow-sm hover:opacity-90 hover:shadow-md",
  // Action secondaire (ex. Annuler, Fermer, Retour) — bordure seule, pas de fond plein.
  outline: "border border-border bg-background text-foreground hover:bg-muted",
  // Action discrète (ex. icône seule dans une barre d'outils) — sans bordure ni fond au repos ;
  // texte clair car posé directement sur le fond des fenêtres (--window, transparent, aucun fond propre).
  ghost: "bg-transparent text-window-foreground hover:bg-window-foreground/10",
  destructive: "bg-destructive text-destructive-foreground shadow-sm hover:opacity-90 hover:shadow-md",
  // Actions positives (réactiver/activer/restaurer) — mêmes tokens que Badge "success".
  success: "bg-success text-success-foreground shadow-sm hover:opacity-90 hover:shadow-md",
  // Actions d'avertissement uniquement (ex. forcer une action à risque modéré) — jamais pour une alerte.
  warning: "bg-warning text-warning-foreground shadow-sm hover:opacity-90 hover:shadow-md",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", icon, iconPosition = "left", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100",
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {icon && iconPosition === "left" && <span className="inline-flex shrink-0 items-center">{icon}</span>}
        {children}
        {icon && iconPosition === "right" && <span className="inline-flex shrink-0 items-center">{icon}</span>}
      </button>
    );
  }
);
Button.displayName = "Button";
