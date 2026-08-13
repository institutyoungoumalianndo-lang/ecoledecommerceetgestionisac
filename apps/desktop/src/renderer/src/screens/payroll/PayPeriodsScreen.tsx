import type { PayPeriodDto } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, Input, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { PayPeriodDetailScreen } from "./PayPeriodDetailScreen";

const STATUS_VARIANT: Record<string, "muted" | "default" | "success"> = {
  OUVERT: "muted",
  EN_COURS: "default",
  CLOTURE: "success",
};
const STATUS_LABEL: Record<string, string> = { OUVERT: "Ouvert", EN_COURS: "En cours", CLOTURE: "Clôturé" };

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

/** Périodes de paie mensuelles (MODULE-08 §1.6/§11.3). */
export function PayPeriodsScreen() {
  const [createOpen, setCreateOpen] = useState(false);
  const [openPeriodId, setOpenPeriodId] = useState<string | null>(null);
  const canCreate = useHasPermission("PAIE_BULLETINS:CREATION");
  const utils = trpc.useUtils();

  const query = trpc.payPeriods.list.useQuery({});

  const create = trpc.payPeriods.create.useMutation({
    onSuccess: () => {
      void utils.payPeriods.list.invalidate();
      setCreateOpen(false);
    },
  });

  if (openPeriodId) {
    return <PayPeriodDetailScreen payPeriodId={openPeriodId} onBack={() => setOpenPeriodId(null)} />;
  }

  const columns: DataTableColumn<PayPeriodDto>[] = [
    { key: "periode", header: "Période", value: (p) => p.label },
    {
      key: "statut",
      header: "Statut",
      value: (p) => STATUS_LABEL[p.status] ?? p.status,
      render: (p) => <Badge variant={STATUS_VARIANT[p.status] ?? "muted"}>{STATUS_LABEL[p.status] ?? p.status}</Badge>,
    },
    { key: "paiement", header: "Date de paiement", value: (p) => (p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("fr-FR") : "—") },
    { key: "validePar", header: "Validé par", value: (p) => p.validatedByName ?? "—" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Périodes de paie</h2>
        {canCreate && <Button onClick={() => setCreateOpen(true)}>Ouvrir un mois de paie</Button>}
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(p) => p.id}
        exportFilename="periodes-paie"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucune période de paie."}
        rowActions={(p) => (
          <Button variant="outline" onClick={() => setOpenPeriodId(p.id)}>
            Ouvrir
          </Button>
        )}
      />

      {createOpen && (
        <CreatePayPeriodDialog
          onClose={() => setCreateOpen(false)}
          onSubmit={(year, month) => create.mutate({ year, month })}
          isPending={create.isPending}
          error={create.error?.message}
        />
      )}
    </div>
  );
}

function CreatePayPeriodDialog({
  onClose,
  onSubmit,
  isPending,
  error,
}: {
  onClose: () => void;
  onSubmit: (year: number, month: number) => void;
  isPending: boolean;
  error?: string;
}) {
  const today = new Date();
  const [year, setYear] = useState(String(today.getFullYear()));
  const [month, setMonth] = useState(String(today.getMonth() + 1));

  return (
    <Dialog open onClose={onClose} title="Ouvrir un mois de paie">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Mois</Label>
            <Select value={month} onChange={(e) => setMonth(e.target.value)}>
              {MONTHS.map((label, i) => (
                <option key={label} value={i + 1}>{label}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Année</Label>
            <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={isPending} onClick={() => onSubmit(Number(year), Number(month))}>
            {isPending ? "Ouverture…" : "Ouvrir"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
