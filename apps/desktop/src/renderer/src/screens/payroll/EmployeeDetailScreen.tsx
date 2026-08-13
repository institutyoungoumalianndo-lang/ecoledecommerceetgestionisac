import { Badge, Button, Tabs, type TabItem } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { ArchiveEmployeeDialog } from "./ArchiveEmployeeDialog";
import { EmployeeAdvancesTab } from "./EmployeeAdvancesTab";
import { EmployeeBulletinsTab } from "./EmployeeBulletinsTab";
import { EmployeeContractTab } from "./EmployeeContractTab";
import { EmployeePayrollTab } from "./EmployeePayrollTab";

/** Fiche employé (MODULE-08) — point central des opérations de paie pour un employé donné. */
export function EmployeeDetailScreen({ employeeId, onBack }: { employeeId: string; onBack: () => void }) {
  const [tab, setTab] = useState("remuneration");
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const query = trpc.employees.getById.useQuery({ id: employeeId });
  const utils = trpc.useUtils();
  const canModify = useHasPermission("PAIE_EMPLOYES:SUPPRESSION");

  const restore = trpc.employees.restore.useMutation({
    onSuccess: () => void utils.employees.getById.invalidate({ id: employeeId }),
  });

  if (!query.data) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  const employee = query.data;

  const tabs: TabItem[] = [
    { key: "remuneration", label: "Identité & rémunération" },
    { key: "avances", label: "Avances" },
    { key: "bulletins", label: "Bulletins" },
    { key: "contrat", label: "Contrat" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-1 px-0">
            ← Retour à la liste
          </Button>
          <h2 className="text-lg font-semibold text-foreground">
            {employee.lastName} {employee.firstName}{" "}
            <span className="font-normal text-muted-foreground">— {employee.matricule}</span>
            {employee.isLinkedToTeacher && (
              <Badge variant="success" className="ml-2">
                Enseignant
              </Badge>
            )}
            {employee.archivedAt && (
              <Badge variant="muted" className="ml-2">
                Archivé
              </Badge>
            )}
          </h2>
        </div>
        <div className="flex gap-2">
          {canModify && (
            <>
              {employee.archivedAt ? (
                <Button variant="success" onClick={() => restore.mutate({ id: employeeId })} disabled={restore.isPending}>
                  Restaurer
                </Button>
              ) : (
                <Button variant="destructive" onClick={() => setArchiveDialogOpen(true)}>
                  Archiver
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <Tabs items={tabs} activeKey={tab} onChange={setTab} />

      <div className="pt-2">
        {tab === "remuneration" && <EmployeePayrollTab employee={employee} />}
        {tab === "avances" && <EmployeeAdvancesTab employeeId={employeeId} />}
        {tab === "bulletins" && <EmployeeBulletinsTab employeeId={employeeId} />}
        {tab === "contrat" && <EmployeeContractTab employeeId={employeeId} />}
      </div>

      {archiveDialogOpen && (
        <ArchiveEmployeeDialog employeeId={employeeId} onClose={() => setArchiveDialogOpen(false)} />
      )}
    </div>
  );
}
