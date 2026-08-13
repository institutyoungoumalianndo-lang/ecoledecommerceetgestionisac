import { Tabs } from "@isac-erp/ui";
import { useState } from "react";
import { useHasPermission } from "../../store/authStore";
import { AlertRulesScreen } from "./AlertRulesScreen";
import { DecisionalReportsScreen } from "./DecisionalReportsScreen";

/** Coquille du module Pilotage (MODULE-10 — Tableau de bord & Rapports décisionnels). */
export function DecisionalReportsModuleScreen() {
  const canSeeReports = useHasPermission("RAPPORTS_DECISIONNELS:LECTURE");
  const canSeeAlerts = useHasPermission("ALERTES:LECTURE");
  const [tab, setTab] = useState(canSeeReports ? "rapports" : "alertes");

  const items = [
    ...(canSeeReports ? [{ key: "rapports", label: "Rapports décisionnels" }] : []),
    ...(canSeeAlerts ? [{ key: "alertes", label: "Alertes" }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      {items.length > 1 && <Tabs items={items} activeKey={tab} onChange={setTab} />}
      {tab === "rapports" && canSeeReports && <DecisionalReportsScreen />}
      {tab === "alertes" && canSeeAlerts && <AlertRulesScreen />}
    </div>
  );
}
