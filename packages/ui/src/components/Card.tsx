import { type CSSProperties, type HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * "default" (fenêtre bleue standard, --window) ; "form" (bandeau d'entête en dégradé --button +
   * relief marqué, sections de formulaire — voir `.card-form-relief` dans globals.css, retenu le
   * 2026-08-09 après une série de maquettes sur la fiche Identité étudiant : "Option C — relief
   * marqué, photo mise en avant") ; "static" (fond blanc fixe, --background, jamais affecté par la
   * couleur des fenêtres — retour du porteur du projet 2026-07-31 sur les cartes de répartition des
   * tableaux de bord de module, qui devenaient bleues/peu lisibles selon le réglage retenu).
   */
  variant?: "default" | "form" | "static";
}

/**
 * La variante "form" suppose l'usage conventionnel `<CardHeader><CardTitle>...` en tout premier
 * enfant (vrai dans tous les écrans de formulaire existants) : `.card-form-relief` cible ce premier
 * enfant via `:first-child` pour lui donner le bandeau en dégradé --button, sans coupler Card à
 * CardHeader/CardTitle par du contexte React — un simple enfant en flux normal, jamais un pseudo-
 * élément positionné (une maquette précédente avait rendu des libellés illisibles avec cette
 * approche, voir historique).
 */
export function Card({ className, variant = "default", children, style, ...props }: CardProps) {
  if (variant === "form") {
    return (
      <div
        className={cn(
          "card-form-relief overflow-hidden rounded-[16px] shadow-[0_14px_30px_-10px_hsl(var(--button)/0.35)]",
          className
        )}
        {...props}
        style={
          {
            // Label/FormField lisent `text-window-foreground` (blanc, pensé pour la fenêtre bleue
            // --window) : reconfiné en local pour le corps clair de la carte, sans toucher Label.tsx
            // ni aucun des écrans de formulaire — même mécanisme que --window lui-même. Le bandeau
            // d'entête (premier enfant) reste en blanc plein via `.card-form-relief` dans globals.css,
            // indépendamment de cette variable.
            "--window-foreground": "222 47% 11%",
            ...style,
          } as CSSProperties
        }
      >
        {children}
      </div>
    );
  }

  if (variant === "static") {
    return (
      <div
        className={cn("rounded-lg border border-border bg-background text-foreground shadow-sm", className)}
        style={
          {
            // Même mécanisme que la variante "form" (voir plus haut) : Label/FormField lisent
            // `text-window-foreground` (blanc, pensé pour --window) — reconfiné en local ici aussi,
            // sinon un <Label> posé sur ce fond clair fixe reste blanc-sur-blanc. Retour du porteur
            // du projet le 2026-08-02 : titres de filtres (Niveau/Filière/Année...) illisibles.
            "--window-foreground": "222 47% 11%",
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn("window-surface rounded-lg border border-border text-window-foreground shadow-sm", className)}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold leading-none", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pt-0", className)} {...props} />;
}
