import type { SalaryAdvanceDto } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const STATUS_LABELS: Record<string, string> = { EN_ATTENTE: "En attente", DEDUITE: "Déduite", ANNULEE: "Annulée" };

/** Vue globale des avances sur salaire (MODULE-08 §1.8/§11.18) — pour accorder une avance, ouvrir la fiche employé. */
export function SalaryAdvancesScreen() {
  const [status, setStatus] = useState<"EN_ATTENTE" | "DEDUITE" | "ANNULEE" | "">("");
  const canCancel = useHasPermission("PAIE_AVANCES:SUPPRESSION");
  const utils = trpc.useUtils();

  const query = trpc.salaryAdvances.list.useQuery({ status: status || undefined });
  const cancel = trpc.salaryAdvances.cancel.useMutation({
    onSuccess: () => void utils.salaryAdvances.list.invalidate(),
  });

  const columns: DataTableColumn<SalaryAdvanceDto>[] = [
    { key: "matricule", header: "Matricule", value: (a) => a.employeeMatricule },
    { key: "nom", header: "Employé", value: (a) => a.employeeName },
    { key: "montant", header: "Montant", value: (a) => a.amount.toLocaleString("fr-FR") },
    { key: "octroi", header: "Période d'octroi", value: (a) => a.grantedPayPeriodLabel },
    { key: "deduction", header: "Période de déduction", value: (a) => a.deductionPayPeriodLabel ?? "Dès que possible" },
    {
      key: "statut",
      header: "Statut",
      value: (a) => STATUS_LABELS[a.status] ?? a.status,
      render: (a) => (
        <Badge variant={a.status === "EN_ATTENTE" ? "muted" : a.status === "DEDUITE" ? "success" : "destructive"}>
          {STATUS_LABELS[a.status] ?? a.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Avances sur salaire</h2>
      </div>

      <div className="flex items-end gap-3">
        <div className="flex w-56 flex-col gap-1.5">
          <Label>Statut</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="">Tous</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="DEDUITE">Déduite</option>
            <option value="ANNULEE">Annulée</option>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(a) => a.id}
        exportFilename="avances-salaire"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucune avance."}
        rowActions={
          canCancel
            ? (a) =>
                a.status === "EN_ATTENTE" ? (
                  <Button variant="destructive" onClick={() => cancel.mutate({ id: a.id })}>
                    Annuler
                  </Button>
                ) : undefined
            : undefined
        }
      />
    </div>
  );
}
