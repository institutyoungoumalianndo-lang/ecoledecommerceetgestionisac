import { DataTable, type DataTableColumn, Input, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { formatTimestamp } from "../../lib/formatTimestamp";
import { trpc } from "../../lib/trpc";

/** Grand livre (MODULE-07 §1.11/§8.6) — consultation par compte et par période, calculé depuis journal_entry_lines. */
export function GeneralLedgerScreen() {
  const accountsQuery = trpc.chartAccounts.list.useQuery({});
  const [accountId, setAccountId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const ledgerQuery = trpc.financialReports.generalLedger.useQuery(
    { accountId, dateFrom: dateFrom ? new Date(dateFrom) : undefined, dateTo: dateTo ? new Date(dateTo) : undefined },
    { enabled: Boolean(accountId) }
  );

  const columns: DataTableColumn<NonNullable<typeof ledgerQuery.data>["lines"][number]>[] = [
    { key: "entryDate", header: "Date", value: (l) => formatTimestamp(l.entryDate) },
    { key: "entryNumber", header: "N° écriture", value: (l) => l.entryNumber },
    { key: "label", header: "Libellé", value: (l) => l.label },
    { key: "debit", header: "Débit", value: (l) => l.debit, render: (l) => (l.debit > 0 ? l.debit.toLocaleString("fr-FR") : "—") },
    { key: "credit", header: "Crédit", value: (l) => l.credit, render: (l) => (l.credit > 0 ? l.credit.toLocaleString("fr-FR") : "—") },
    { key: "runningBalance", header: "Solde", value: (l) => l.runningBalance, render: (l) => l.runningBalance.toLocaleString("fr-FR") },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Compte</Label>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {(accountsQuery.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Du</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Au</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      {!accountId ? (
        <p className="text-sm text-muted-foreground">Sélectionnez un compte pour afficher son grand livre.</p>
      ) : ledgerQuery.data ? (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Solde d'ouverture</p>
              <p className="text-lg font-semibold">{ledgerQuery.data.openingBalance.toLocaleString("fr-FR")}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Solde de clôture</p>
              <p className="text-lg font-semibold">{ledgerQuery.data.closingBalance.toLocaleString("fr-FR")}</p>
            </div>
          </div>
          <DataTable
            columns={columns}
            rows={ledgerQuery.data.lines}
            getRowId={(l) => l.journalEntryId + l.entryDate.toString()}
            exportFilename={`grand-livre-${ledgerQuery.data.accountCode}`}
            emptyMessage="Aucun mouvement sur cette période."
          />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      )}
    </div>
  );
}
