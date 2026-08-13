import { zodResolver } from "@hookform/resolvers/zod";
import { type CreateFeeTypeInput, type FeeTypeDto, createFeeTypeInputSchema } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, FormField, Input } from "@isac-erp/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

/** Types de frais (MODULE-04.2 §6.2) — référentiel configurable, extensible par l'administrateur. */
export function FeeTypesScreen() {
  const utils = trpc.useUtils();
  const query = trpc.feeTypes.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const canAdminister = useHasPermission("FRAIS:ADMINISTRATION");

  function invalidate() {
    void utils.feeTypes.list.invalidate();
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFeeTypeInput>({ resolver: zodResolver(createFeeTypeInputSchema) });

  const create = trpc.feeTypes.create.useMutation({
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      reset();
    },
  });
  const deactivate = trpc.feeTypes.deactivate.useMutation({ onSuccess: invalidate });
  const reactivate = trpc.feeTypes.reactivate.useMutation({ onSuccess: invalidate });

  const columns: DataTableColumn<FeeTypeDto>[] = [
    { key: "code", header: "Code", value: (f) => f.code },
    { key: "name", header: "Nom", value: (f) => f.name },
    { key: "description", header: "Description", value: (f) => f.description ?? "—" },
    {
      key: "status",
      header: "Statut",
      value: (f) => (f.isActive ? "Actif" : "Inactif"),
      render: (f) => <Badge variant={f.isActive ? "success" : "muted"}>{f.isActive ? "Actif" : "Inactif"}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Types de frais</h2>
        {canAdminister && <Button onClick={() => setCreateOpen(true)}>Nouveau type de frais</Button>}
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(f) => f.id}
        exportFilename="types-de-frais"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun type de frais."}
        rowActions={
          canAdminister
            ? (f) =>
                f.isActive ? (
                  <Button variant="destructive" onClick={() => deactivate.mutate({ id: f.id })}>
                    Désactiver
                  </Button>
                ) : (
                  <Button variant="success" onClick={() => reactivate.mutate({ id: f.id })}>
                    Réactiver
                  </Button>
                )
            : undefined
        }
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Créer un type de frais">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => create.mutate(values))}>
          <FormField label="Code" required error={errors.code?.message}>
            <Input {...register("code")} />
          </FormField>
          <FormField label="Nom" required error={errors.name?.message}>
            <Input {...register("name")} />
          </FormField>
          <FormField label="Description">
            <Input {...register("description")} />
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
