import { zodResolver } from "@hookform/resolvers/zod";
import { type CreateLevelInput, type LevelDto, createLevelInputSchema } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, FormField, Input } from "@isac-erp/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";

/** Niveaux d'études (§3.12) — liste libre, pas figée à L1..M2. */
export function LevelsScreen() {
  const utils = trpc.useUtils();
  const query = trpc.levels.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);

  function invalidate() {
    void utils.levels.list.invalidate();
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateLevelInput>({
    resolver: zodResolver(createLevelInputSchema),
    defaultValues: { orderIndex: (query.data?.length ?? 0) + 1 },
  });

  const create = trpc.levels.create.useMutation({
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      reset();
    },
  });
  const deactivate = trpc.levels.deactivate.useMutation({ onSuccess: invalidate });
  const reactivate = trpc.levels.reactivate.useMutation({ onSuccess: invalidate });

  const columns: DataTableColumn<LevelDto>[] = [
    { key: "code", header: "Code", value: (l) => l.code },
    { key: "label", header: "Libellé", value: (l) => l.label },
    { key: "order", header: "Ordre", value: (l) => l.orderIndex },
    {
      key: "status",
      header: "Statut",
      value: (l) => (l.isActive ? "Actif" : "Inactif"),
      render: (l) => <Badge variant={l.isActive ? "success" : "muted"}>{l.isActive ? "Actif" : "Inactif"}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Niveaux d'études</h2>
        <Button onClick={() => setCreateOpen(true)}>Nouveau niveau</Button>
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(l) => l.id}
        exportFilename="niveaux"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun niveau."}
        rowActions={(l) =>
          l.isActive ? (
            <Button variant="outline" onClick={() => deactivate.mutate({ id: l.id })}>
              Désactiver
            </Button>
          ) : (
            <Button variant="outline" onClick={() => reactivate.mutate({ id: l.id })}>
              Réactiver
            </Button>
          )
        }
      />
      {deactivate.error && <p className="text-sm text-destructive">{deactivate.error.message}</p>}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Créer un niveau">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => create.mutate(values))}>
          <FormField label="Code" required error={errors.code?.message} hint="Ex. L1">
            <Input placeholder="L1" {...register("code")} />
          </FormField>
          <FormField label="Libellé" required error={errors.label?.message} hint="Ex. Licence 1">
            <Input placeholder="Licence 1" {...register("label")} />
          </FormField>
          <FormField label="Ordre d'affichage">
            <Input type="number" {...register("orderIndex", { valueAsNumber: true })} />
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
