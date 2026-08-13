import { Tabs } from "@isac-erp/ui";
import { useState } from "react";
import { BudgetScreen } from "./BudgetScreen";
import { ChartAccountsScreen } from "./ChartAccountsScreen";
import { ExpensesScreen } from "./ExpensesScreen";
import { FinancialDashboardScreen } from "./FinancialDashboardScreen";
import { FinancialReportsScreen } from "./FinancialReportsScreen";
import { GeneralLedgerScreen } from "./GeneralLedgerScreen";
import { JournalScreen } from "./JournalScreen";
import { RevenueScreen } from "./RevenueScreen";
import { SuppliersScreen } from "./SuppliersScreen";
import { TrialBalanceScreen } from "./TrialBalanceScreen";

/** Coquille du module Comptabilité générale et gestion financière (MODULE-07). */
export function AccountingScreen() {
  const [tab, setTab] = useState("tableau-de-bord");

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Comptabilité</h2>

      <Tabs
        items={[
          { key: "tableau-de-bord", label: "Tableau de bord" },
          { key: "plan-comptable", label: "Plan comptable" },
          { key: "journal", label: "Journal" },
          { key: "grand-livre", label: "Grand livre" },
          { key: "balance", label: "Balance" },
          { key: "recettes", label: "Recettes" },
          { key: "depenses", label: "Dépenses" },
          { key: "fournisseurs", label: "Fournisseurs" },
          { key: "budget", label: "Budget" },
          { key: "rapports", label: "Rapports" },
        ]}
        activeKey={tab}
        onChange={setTab}
      />

      <div className="pt-2">
        {tab === "tableau-de-bord" && <FinancialDashboardScreen />}
        {tab === "plan-comptable" && <ChartAccountsScreen />}
        {tab === "journal" && <JournalScreen />}
        {tab === "grand-livre" && <GeneralLedgerScreen />}
        {tab === "balance" && <TrialBalanceScreen />}
        {tab === "recettes" && <RevenueScreen />}
        {tab === "depenses" && <ExpensesScreen />}
        {tab === "fournisseurs" && <SuppliersScreen />}
        {tab === "budget" && <BudgetScreen />}
        {tab === "rapports" && <FinancialReportsScreen />}
      </div>
    </div>
  );
}
