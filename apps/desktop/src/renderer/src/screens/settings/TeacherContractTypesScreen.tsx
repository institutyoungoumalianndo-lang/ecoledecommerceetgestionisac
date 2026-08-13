import { zodResolver } from "@hookform/resolvers/zod";
import {
  type CreateTeacherContractTypeInput,
  type TeacherContractTypeDto,
  createTeacherContractTypeInputSchema,
} from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, FormField, Input } from "@isac-erp/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";

/** Types de contrat d'enseignant (MODULE-05 §1.6) — référentiel configurable. */
export function TeacherContractTypesScreen() {
  const utils = trpc.useUtils();
  const query = trpc.teacherContractTypes.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);

  function invalidate() {
    void utils.teacherContractTypes.list.invalidate();
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTeacherContractTypeInput>({ resolver: zodResolver(createTeacherContractTypeInputSchema) });

  const create = trpc.teacherContractTypes.create.useMutation({
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      reset();
    },
  });
  const deactivate = trpc.teacherContractTypes.deactivate.useMutation({ onSuccess: invalidate });
  const reactivate = trpc.teacherContractTypes.reactivate.useMutation({ onSuccess: invalidate });

  const columns: DataTableColumn<TeacherContractTypeDto>[] = [
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
        <h2 className="text-lg font-semibold text-foreground">Types de contrat</h2>
        <Button onClick={() => setCreateOpen(true)}>Nouveau type</Button>
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(r) => r.id}
        exportFilename="types-contrat-enseignants"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun type de contrat."}
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

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Créer un type de contrat">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => create.mutate(values))}>
          <FormField label="Code" required error={errors.code?.message} hint="Ex. CDI">
            <Input placeholder="CDI" {...register("code")} />
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
