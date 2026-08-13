import { Tabs } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { EmployeesScreen } from "./EmployeesScreen";
import { PayPeriodsScreen } from "./PayPeriodsScreen";
import { PayrollDashboardScreen } from "./PayrollDashboardScreen";
import { SalaryAdvancesScreen } from "./SalaryAdvancesScreen";
import { TeachersPayrollStatusScreen } from "./TeachersPayrollStatusScreen";

/**
 * Coquille du module Paie (MODULE-08, étendu par MODULE-05.1). `openEmployeeCreationForTeacherId`
 * (extension du 2026-07-30, pont Enseignant → Paie) permet d'arriver directement sur l'onglet
 * Employés en mode création, enseignant présélectionné — depuis la fiche enseignant ou depuis
 * l'onglet "Enseignants sans profil de paie" ci-dessous.
 */
export function PayrollModuleScreen({
  openEmployeeCreationForTeacherId,
  onOpenEmployeeCreationForTeacherIdConsumed,
}: {
  openEmployeeCreationForTeacherId?: string | null;
  onOpenEmployeeCreationForTeacherIdConsumed?: () => void;
} = {}) {
  const [tab, setTab] = useState("tableau-de-bord");
  const [prefillTeacherId, setPrefillTeacherId] = useState<string | null>(null);

  useEffect(() => {
    if (openEmployeeCreationForTeacherId) {
      setPrefillTeacherId(openEmployeeCreationForTeacherId);
      setTab("employes");
      onOpenEmployeeCreationForTeacherIdConsumed?.();
    }
  }, [openEmployeeCreationForTeacherId, onOpenEmployeeCreationForTeacherIdConsumed]);

  function goToEmployeeCreation(teacherId: string) {
    setPrefillTeacherId(teacherId);
    setTab("employes");
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Paie</h2>

      <Tabs
        items={[
          { key: "tableau-de-bord", label: "Tableau de bord" },
          { key: "employes", label: "Employés" },
          { key: "sans-profil-paie", label: "Enseignants sans profil de paie" },
          { key: "periodes", label: "Périodes de paie" },
          { key: "avances", label: "Avances" },
        ]}
        activeKey={tab}
        onChange={setTab}
      />

      <div className="pt-2">
        {tab === "tableau-de-bord" && <PayrollDashboardScreen />}
        {tab === "employes" && (
          <EmployeesScreen key={prefillTeacherId ?? "default"} prefillTeacherId={prefillTeacherId ?? undefined} />
        )}
        {tab === "sans-profil-paie" && <TeachersPayrollStatusScreen onCreatePayrollProfile={goToEmployeeCreation} />}
        {tab === "periodes" && <PayPeriodsScreen />}
        {tab === "avances" && <SalaryAdvancesScreen />}
      </div>
    </div>
  );
}
