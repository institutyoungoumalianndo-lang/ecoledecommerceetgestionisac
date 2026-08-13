import { Tabs } from "@isac-erp/ui";
import { useState } from "react";
import { BulletinsScreen } from "./BulletinsScreen";
import { ClassementScreen } from "./ClassementScreen";
import { FeuilleSaisieScreen } from "./FeuilleSaisieScreen";
import { NoteSaisieScreen } from "./NoteSaisieScreen";
import { SessionnairesScreen } from "./SessionnairesScreen";

/** Coquille du module Évaluation (MODULE-06). */
export function EvaluationModuleScreen() {
  const [tab, setTab] = useState("notes");

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Évaluation</h2>

      <Tabs
        items={[
          { key: "notes", label: "Saisie des notes" },
          { key: "bulletins", label: "Bulletins" },
          { key: "classement", label: "Classement" },
          { key: "sessionnaires", label: "Sessionnaires" },
          { key: "feuille-saisie", label: "Feuille de saisie" },
        ]}
        activeKey={tab}
        onChange={setTab}
      />

      <div className="pt-2">
        {tab === "notes" && <NoteSaisieScreen />}
        {tab === "bulletins" && <BulletinsScreen />}
        {tab === "classement" && <ClassementScreen />}
        {tab === "sessionnaires" && <SessionnairesScreen />}
        {tab === "feuille-saisie" && <FeuilleSaisieScreen />}
      </div>
    </div>
  );
}
