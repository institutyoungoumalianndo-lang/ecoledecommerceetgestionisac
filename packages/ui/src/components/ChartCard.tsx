import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "./Card";

/**
 * Palette catégorielle validée via le script de la compétence dataviz (CVD ΔE ≥ 8, contraste ≥ 3:1
 * avec labels visibles pour les teintes faibles) — extraite de `HomeDashboardScreen.tsx` (refonte
 * UI/UX Phase 3) vers `packages/ui` le 2026-08-06 (Module 10) pour être réutilisée par tout nouvel
 * écran de rapport plutôt que redéfinie. Distincte des couleurs de statut (rouge/vert/orange,
 * réservées aux alertes/validations/avertissements de la charte — jamais réutilisées ici).
 */
export const CHART_CATEGORICAL_PALETTE = ["#1f60ae", "#d94b13", "#13865d", "#c48500", "#e24e86", "#4c3ab1"];
export const CHART_SEQUENTIAL_BLUE = "#1f60ae";
export const CHART_SEQUENTIAL_ORANGE = "#d94b13";

/**
 * Carte de graphique réutilisable (extraite de `HomeDashboardScreen.tsx`, 2026-08-06, Module 10) —
 * fond volontairement toujours blanc, quelle que soit la "Couleur des fenêtres" réglée dans
 * Paramètres → Apparence (retour du porteur du projet, 2026-07-30) : les graphiques (grille/axes/
 * légendes recharts, couleurs de séries) sont conçus pour un fond clair et ne doivent jamais changer
 * avec le reste de l'appli. Forcé par style inline (et non une classe bg-background/text-foreground)
 * car `cn()` ne fait pas de fusion tailwind-merge ici.
 */
export function ChartCard({
  title,
  empty,
  accentColor,
  children,
}: {
  title: string;
  empty: boolean;
  accentColor: string;
  children: ReactElement;
}) {
  return (
    <Card
      className="overflow-hidden border-t-4"
      style={{
        borderTopColor: accentColor,
        backgroundColor: "hsl(var(--background))",
        backgroundImage: "none",
        color: "hsl(var(--foreground))",
      }}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        {empty ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Aucune donnée.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
