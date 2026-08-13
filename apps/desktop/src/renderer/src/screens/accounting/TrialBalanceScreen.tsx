import type { AccountType, TrialBalanceRow } from "@isac-erp/shared";
import { DataTable, type DataTableColumn, Input, Label } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

const TYPE_LABELS: Record<AccountType, string> = {
  ACTIF: "Actif",
  PASSIF: "Passif",
  TRESORERIE: "Trésorerie",
  CHARGE: "Charge",
  PRODUIT: "Produit",
  CAPITAUX_PROPRES: "Capitaux propres",
};

/** Balance comptable (MODULE-07 §1.11/§8.7) — générale, par période, par compte ; imprimable. */
export function TrialBalanceScreen() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const query = trpc.financialReports.trialBalance.useQuery({
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
  });

  const columns: DataTableColumn<TrialBalanceRow>[] = [
    { key: "accountCode", header: "Code", value: (r) => r.accountCode },
    { key: "accountLabel", header: "Compte", value: (r) => r.accountLabel },
    { key: "type", header: "Nature", value: (r) => TYPE_LABELS[r.type] },
    { key: "totalDebit", header: "Débit", value: (r) => r.totalDebit, render: (r) => r.totalDebit.toLocaleString("fr-FR") },
    { key: "totalCredit", header: "Crédit", value: (r) => r.totalCredit, render: (r) => r.totalCredit.toLocaleString("fr-FR") },
    { key: "balance", header: "Solde", value: (r) => r.balance, render: (r) => r.balance.toLocaleString("fr-FR") },
  ];

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

      {query.data && (
        <p className="text-sm text-muted-foreground">
          Total débit : <strong>{query.data.totalDebit.toLocaleString("fr-FR")}</strong> — Total crédit :{" "}
          <strong>{query.data.totalCredit.toLocaleString("fr-FR")}</strong>
        </p>
      )}

      <DataTable
        columns={columns}
        rows={query.data?.rows ?? []}
        getRowId={(r) => r.accountId}
        exportFilename="balance-comptable"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun compte."}
      />
    </div>
  );
}
