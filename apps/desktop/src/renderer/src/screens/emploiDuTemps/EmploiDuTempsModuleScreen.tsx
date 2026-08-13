import { Tabs } from "@isac-erp/ui";
import { useState } from "react";
import { ScheduleBuilderScreen } from "./ScheduleBuilderScreen";
import { SeanceRecurrenceTemplatesScreen } from "./SeanceRecurrenceTemplatesScreen";
import { SeancesScreen } from "./SeancesScreen";

/** Coquille du module Emploi du temps (MODULE-05.2). */
export function EmploiDuTempsModuleScreen() {
  const [tab, setTab] = useState("constructeur");

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Emploi du temps</h2>

      <Tabs
        items={[
          { key: "constructeur", label: "Constructeur" },
          { key: "emploi-du-temps", label: "Séances" },
          { key: "modeles-recurrence", label: "Modèles de récurrence" },
        ]}
        activeKey={tab}
        onChange={setTab}
      />

      <div className="pt-2">
        {tab === "constructeur" && <ScheduleBuilderScreen />}
        {tab === "emploi-du-temps" && <SeancesScreen />}
        {tab === "modeles-recurrence" && <SeanceRecurrenceTemplatesScreen />}
      </div>
    </div>
  );
}
