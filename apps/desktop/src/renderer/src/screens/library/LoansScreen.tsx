import type { LoanDto } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const STATUS_LABELS = { EN_COURS: "En cours", RENDU: "Rendu", PERDU: "Perdu" } as const;

function isOverdue(loan: LoanDto): boolean {
  return loan.status === "EN_COURS" && loan.dueDate.getTime() < Date.now();
}

/** Emprunts (MODULE-13 §1.2) — le retard est toujours recalculé à l'affichage, jamais stocké. */
export function LoansScreen() {
  const utils = trpc.useUtils();
  const canReturn = useHasPermission("BIBLIOTHEQUE:CREATION");
  const [status, setStatus] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const query = trpc.loans.list.useQuery({
    status: (status || undefined) as LoanDto["status"] | undefined,
    overdueOnly: overdueOnly || undefined,
  });

  const returnLoan = trpc.loans.return.useMutation({
    onSuccess: () => {
      void utils.loans.list.invalidate();
      void utils.books.list.invalidate();
    },
  });

  const columns: DataTableColumn<LoanDto>[] = [
    { key: "bookTitle", header: "Ouvrage", value: (l) => l.bookTitle },
    { key: "bookCopyInventoryNumber", header: "Exemplaire", value: (l) => l.bookCopyInventoryNumber },
    { key: "borrowerName", header: "Emprunteur", value: (l) => l.borrowerName ?? "—" },
    { key: "loanDate", header: "Date d'emprunt", value: (l) => l.loanDate.getTime(), render: (l) => l.loanDate.toLocaleDateString("fr-FR") },
    { key: "dueDate", header: "Échéance", value: (l) => l.dueDate.getTime(), render: (l) => l.dueDate.toLocaleDateString("fr-FR") },
    {
      key: "status",
      header: "Statut",
      value: (l) => STATUS_LABELS[l.status],
      render: (l) =>
        isOverdue(l) ? (
          <Badge variant="destructive">En retard</Badge>
        ) : (
          <Badge variant={l.status === "RENDU" ? "success" : l.status === "PERDU" ? "muted" : "default"}>
            {STATUS_LABELS[l.status]}
          </Badge>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Emprunts</h2>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
          En retard uniquement
        </label>
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(l) => l.id}
        exportFilename="emprunts"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun emprunt."}
        rowActions={
          canReturn
            ? (l) =>
                l.status === "EN_COURS" ? (
                  <Button variant="outline" disabled={returnLoan.isPending} onClick={() => returnLoan.mutate({ id: l.id })}>
                    Marquer comme rendu
                  </Button>
                ) : undefined
            : undefined
        }
      />
    </div>
  );
}
