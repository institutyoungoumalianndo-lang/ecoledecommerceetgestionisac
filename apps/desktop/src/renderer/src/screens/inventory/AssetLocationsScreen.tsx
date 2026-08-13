import { zodResolver } from "@hookform/resolvers/zod";
import { type AssetLocationDto, type CreateAssetLocationInput, createAssetLocationInputSchema } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, FormField, Input } from "@isac-erp/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

/** Référentiel de lieux dédié à l'inventaire (MODULE-14 §1.1/§3) — distinct des salles (Module 5.2). */
export function AssetLocationsScreen() {
  const utils = trpc.useUtils();
  const canAdminister = useHasPermission("INVENTAIRE:ADMINISTRATION");
  const query = trpc.assetLocations.list.useQuery({});
  const [createOpen, setCreateOpen] = useState(false);

  function invalidate() {
    void utils.assetLocations.list.invalidate();
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAssetLocationInput>({ resolver: zodResolver(createAssetLocationInputSchema) });

  const create = trpc.assetLocations.create.useMutation({
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      reset();
    },
  });
  const update = trpc.assetLocations.update.useMutation({ onSuccess: invalidate });

  const columns: DataTableColumn<AssetLocationDto>[] = [
    { key: "building", header: "Bâtiment", value: (l) => l.building },
    { key: "floor", header: "Étage", value: (l) => l.floor ?? "—" },
    { key: "label", header: "Lieu", value: (l) => l.label },
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
        <h2 className="text-lg font-semibold text-foreground">Lieux</h2>
        {canAdminister && <Button onClick={() => setCreateOpen(true)}>Nouveau lieu</Button>}
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(l) => l.id}
        exportFilename="lieux-inventaire"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun lieu."}
        rowActions={
          canAdminister
            ? (l) =>
                l.isActive ? (
                  <Button variant="destructive" onClick={() => update.mutate({ id: l.id, isActive: false })}>
                    Désactiver
                  </Button>
                ) : (
                  <Button variant="success" onClick={() => update.mutate({ id: l.id, isActive: true })}>
                    Réactiver
                  </Button>
                )
            : undefined
        }
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Créer un lieu">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => create.mutate(values))}>
          <FormField label="Bâtiment" required error={errors.building?.message}>
            <Input {...register("building")} placeholder="Bâtiment principal…" />
          </FormField>
          <FormField label="Étage" error={errors.floor?.message}>
            <Input {...register("floor")} placeholder="1er étage…" />
          </FormField>
          <FormField label="Lieu" required error={errors.label?.message}>
            <Input {...register("label")} placeholder="Bureau du Directeur, Entrepôt…" />
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
