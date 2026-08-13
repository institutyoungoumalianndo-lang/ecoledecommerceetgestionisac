import { zodResolver } from "@hookform/resolvers/zod";
import {
  type CreateTeacherStatusInput,
  type TeacherStatusDto,
  createTeacherStatusInputSchema,
} from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, FormField, Input } from "@isac-erp/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";

/** Statuts d'enseignant (MODULE-05 §1.6) — référentiel configurable, comme les modes de paiement du Module 4.3. */
export function TeacherStatusesScreen() {
  const utils = trpc.useUtils();
  const query = trpc.teacherStatuses.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);

  function invalidate() {
    void utils.teacherStatuses.list.invalidate();
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTeacherStatusInput>({ resolver: zodResolver(createTeacherStatusInputSchema) });

  const create = trpc.teacherStatuses.create.useMutation({
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      reset();
    },
  });
  const deactivate = trpc.teacherStatuses.deactivate.useMutation({ onSuccess: invalidate });
  const reactivate = trpc.teacherStatuses.reactivate.useMutation({ onSuccess: invalidate });

  const columns: DataTableColumn<TeacherStatusDto>[] = [
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
        <h2 className="text-lg font-semibold text-foreground">Statuts d'enseignant</h2>
        <Button onClick={() => setCreateOpen(true)}>Nouveau statut</Button>
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(r) => r.id}
        exportFilename="statuts-enseignants"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun statut."}
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

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Créer un statut">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => create.mutate(values))}>
          <FormField label="Code" required error={errors.code?.message} hint="Ex. PERMANENT">
            <Input placeholder="PERMANENT" {...register("code")} />
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
