import { zodResolver } from "@hookform/resolvers/zod";
import {
  type CreateEnrollmentRegimeInput,
  type EnrollmentRegimeDto,
  createEnrollmentRegimeInputSchema,
} from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, FormField, Input } from "@isac-erp/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";

/** Régimes d'inscription (MODULE-04.1 §2.1) — liste configurable, comme les niveaux du Module 2. */
export function EnrollmentRegimesScreen() {
  const utils = trpc.useUtils();
  const query = trpc.enrollmentRegimes.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);

  function invalidate() {
    void utils.enrollmentRegimes.list.invalidate();
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateEnrollmentRegimeInput>({ resolver: zodResolver(createEnrollmentRegimeInputSchema) });

  const create = trpc.enrollmentRegimes.create.useMutation({
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      reset();
    },
  });
  const deactivate = trpc.enrollmentRegimes.deactivate.useMutation({ onSuccess: invalidate });
  const reactivate = trpc.enrollmentRegimes.reactivate.useMutation({ onSuccess: invalidate });

  const columns: DataTableColumn<EnrollmentRegimeDto>[] = [
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
        <h2 className="text-lg font-semibold text-foreground">Régimes d'inscription</h2>
        <Button onClick={() => setCreateOpen(true)}>Nouveau régime</Button>
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(r) => r.id}
        exportFilename="regimes"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun régime."}
        rowActions={(r) =>
          r.isActive ? (
            <Button variant="outline" onClick={() => deactivate.mutate({ id: r.id })}>
              Désactiver
            </Button>
          ) : (
            <Button variant="outline" onClick={() => reactivate.mutate({ id: r.id })}>
              Réactiver
            </Button>
          )
        }
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Créer un régime">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => create.mutate(values))}>
          <FormField label="Code" required error={errors.code?.message} hint="Ex. NORMAL">
            <Input placeholder="NORMAL" {...register("code")} />
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
