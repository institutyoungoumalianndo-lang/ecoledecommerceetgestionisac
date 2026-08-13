import { Card, CardContent, CardHeader, CardTitle, StatRingCard as StatCard } from "@isac-erp/ui";
import { trpc } from "../../lib/trpc";

/** Tableau de bord des frais (MODULE-04.2 §6.9) — couleurs par pertinence, cohérent avec le Module 4.1. */
export function FeeDashboardScreen() {
  const query = trpc.feeSummary.dashboard.useQuery({});
  const data = query.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Types de frais actifs" value={data?.totalFeeTypes} color="blue" />
        <StatCard label="Tarifs configurés" value={data?.totalTariffs} color="violet" />
        <StatCard
          label="Montant moyen des frais"
          value={data ? Math.round(data.averageTariffAmount).toLocaleString("fr-FR") : undefined}
          color="emerald"
        />
      </div>

      <Card variant="static">
        <CardHeader>
          <CardTitle>Frais les plus utilisés</CardTitle>
        </CardHeader>
        <CardContent>
          {!data || data.byFeeType.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {data.byFeeType.map((f, index) => {
                const palette = ROW_PALETTE[index % ROW_PALETTE.length]!;
                return (
                  <li key={f.feeTypeId} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 even:bg-muted/50">
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${palette.dot}`} />
                      {f.feeTypeName}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${palette.badge}`}>
                      {f.tariffCount} tarif(s)
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const ROW_PALETTE: { dot: string; badge: string }[] = [
  { dot: "bg-blue-500", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  { dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  { dot: "bg-amber-500", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  { dot: "bg-violet-500", badge: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300" },
  { dot: "bg-pink-500", badge: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300" },
];
