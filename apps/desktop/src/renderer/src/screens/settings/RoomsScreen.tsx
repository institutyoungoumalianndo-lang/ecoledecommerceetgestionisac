import { zodResolver } from "@hookform/resolvers/zod";
import { type CreateRoomInput, type RoomDto, createRoomInputSchema } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, FormField, Input } from "@isac-erp/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";

/** Salles — référentiel minimal (MODULE-05.2 §1.7), remplace à terme Class.mainRoom (texte libre). */
export function RoomsScreen() {
  const utils = trpc.useUtils();
  const query = trpc.rooms.list.useQuery({});
  const [createOpen, setCreateOpen] = useState(false);

  function invalidate() {
    void utils.rooms.list.invalidate();
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateRoomInput>({ resolver: zodResolver(createRoomInputSchema) });

  const create = trpc.rooms.create.useMutation({
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      reset();
    },
  });
  const deactivate = trpc.rooms.deactivate.useMutation({ onSuccess: invalidate });
  const reactivate = trpc.rooms.reactivate.useMutation({ onSuccess: invalidate });

  const columns: DataTableColumn<RoomDto>[] = [
    { key: "label", header: "Libellé", value: (r) => r.label },
    { key: "capacity", header: "Capacité", value: (r) => (r.capacity !== null ? String(r.capacity) : "—") },
    {
      key: "status",
      header: "Statut",
      value: (r) => (r.isActive ? "Active" : "Inactive"),
      render: (r) => <Badge variant={r.isActive ? "success" : "muted"}>{r.isActive ? "Active" : "Inactive"}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Salles</h2>
        <Button onClick={() => setCreateOpen(true)}>Nouvelle salle</Button>
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(r) => r.id}
        exportFilename="salles"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucune salle."}
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

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Créer une salle">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => create.mutate(values))}>
          <FormField label="Libellé" required error={errors.label?.message}>
            <Input {...register("label")} placeholder="Amphi A, Salle 12…" />
          </FormField>
          <FormField label="Capacité" error={errors.capacity?.message}>
            <Input type="number" {...register("capacity", { valueAsNumber: true })} />
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
