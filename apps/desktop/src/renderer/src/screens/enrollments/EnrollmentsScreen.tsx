import { Button, Tabs } from "@isac-erp/ui";
import { useState } from "react";
import { useHasPermission } from "../../store/authStore";
import { EnrollmentDashboardScreen } from "./EnrollmentDashboardScreen";
import { EnrollmentFormDialog } from "./EnrollmentFormDialog";
import { EnrollmentImportWizard } from "./EnrollmentImportWizard";
import { EnrollmentsListScreen } from "./EnrollmentsListScreen";

/** Coquille du module Inscriptions et réinscriptions (MODULE-04.1). */
export function EnrollmentsScreen({ onOpenStudent }: { onOpenStudent: (studentId: string) => void }) {
  const [tab, setTab] = useState("tableau-de-bord");
  const [newEnrollmentOpen, setNewEnrollmentOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const canCreate = useHasPermission("INSCRIPTIONS:CREATION");
  const canImport = useHasPermission("INSCRIPTIONS_IMPORT:CREATION");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Inscriptions</h2>
        <div className="flex gap-2">
          {canImport && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              Importer
            </Button>
          )}
          {canCreate && <Button onClick={() => setNewEnrollmentOpen(true)}>Nouvelle inscription</Button>}
        </div>
      </div>

      <Tabs
        items={[
          { key: "tableau-de-bord", label: "Tableau de bord" },
          { key: "liste", label: "Liste des inscriptions" },
        ]}
        activeKey={tab}
        onChange={setTab}
      />

      <div className="pt-2">
        {tab === "tableau-de-bord" && <EnrollmentDashboardScreen />}
        {tab === "liste" && <EnrollmentsListScreen onOpenStudent={onOpenStudent} />}
      </div>

      {newEnrollmentOpen && <EnrollmentFormDialog onClose={() => setNewEnrollmentOpen(false)} />}
      {importOpen && <EnrollmentImportWizard onClose={() => setImportOpen(false)} />}
    </div>
  );
}
