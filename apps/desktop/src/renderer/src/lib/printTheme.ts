import { trpc } from "./trpc";

/**
 * Moteur de thèmes d'impression — source unique des couleurs pour tous les documents imprimables.
 * Retourne les CSS custom properties à poser sur le conteneur [data-print-area] du document
 * (voir globals.css, classes .print-*) ; aucun document ne doit coder une couleur en dur.
 */
export function usePrintThemeStyle(): React.CSSProperties {
  const query = trpc.printThemeSettings.get.useQuery();
  const t = query.data;
  if (!t) return {};
  return {
    "--print-border-color": t.borderColor,
    "--print-separator-color": t.separatorColor,
    "--print-title-color": t.titleColor,
    "--print-header-color": t.headerColor,
    "--print-table-color": t.tableColor,
    "--print-primary-text-color": t.primaryTextColor,
    "--print-secondary-text-color": t.secondaryTextColor,
    "--print-box-color": t.boxColor,
    "--print-total-color": t.totalColor,
    "--print-net-amount-color": t.netAmountColor,
  } as React.CSSProperties;
}
