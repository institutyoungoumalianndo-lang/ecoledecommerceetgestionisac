import type { ReportPeriod } from "@isac-erp/shared";
import { Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  JOUR: "Journalier",
  SEMAINE: "Hebdomadaire",
  MOIS: "Mensuel",
  ANNEE: "Annuel",
};

/** Rapports financiers (MODULE-07 §1.11/§8.12) — par période, catégorie, utilisateur, caisse. */
export function FinancialReportsScreen() {
  const [period, setPeriod] = useState<ReportPeriod>("MOIS");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const byPeriodQuery = trpc.financialReports.byPeriod.useQuery({ period, date: new Date(date) });
  const byCategoryQuery = trpc.financialReports.byCategory.useQuery({});
  const byUserQuery = trpc.financialReports.byUser.useQuery({});
  const byCashRegisterQuery = trpc.financialReports.byCashRegister.useQuery({});

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label>Type de rapport</Label>
          <Select value={period} onChange={(e) => setPeriod(e.target.value as ReportPeriod)}>
            {Object.entries(PERIOD_LABELS).map(([value, l]) => <option key={value} value={value}>{l}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Date de référence</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {byPeriodQuery.data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-l-4 border-emerald-500 bg-emerald-50 p-3 dark:bg-emerald-950/30">
            <p className="text-xs text-muted-foreground">Recettes — {byPeriodQuery.data.periodLabel}</p>
            <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">{byPeriodQuery.data.totalRecettes.toLocaleString("fr-FR")}</p>
          </div>
          <div className="rounded-lg border border-l-4 border-amber-500 bg-amber-50 p-3 dark:bg-amber-950/30">
            <p className="text-xs text-muted-foreground">Dépenses</p>
            <p className="text-lg font-semibold text-amber-700 dark:text-amber-300">{byPeriodQuery.data.totalDepenses.toLocaleString("fr-FR")}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Solde</p>
            <p className="text-lg font-semibold">{byPeriodQuery.data.solde.toLocaleString("fr-FR")}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Par catégorie de dépense</CardTitle>
          </CardHeader>
          <CardContent>
            {!byCategoryQuery.data || byCategoryQuery.data.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {byCategoryQuery.data.rows.map((r) => (
                  <li key={r.categoryId} className="flex justify-between rounded-md px-2 py-1 even:bg-muted/50">
                    <span>{r.categoryName}</span>
                    <span className="font-medium">{r.total.toLocaleString("fr-FR")}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Par utilisateur</CardTitle>
          </CardHeader>
          <CardContent>
            {!byUserQuery.data || byUserQuery.data.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {byUserQuery.data.rows.map((r) => (
                  <li key={r.userId} className="flex justify-between rounded-md px-2 py-1 even:bg-muted/50">
                    <span>{r.userName}</span>
                    <span className="font-medium">
                      +{r.totalRecettes.toLocaleString("fr-FR")} / -{r.totalDepenses.toLocaleString("fr-FR")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Par caisse</CardTitle>
          </CardHeader>
          <CardContent>
            {!byCashRegisterQuery.data || byCashRegisterQuery.data.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {byCashRegisterQuery.data.rows.map((r) => (
                  <li key={r.cashRegisterId} className="flex justify-between rounded-md px-2 py-1 even:bg-muted/50">
                    <span>{r.cashRegisterName}</span>
                    <span className="font-medium">{r.total.toLocaleString("fr-FR")}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
