import { Tabs } from "@isac-erp/ui";
import { useState } from "react";
import { DocumentsHistoryScreen } from "./DocumentsHistoryScreen";
import { GenerateDocumentScreen } from "./GenerateDocumentScreen";
import { PaymentCardIndividualScreen } from "./PaymentCardIndividualScreen";
import { StudentCardIndividualScreen } from "./StudentCardIndividualScreen";
import { StudentCardsBatchScreen } from "./StudentCardsBatchScreen";

/** Coquille du module Documents officiels (MODULE-09) — moteur PDF centralisé. */
export function DocumentsModuleScreen() {
  const [tab, setTab] = useState("generer");

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Documents officiels</h2>

      <Tabs
        items={[
          { key: "generer", label: "Générer" },
          { key: "carte-individuelle", label: "Carte d'étudiant" },
          { key: "carte-paiement", label: "Carte de paiement" },
          { key: "cartes-lot", label: "Cartes d'étudiant par lot" },
          { key: "historique", label: "Historique" },
        ]}
        activeKey={tab}
        onChange={setTab}
      />

      <div className="pt-2">
        {tab === "generer" && <GenerateDocumentScreen />}
        {tab === "carte-individuelle" && <StudentCardIndividualScreen />}
        {tab === "carte-paiement" && <PaymentCardIndividualScreen />}
        {tab === "cartes-lot" && <StudentCardsBatchScreen />}
        {tab === "historique" && <DocumentsHistoryScreen />}
      </div>
    </div>
  );
}
