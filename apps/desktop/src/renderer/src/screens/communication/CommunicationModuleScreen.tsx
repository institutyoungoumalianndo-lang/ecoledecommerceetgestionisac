import { Tabs } from "@isac-erp/ui";
import { useState } from "react";
import { CampaignsScreen } from "./CampaignsScreen";
import { CommunicationDashboardScreen } from "./CommunicationDashboardScreen";
import { CommunicationHistoryScreen } from "./CommunicationHistoryScreen";
import { ContactsScreen } from "./ContactsScreen";
import { MessageTemplatesScreen } from "./MessageTemplatesScreen";
import { QuickSendScreen } from "./QuickSendScreen";

/** Coquille du module Communication (MODULE-12). */
export function CommunicationModuleScreen() {
  const [tab, setTab] = useState("tableau-de-bord");

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Communication</h2>

      <Tabs
        items={[
          { key: "tableau-de-bord", label: "Tableau de bord" },
          { key: "envoi-rapide", label: "Envoi rapide" },
          { key: "campagnes", label: "Campagnes" },
          { key: "carnet-adresses", label: "Carnet d'adresses" },
          { key: "modeles", label: "Modèles" },
          { key: "historique", label: "Historique" },
        ]}
        activeKey={tab}
        onChange={setTab}
      />

      <div className="pt-2">
        {tab === "tableau-de-bord" && <CommunicationDashboardScreen />}
        {tab === "envoi-rapide" && <QuickSendScreen />}
        {tab === "campagnes" && <CampaignsScreen />}
        {tab === "carnet-adresses" && <ContactsScreen />}
        {tab === "modeles" && <MessageTemplatesScreen />}
        {tab === "historique" && <CommunicationHistoryScreen />}
      </div>
    </div>
  );
}
