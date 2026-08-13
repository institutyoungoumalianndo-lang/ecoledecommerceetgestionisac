import { zodResolver } from "@hookform/resolvers/zod";
import {
  type CreateEmployeeCategoryInput,
  type EmployeeCategoryDto,
  createEmployeeCategoryInputSchema,
} from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, FormField, Input } from "@isac-erp/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";

/** Catégories d'employés (MODULE-08 §1.2) — référentiel configurable, découplé des rôles RBAC. */
export function EmployeeCategoriesScreen() {
  const utils = trpc.useUtils();
  const query = trpc.employeeCategories.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);

  function invalidate() {
    void utils.employeeCategories.list.invalidate();
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateEmployeeCategoryInput>({ resolver: zodResolver(createEmployeeCategoryInputSchema) });

  const create = trpc.employeeCategories.create.useMutation({
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      reset();
    },
  });
  const deactivate = trpc.employeeCategories.deactivate.useMutation({ onSuccess: invalidate });
  const reactivate = trpc.employeeCategories.reactivate.useMutation({ onSuccess: invalidate });

  const columns: DataTableColumn<EmployeeCategoryDto>[] = [
    { key: "code", header: "Code", value: (r) => r.code },
    { key: "label", header: "Libellé", value: (r) => r.label },
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
        <h2 className="text-lg font-semibold text-foreground">Catégories d'employés</h2>
        <Button onClick={() => setCreateOpen(true)}>Nouvelle catégorie</Button>
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(r) => r.id}
        exportFilename="categories-employes"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucune catégorie."}
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

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Créer une catégorie">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => create.mutate(values))}>
          <FormField label="Code" required error={errors.code?.message} hint="Ex. SECRETAIRE">
            <Input placeholder="SECRETAIRE" {...register("code")} />
          </FormField>
          <FormField label="Libellé" required error={errors.label?.message}>
            <Input {...register("label")} />
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
