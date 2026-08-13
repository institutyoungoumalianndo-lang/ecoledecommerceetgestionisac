import { zodResolver } from "@hookform/resolvers/zod";
import {
  type CreatePayrollComponentTypeInput,
  type PayrollComponentTypeDto,
  createPayrollComponentTypeInputSchema,
} from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, FormField, Input, Select } from "@isac-erp/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";

const KIND_LABELS: Record<string, string> = {
  PRIME: "Prime",
  INDEMNITE: "Indemnité",
  RETENUE: "Retenue",
  COTISATION: "Cotisation",
};

/** Composants de paie (MODULE-08 §1.7) — référentiel configurable, saisie manuelle par bulletin, aucun barème automatique. */
export function PayrollComponentTypesScreen() {
  const utils = trpc.useUtils();
  const query = trpc.payrollComponentTypes.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);

  function invalidate() {
    void utils.payrollComponentTypes.list.invalidate();
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePayrollComponentTypeInput>({ resolver: zodResolver(createPayrollComponentTypeInputSchema) });

  const create = trpc.payrollComponentTypes.create.useMutation({
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      reset();
    },
  });
  const deactivate = trpc.payrollComponentTypes.deactivate.useMutation({ onSuccess: invalidate });
  const reactivate = trpc.payrollComponentTypes.reactivate.useMutation({ onSuccess: invalidate });

  const columns: DataTableColumn<PayrollComponentTypeDto>[] = [
    { key: "code", header: "Code", value: (r) => r.code },
    { key: "label", header: "Libellé", value: (r) => r.label },
    { key: "kind", header: "Type", value: (r) => KIND_LABELS[r.kind] ?? r.kind },
    {
      key: "status",
      header: "Statut",
      value: (r) => (r.isActive ? "Actif" : "Inactif"),
      render: (r) => <Badge variant={r.isActive ? "success" : "muted"}>{r.isActive ? "Actif" : "Inactif"}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Composants de paie</h2>
        <Button onClick={() => setCreateOpen(true)}>Nouveau composant</Button>
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(r) => r.id}
        exportFilename="composants-paie"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun composant."}
        rowActions={(r) =>
          r.isActive ? (
            <Button variant="destructive" onClick={() => deactivate.mutate({ id: r.id })}>
              Désactiver
            </Button>
          ) : (
            <Button variant="success" onClick={() => reactivate.mutate({ id: r.id })}>
              Réactiver
            </Button>
          )
        }
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Créer un composant de paie">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => create.mutate(values))}>
          <FormField label="Code" required error={errors.code?.message} hint="Ex. PRIME_ASSIDUITE">
            <Input placeholder="PRIME_ASSIDUITE" {...register("code")} />
          </FormField>
          <FormField label="Libellé" required error={errors.label?.message}>
            <Input {...register("label")} />
          </FormField>
          <FormField label="Type" required>
            <Select {...register("kind")}>
              {Object.entries(KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </FormField>
          {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Création…" : "Créer"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
