"use client";

import type { AccountType, ChartAccountDto, GeneralLedgerResult, TrialBalanceResult } from "@isac-erp/shared";
import { Card, DataTable, type DataTableColumn, Input, Label, Select, Tabs } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { trpcClient } from "../../../../lib/trpc";

type TabKey = "grandLivre" | "balance";

const TYPE_LABELS: Record<AccountType, string> = {
  ACTIF: "Actif",
  PASSIF: "Passif",
  TRESORERIE: "Trésorerie",
  CHARGE: "Charge",
  PRODUIT: "Produit",
  CAPITAUX_PROPRES: "Capitaux propres",
};

/**
 * Comptabilité — Grand livre et Balance (MODULE-07 §1.11/§8.6-8.7), portée au portail Super
 * Administrateur — réutilise directement `financialReports.generalLedger`/`trialBalance` et
 * `chartAccounts.list` (déjà `permissionProcedure`, contournés par le rôle Super Admin) et le même
 * modèle que `GeneralLedgerScreen.tsx`/`TrialBalanceScreen.tsx` (desktop).
 */
export default function AdminAccountingPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("grandLivre");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <h1 className="text-lg font-semibold text-window-foreground">Comptabilité</h1>

      <Card variant="static" className="p-4">
        <Tabs
          items={[
            { key: "grandLivre", label: "Grand livre" },
            { key: "balance", label: "Balance" },
          ]}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
        />
        <div className="pt-4">
          {activeTab === "grandLivre" && <GeneralLedgerTab />}
          {activeTab === "balance" && <TrialBalanceTab />}
        </div>
      </Card>
    </div>
  );
}

function GeneralLedgerTab() {
  const [accounts, setAccounts] = useState<ChartAccountDto[]>([]);
  const [accountId, setAccountId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [ledger, setLedger] = useState<GeneralLedgerResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    trpcClient.chartAccounts.list.query({}).then(setAccounts).catch(() => setAccounts([]));
  }, []);

  useEffect(() => {
    if (!accountId) {
      setLedger(null);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    trpcClient.financialReports.generalLedger
      .query({
        accountId,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      })
      .then(setLedger)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement du grand livre."))
      .finally(() => setIsLoading(false));
  }, [accountId, dateFrom, dateTo]);

  const columns: DataTableColumn<GeneralLedgerResult["lines"][number]>[] = [
    { key: "entryDate", header: "Date", value: (l) => new Date(l.entryDate).getTime(), render: (l) => new Date(l.entryDate).toLocaleDateString("fr-FR") },
    { key: "entryNumber", header: "N° écriture", value: (l) => l.entryNumber },
    { key: "label", header: "Libellé", value: (l) => l.label },
    { key: "debit", header: "Débit", value: (l) => l.debit, render: (l) => (l.debit > 0 ? l.debit.toLocaleString("fr-FR") : "—") },
    { key: "credit", header: "Crédit", value: (l) => l.credit, render: (l) => (l.credit > 0 ? l.credit.toLocaleString("fr-FR") : "—") },
    { key: "runningBalance", header: "Solde", value: (l) => l.runningBalance, render: (l) => l.runningBalance.toLocaleString("fr-FR") },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label>Compte</Label>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.code} — {a.label}</option>
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

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      {!accountId ? (
        <p className="text-sm text-window-foreground/70">Sélectionnez un compte pour afficher son grand livre.</p>
      ) : isLoading || !ledger ? (
        <p className="text-sm text-window-foreground/70">Chargement…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Solde d'ouverture</p>
              <p className="text-lg font-semibold text-foreground">{ledger.openingBalance.toLocaleString("fr-FR")}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Solde de clôture</p>
              <p className="text-lg font-semibold text-foreground">{ledger.closingBalance.toLocaleString("fr-FR")}</p>
            </div>
          </div>
          <DataTable
            columns={columns}
            rows={ledger.lines}
            getRowId={(l) => l.journalEntryId + l.entryDate.toString()}
            exportFilename={`grand-livre-${ledger.accountCode}`}
            emptyMessage="Aucun mouvement sur cette période."
          />
        </>
      )}
    </div>
  );
}

function TrialBalanceTab() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [result, setResult] = useState<TrialBalanceResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    trpcClient.financialReports.trialBalance
      .query({ dateFrom: dateFrom ? new Date(dateFrom) : undefined, dateTo: dateTo ? new Date(dateTo) : undefined })
      .then(setResult)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement de la balance."))
      .finally(() => setIsLoading(false));
  }, [dateFrom, dateTo]);

  const columns: DataTableColumn<TrialBalanceResult["rows"][number]>[] = [
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

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      {result && (
        <p className="text-sm text-window-foreground/70">
          Total débit : <strong>{result.totalDebit.toLocaleString("fr-FR")}</strong> — Total crédit :{" "}
          <strong>{result.totalCredit.toLocaleString("fr-FR")}</strong>
        </p>
      )}

      <DataTable
        columns={columns}
        rows={result?.rows ?? []}
        getRowId={(r) => r.accountId}
        exportFilename="balance-comptable"
        emptyMessage={isLoading ? "Chargement…" : "Aucun compte."}
      />
    </div>
  );
}
