import { useState } from "react";
import { EmployeeDetailScreen } from "./EmployeeDetailScreen";
import { EmployeeFormScreen } from "./EmployeeFormScreen";
import { EmployeesListScreen } from "./EmployeesListScreen";

type View = { mode: "list" } | { mode: "create" } | { mode: "detail"; employeeId: string };

/**
 * Coquille des employés (MODULE-08) : liste, création, fiche complète. `prefillTeacherId`
 * (extension du 2026-07-30, pont Enseignant → Paie) ouvre directement en mode création, enseignant
 * présélectionné.
 */
export function EmployeesScreen({ prefillTeacherId }: { prefillTeacherId?: string } = {}) {
  const [view, setView] = useState<View>(prefillTeacherId ? { mode: "create" } : { mode: "list" });

  if (view.mode === "create") {
    return (
      <EmployeeFormScreen
        prefillTeacherId={prefillTeacherId}
        onCancel={() => setView({ mode: "list" })}
        onCreated={(employeeId) => setView({ mode: "detail", employeeId })}
      />
    );
  }

  if (view.mode === "detail") {
    return <EmployeeDetailScreen employeeId={view.employeeId} onBack={() => setView({ mode: "list" })} />;
  }

  return (
    <EmployeesListScreen
      onCreate={() => setView({ mode: "create" })}
      onOpenEmployee={(employeeId) => setView({ mode: "detail", employeeId })}
    />
  );
}
