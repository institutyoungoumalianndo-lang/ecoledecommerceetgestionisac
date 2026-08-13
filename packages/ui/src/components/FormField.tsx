import { AlertCircle } from "lucide-react";
import { type ReactElement, type ReactNode, cloneElement, isValidElement } from "react";
import { Label } from "./Label";
import { cn } from "../lib/cn";

export interface FormFieldProps {
  label: string;
  /** Affiche un astérisque rouge après le libellé — jamais déduit automatiquement du schéma Zod
   * (un champ optionnel côté schéma peut rester présenté comme obligatoire à la saisie). */
  required?: boolean;
  /** Message d'erreur de validation (ex. `errors.firstName?.message` de react-hook-form). */
  error?: string;
  /** Texte d'aide affiché quand il n'y a pas d'erreur. */
  hint?: string;
  /** Doit être un unique élément (Input/Select/...) — reçoit automatiquement `aria-invalid`. */
  children: ReactNode;
  className?: string;
}

/**
 * Enveloppe de champ de formulaire harmonisée (refonte UI/UX Phase 5, 2026-07-30) : libellé,
 * indicateur "obligatoire", message d'erreur élégant (icône + texte), et bordure rouge automatique
 * sur le champ enfant via `aria-invalid` (voir `Input`/`Select` : `aria-invalid:border-destructive`).
 */
export function FormField({ label, required, error, hint, children, className }: FormFieldProps) {
  const field = isValidElement(children)
    ? cloneElement(children as ReactElement<{ "aria-invalid"?: boolean }>, { "aria-invalid": Boolean(error) })
    : children;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label>
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {field}
      {error ? (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle size={12} className="shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-window-foreground/70">{hint}</p>
      ) : null}
    </div>
  );
}
