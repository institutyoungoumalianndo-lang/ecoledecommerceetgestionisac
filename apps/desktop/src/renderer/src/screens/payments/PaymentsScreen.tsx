import { Tabs } from "@isac-erp/ui";
import { useState } from "react";
import { CashRegisterScreen } from "./CashRegisterScreen";
import { PaymentEncaissementScreen } from "./PaymentEncaissementScreen";
import { PaymentHistoryScreen } from "./PaymentHistoryScreen";

/** Coquille du module Paiements et caisse (MODULE-04.3). */
export function PaymentsScreen() {
  const [tab, setTab] = useState("encaissement");

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Paiements &amp; Caisse</h2>

      <Tabs
        items={[
          { key: "encaissement", label: "Encaissement" },
          { key: "caisse", label: "Caisse" },
          { key: "historique", label: "Historique" },
        ]}
        activeKey={tab}
        onChange={setTab}
      />

      <div className="pt-2">
        {tab === "encaissement" && <PaymentEncaissementScreen />}
        {tab === "caisse" && <CashRegisterScreen />}
        {tab === "historique" && <PaymentHistoryScreen />}
      </div>
    </div>
  );
}
