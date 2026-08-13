import { Card, CardContent, CardHeader, CardTitle, StatRingCard as StatCard } from "@isac-erp/ui";
import { trpc } from "../../lib/trpc";

/** Tableau de bord financier (MODULE-07 §8.13) — graphiques rendus en CSS, cohérent avec le reste de l'ERP. */
export function FinancialDashboardScreen() {
  const query = trpc.financialReports.dashboard.useQuery();
  const data = query.data;
  const maxValue = data ? Math.max(1, ...data.recentMonths.flatMap((m) => [m.recettes, m.depenses])) : 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Recettes du jour" value={data ? data.recettesToday.toLocaleString("fr-FR") : undefined} color="emerald" />
        <StatCard label="Dépenses du jour" value={data ? data.depensesToday.toLocaleString("fr-FR") : undefined} color="amber" />
        <StatCard label="Recettes du mois" value={data ? data.recettesMonth.toLocaleString("fr-FR") : undefined} color="blue" />
        <StatCard label="Dépenses du mois" value={data ? data.depensesMonth.toLocaleString("fr-FR") : undefined} color="violet" />
        <StatCard label="Trésorerie disponible" value={data ? data.treasuryBalance.toLocaleString("fr-FR") : undefined} color="emerald" />
      </div>

      <Card variant="static">
        <CardHeader>
          <CardTitle>Évolution des 6 derniers mois</CardTitle>
        </CardHeader>
        <CardContent>
          {!data || data.recentMonths.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.recentMonths.map((m) => (
                <div key={m.label} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium capitalize">{m.label}</span>
                    <span>
                      Recettes {m.recettes.toLocaleString("fr-FR")} — Dépenses {m.depenses.toLocaleString("fr-FR")}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-emerald-500" style={{ width: `${(m.recettes / maxValue) * 100}%` }} />
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-amber-500" style={{ width: `${(m.depenses / maxValue) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
