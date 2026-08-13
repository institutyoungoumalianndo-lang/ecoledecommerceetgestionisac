import { Badge, Button, DataTable, type DataTableColumn, Input, Label } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { PayrollLineDetailDialog } from "./PayrollLineDetailDialog";

const STATUS_LABEL: Record<string, string> = { OUVERT: "Ouvert", EN_COURS: "En cours", CLOTURE: "Clôturé" };

interface EmployeePayrollRow {
  employeeId: string;
  matricule: string;
  name: string;
  categoryLabel: string;
  lineId: string | null;
  status: string | null;
  netSalary: number | null;
}

/** Détail d'une période de paie (MODULE-08 §1.6/§11.3) — calcul, contrôle, validation, clôture. */
export function PayPeriodDetailScreen({ payPeriodId, onBack }: { payPeriodId: string; onBack: () => void }) {
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState("");
  const canCalculate = useHasPermission("PAIE_BULLETINS:CREATION");
  const canClose = useHasPermission("PAIE_BULLETINS:VALIDATION");
  const utils = trpc.useUtils();

  const periodQuery = trpc.payPeriods.getById.useQuery({ id: payPeriodId });
  const employeesQuery = trpc.employees.list.useQuery({ includeArchived: false, page: 1, pageSize: 200, sortBy: "lastName", sortDirection: "asc" });
  const linesQuery = trpc.payrollLines.list.useQuery({ payPeriodId });

  function invalidate() {
    void utils.payPeriods.getById.invalidate({ id: payPeriodId });
    void utils.payrollLines.list.invalidate({ payPeriodId });
  }

  const calculateOne = trpc.payrollLines.calculate.useMutation({ onSuccess: invalidate });
  const calculateAll = trpc.payrollLines.calculatePeriod.useMutation({ onSuccess: invalidate });
  const close = trpc.payPeriods.close.useMutation({ onSuccess: invalidate });

  const period = periodQuery.data;
  const linesByEmployee = new Map((linesQuery.data ?? []).map((l) => [l.employeeId, l]));

  const rows: EmployeePayrollRow[] = (employeesQuery.data?.rows ?? []).map((e) => {
    const line = linesByEmployee.get(e.id);
    return {
      employeeId: e.id,
      matricule: e.matricule,
      name: `${e.lastName ?? ""} ${e.firstName ?? ""}`.trim(),
      categoryLabel: e.categoryLabel,
      lineId: line?.id ?? null,
      status: line?.status ?? null,
      netSalary: line?.netSalary ?? null,
    };
  });

  const allValidated = rows.length > 0 && rows.every((r) => r.status === "VALIDEE");
  const isLocked = period?.status === "CLOTURE";

  const columns: DataTableColumn<EmployeePayrollRow>[] = [
    { key: "matricule", header: "Matricule", value: (r) => r.matricule },
    { key: "nom", header: "Nom", value: (r) => r.name },
    { key: "categorie", header: "Catégorie", value: (r) => r.categoryLabel },
    { key: "net", header: "Net à payer", value: (r) => (r.netSalary !== null ? r.netSalary.toLocaleString("fr-FR") : "—") },
    {
      key: "statut",
      header: "Statut",
      value: (r) => (r.status ? statusLabelForLine(r.status) : "Non calculé"),
      render: (r) => (
        <Badge variant={r.status === "VALIDEE" ? "success" : r.status ? "muted" : "destructive"}>
          {r.status ? statusLabelForLine(r.status) : "Non calculé"}
        </Badge>
      ),
    },
  ];

  if (!period) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-1 px-0">
            ← Retour aux périodes
          </Button>
          <h2 className="text-lg font-semibold text-foreground">
            {period.label} <Badge variant={period.status === "CLOTURE" ? "success" : "muted"} className="ml-2">{STATUS_LABEL[period.status]}</Badge>
          </h2>
        </div>
        <div className="flex items-end gap-2">
          {!isLocked && canCalculate && (
            <Button
              variant="outline"
              disabled={calculateAll.isPending}
              onClick={() => calculateAll.mutate({ payPeriodId })}
            >
              {calculateAll.isPending ? "Calcul en cours…" : "Calculer tous les bulletins"}
            </Button>
          )}
          {!isLocked && canClose && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Date de paiement</Label>
                <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              </div>
              <Button
                disabled={!allValidated || close.isPending}
                onClick={() => close.mutate({ id: payPeriodId, paymentDate: paymentDate ? new Date(paymentDate) : undefined })}
              >
                {close.isPending ? "Clôture…" : "Clôturer la période"}
              </Button>
            </>
          )}
        </div>
      </div>

      {close.error && <p className="text-sm text-destructive">{close.error.message}</p>}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.employeeId}
        exportFilename={`paie-${period.label}`}
        emptyMessage={employeesQuery.isLoading ? "Chargement…" : "Aucun employé actif."}
        rowActions={(r) =>
          r.lineId ? (
            <Button variant="outline" onClick={() => setSelectedLineId(r.lineId)}>
              Voir
            </Button>
          ) : !isLocked && canCalculate ? (
            <Button
              variant="outline"
              disabled={calculateOne.isPending}
              onClick={() => calculateOne.mutate({ payPeriodId, employeeId: r.employeeId })}
            >
              Calculer
            </Button>
          ) : undefined
        }
      />

      {selectedLineId && (
        <PayrollLineDetailDialog lineId={selectedLineId} onClose={() => setSelectedLineId(null)} />
      )}
    </div>
  );
}

function statusLabelForLine(status: string): string {
  return status === "BROUILLON" ? "Brouillon" : status === "CALCULEE" ? "Calculée" : status === "VALIDEE" ? "Validée" : status;
}
