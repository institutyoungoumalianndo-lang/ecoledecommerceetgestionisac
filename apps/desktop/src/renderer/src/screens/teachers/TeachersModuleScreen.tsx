import { Tabs } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { BulkEmargementScreen } from "./BulkEmargementScreen";
import { TeacherDashboardScreen } from "./TeacherDashboardScreen";
import { TeachersScreen } from "./TeachersScreen";

/**
 * Coquille du module Enseignants (MODULE-05). `openTeacherId` permet une navigation depuis un
 * autre écran (recherche globale) directement vers la fiche, en basculant sur l'onglet Enseignants.
 */
export function TeachersModuleScreen({
  openTeacherId,
  onOpenTeacherIdConsumed,
  onCreatePayrollProfile,
}: {
  openTeacherId?: string | null;
  onOpenTeacherIdConsumed?: () => void;
  onCreatePayrollProfile?: (teacherId: string) => void;
} = {}) {
  const [tab, setTab] = useState("tableau-de-bord");

  useEffect(() => {
    if (openTeacherId) setTab("enseignants");
  }, [openTeacherId]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Enseignants</h2>

      <Tabs
        items={[
          { key: "tableau-de-bord", label: "Tableau de bord" },
          { key: "enseignants", label: "Enseignants" },
          { key: "emargement", label: "Émargement (mensuel)" },
        ]}
        activeKey={tab}
        onChange={setTab}
      />

      <div className="pt-2">
        {tab === "tableau-de-bord" && <TeacherDashboardScreen />}
        {tab === "enseignants" && (
          <TeachersScreen
            openTeacherId={openTeacherId}
            onOpenTeacherIdConsumed={onOpenTeacherIdConsumed}
            onCreatePayrollProfile={onCreatePayrollProfile}
          />
        )}
        {tab === "emargement" && <BulkEmargementScreen />}
      </div>
    </div>
  );
}
