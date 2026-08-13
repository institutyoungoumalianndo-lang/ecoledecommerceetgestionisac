import { Card, CardContent, CardHeader, CardTitle, Input, Label } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

/** Recettes (MODULE-07 §1.4/§8.5) — vue filtrée des paiements du Module 4.3, aucune duplication de données. */
export function RevenueScreen() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const query = trpc.financialReports.revenueSummary.useQuery({
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label>Du</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Au</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-l-4 border-emerald-500 bg-emerald-50 p-3 dark:bg-emerald-950/30">
          <p className="text-xs text-muted-foreground">Total des recettes</p>
          <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
            {query.data ? query.data.total.toLocaleString("fr-FR") : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Nombre de paiements</p>
          <p className="text-2xl font-semibold">{query.data?.count ?? "—"}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Répartition par type de frais</CardTitle>
        </CardHeader>
        <CardContent>
          {!query.data || query.data.byFeeType.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune recette sur cette période.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {query.data.byFeeType.map((f) => (
                <li key={f.feeTypeId} className="flex items-center justify-between rounded-md px-2 py-1 even:bg-muted/50">
                  <span>{f.feeTypeName}</span>
                  <span className="font-medium">{f.total.toLocaleString("fr-FR")}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
