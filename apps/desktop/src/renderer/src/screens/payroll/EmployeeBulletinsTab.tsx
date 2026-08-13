import type { PayrollLineDto } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { PayslipView } from "./PayslipView";

const STATUS_VARIANT: Record<string, "muted" | "success"> = { BROUILLON: "muted", CALCULEE: "muted", VALIDEE: "success" };
const STATUS_LABEL: Record<string, string> = { BROUILLON: "Brouillon", CALCULEE: "Calculée", VALIDEE: "Validée" };

/** Historique des bulletins de l'employé (MODULE-08 §1.10) — chaque ligne validée est son propre archive réimprimable. */
export function EmployeeBulletinsTab({ employeeId }: { employeeId: string }) {
  const [selectedLine, setSelectedLine] = useState<PayrollLineDto | null>(null);
  const query = trpc.payrollLines.list.useQuery({ employeeId });

  const columns: DataTableColumn<PayrollLineDto>[] = [
    { key: "periode", header: "Période", value: (l) => l.payPeriodLabel },
    { key: "net", header: "Net à payer", value: (l) => l.netSalary.toLocaleString("fr-FR") },
    {
      key: "statut",
      header: "Statut",
      value: (l) => STATUS_LABEL[l.status] ?? l.status,
      render: (l) => <Badge variant={STATUS_VARIANT[l.status] ?? "muted"}>{STATUS_LABEL[l.status] ?? l.status}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(l) => l.id}
        exportFilename="bulletins-employe"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun bulletin."}
        rowActions={(l) => (
          <Button variant="outline" onClick={() => setSelectedLine(l)}>
            Voir
          </Button>
        )}
      />

      {selectedLine && <PayslipView line={selectedLine} onClose={() => setSelectedLine(null)} />}
    </div>
  );
}
