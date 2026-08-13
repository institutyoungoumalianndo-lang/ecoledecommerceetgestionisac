import { zodResolver } from "@hookform/resolvers/zod";
import { type CreateFiliereInput, type FiliereDto, createFiliereInputSchema } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, FormField, Input } from "@isac-erp/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";

/** Filières (§3.10). */
export function FilieresScreen() {
  const utils = trpc.useUtils();
  const query = trpc.filieres.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);

  function invalidate() {
    void utils.filieres.list.invalidate();
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFiliereInput>({ resolver: zodResolver(createFiliereInputSchema) });

  const create = trpc.filieres.create.useMutation({
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      reset();
    },
  });
  const deactivate = trpc.filieres.deactivate.useMutation({ onSuccess: invalidate });
  const reactivate = trpc.filieres.reactivate.useMutation({ onSuccess: invalidate });

  const columns: DataTableColumn<FiliereDto>[] = [
    { key: "code", header: "Code", value: (f) => f.code },
    { key: "name", header: "Nom", value: (f) => f.name },
    { key: "duration", header: "Durée", value: (f) => f.duration ?? "—" },
    {
      key: "status",
      header: "Statut",
      value: (f) => (f.isActive ? "Active" : "Inactive"),
      render: (f) => <Badge variant={f.isActive ? "success" : "muted"}>{f.isActive ? "Active" : "Inactive"}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Filières</h2>
        <Button onClick={() => setCreateOpen(true)}>Nouvelle filière</Button>
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(f) => f.id}
        exportFilename="filieres"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucune filière."}
        rowActions={(f) =>
          f.isActive ? (
            <Button variant="outline" onClick={() => deactivate.mutate({ id: f.id })}>
              Désactiver
            </Button>
          ) : (
            <Button variant="outline" onClick={() => reactivate.mutate({ id: f.id })}>
              Réactiver
            </Button>
          )
        }
      />
      {deactivate.error && <p className="text-sm text-destructive">{deactivate.error.message}</p>}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Créer une filière">
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((values) => create.mutate(values))}
        >
          <FormField label="Code" required error={errors.code?.message}>
            <Input {...register("code")} />
          </FormField>
          <FormField label="Nom" required error={errors.name?.message}>
            <Input {...register("name")} />
          </FormField>
          <FormField label="Description">
            <Input {...register("description")} />
          </FormField>
          <FormField label="Durée">
            <Input placeholder="ex. 3 ans" {...register("duration")} />
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
