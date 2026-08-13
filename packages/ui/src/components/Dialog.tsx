import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";

export type DialogVariant = "default" | "destructive" | "success" | "warning";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Icône (lucide-react) affichée devant le titre — voir refonte UI/UX Phase 1 (2026-07-30). */
  icon?: ReactNode;
  /** Teinte du titre/icône selon la nature de l'action (suppression, validation, avertissement). */
  variant?: DialogVariant;
}

const variantTitleClasses: Record<DialogVariant, string> = {
  default: "text-window-foreground",
  destructive: "text-destructive",
  success: "text-success",
  warning: "text-warning",
};

/**
 * Modale simple, sans dépendance externe (cohérent avec le choix du Module 0
 * de composants "maison" plutôt que Radix pour rester léger). Suffisant pour
 * les formulaires du Module 1 ; à réévaluer si des besoins d'accessibilité
 * plus poussés (focus trap complet, etc.) apparaissent plus tard.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  icon,
  variant = "default",
}: DialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // Rendu en portail directement sous <body> : à l'impression, le reste de l'application (sous
  // #root) est masqué en bloc (voir globals.css), ce que permettait déjà `position: fixed` à
  // l'écran mais pas à l'impression paginée — un ancêtre `position: fixed` "réancre" le contenu
  // imprimable sur chaque page au lieu de le laisser s'écouler normalement sur plusieurs pages
  // (en-tête visible sur la 1ère page seulement, contenu de fin de document coupé). Le portail
  // évite aussi qu'un enseignant "poussé" derrière un ancêtre masqué mais toujours en flux
  // (`visibility: hidden` ne libère pas l'espace) ne s'imprime hors de la page.
  return createPortal(
    <div
      data-dialog-overlay
      className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        data-dialog-panel
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={cn(
          "animate-dialog-in window-surface flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border border-border text-window-foreground shadow-xl",
          className
        )}
      >
        <div data-dialog-header className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
          <div className="flex items-start gap-3">
            {icon && <span className={cn("mt-0.5 inline-flex shrink-0", variantTitleClasses[variant])}>{icon}</span>}
            <div>
              <h2 id="dialog-title" className={cn("text-lg font-semibold", variantTitleClasses[variant])}>
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div data-dialog-body className="overflow-y-auto px-6 py-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
