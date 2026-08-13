import { Tabs } from "@isac-erp/ui";
import { useState } from "react";
import { FeeDashboardScreen } from "./FeeDashboardScreen";
import { FeeReductionsScreen } from "./FeeReductionsScreen";
import { FeeTariffHistoryScreen } from "./FeeTariffHistoryScreen";
import { FeeTariffsScreen } from "./FeeTariffsScreen";
import { FeeTypesScreen } from "./FeeTypesScreen";

/** Coquille du module Frais de scolarité (MODULE-04.2). */
export function FeesScreen() {
  const [tab, setTab] = useState("tableau-de-bord");

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Frais de scolarité</h2>

      <Tabs
        items={[
          { key: "tableau-de-bord", label: "Tableau de bord" },
          { key: "tarifs", label: "Tarifs" },
          { key: "types", label: "Types de frais" },
          { key: "reductions", label: "Réductions" },
          { key: "historique", label: "Historique des tarifs" },
        ]}
        activeKey={tab}
        onChange={setTab}
      />

      <div className="pt-2">
        {tab === "tableau-de-bord" && <FeeDashboardScreen />}
        {tab === "tarifs" && <FeeTariffsScreen />}
        {tab === "types" && <FeeTypesScreen />}
        {tab === "reductions" && <FeeReductionsScreen />}
        {tab === "historique" && <FeeTariffHistoryScreen />}
      </div>
    </div>
  );
}
