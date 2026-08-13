import { zodResolver } from "@hookform/resolvers/zod";
import { type AssetDto, type CreateAssetInput, createAssetInputSchema } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, FormField, Input, Select } from "@isac-erp/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const STATUS_LABELS: Record<AssetDto["status"], string> = {
  EN_SERVICE: "En service",
  EN_PANNE: "En panne",
  EN_REPARATION: "En réparation",
  REFORME: "Réformé",
  PERDU_VOLE: "Perdu/volé",
};

const STATUS_VARIANT: Record<AssetDto["status"], "success" | "warning" | "destructive" | "muted"> = {
  EN_SERVICE: "success",
  EN_PANNE: "destructive",
  EN_REPARATION: "warning",
  REFORME: "muted",
  PERDU_VOLE: "muted",
};

const CONDITION_LABELS: Record<AssetDto["condition"], string> = { BON: "Bon", MOYEN: "Moyen", MAUVAIS: "Mauvais" };

/** Registre des biens/matériel (MODULE-14 §1.1). */
export function AssetsScreen({ onOpenAsset }: { onOpenAsset: (id: string) => void }) {
  const utils = trpc.useUtils();
  const canCreate = useHasPermission("INVENTAIRE:CREATION");
  const [categoryId, setCategoryId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const query = trpc.assets.list.useQuery({
    categoryId: categoryId || undefined,
    locationId: locationId || undefined,
    status: (status || undefined) as AssetDto["status"] | undefined,
    search: search || undefined,
  });
  const categoriesQuery = trpc.assetCategories.list.useQuery({ activeOnly: true });
  const locationsQuery = trpc.assetLocations.list.useQuery({ activeOnly: true });
  const employeesQuery = trpc.employees.list.useQuery({ includeArchived: false, pageSize: 200 });
  const teachersQuery = trpc.teachers.list.useQuery({ includeArchived: false, pageSize: 200 });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAssetInput>({ resolver: zodResolver(createAssetInputSchema) });

  const create = trpc.assets.create.useMutation({
    onSuccess: () => {
      void utils.assets.list.invalidate();
      setCreateOpen(false);
      reset();
    },
  });

  const columns: DataTableColumn<AssetDto>[] = [
    { key: "inventoryNumber", header: "N° inventaire", value: (a) => a.inventoryNumber },
    { key: "label", header: "Désignation", value: (a) => a.label },
    { key: "categoryName", header: "Catégorie", value: (a) => a.categoryName },
    { key: "locationLabel", header: "Lieu", value: (a) => a.locationLabel ?? "—" },
    { key: "responsibleName", header: "Responsable", value: (a) => a.responsibleName ?? "—" },
    { key: "condition", header: "État", value: (a) => CONDITION_LABELS[a.condition] },
    {
      key: "status",
      header: "Statut",
      value: (a) => STATUS_LABELS[a.status],
      render: (a) => <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABELS[a.status]}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Biens</h2>
        {canCreate && <Button onClick={() => setCreateOpen(true)}>Nouveau bien</Button>}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {categoriesQuery.data?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          <option value="">Tous les lieux</option>
          {locationsQuery.data?.map((l) => (
            <option key={l.id} value={l.id}>{[l.building, l.floor, l.label].filter(Boolean).join(" / ")}</option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(a) => a.id}
        exportFilename="biens-inventaire"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun bien."}
        rowActions={(a) => (
          <Button variant="outline" onClick={() => onOpenAsset(a.id)}>
            Ouvrir
          </Button>
        )}
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Enregistrer un bien">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => create.mutate(values))}>
          <FormField label="Désignation" required error={errors.label?.message}>
            <Input {...register("label")} placeholder="Ordinateur portable, Bureau…" />
          </FormField>
          <FormField label="Description" error={errors.description?.message}>
            <Input {...register("description")} />
          </FormField>
          <FormField label="Catégorie" required error={errors.categoryId?.message}>
            <Select {...register("categoryId")}>
              <option value="">Sélectionner…</option>
              {categoriesQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Lieu" error={errors.locationId?.message}>
            <Select {...register("locationId", { setValueAs: (v) => v || undefined })}>
              <option value="">Aucun</option>
              {locationsQuery.data?.map((l) => (
                <option key={l.id} value={l.id}>{[l.building, l.floor, l.label].filter(Boolean).join(" / ")}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Responsable — employé" error={errors.responsibleEmployeeId?.message}>
            <Select {...register("responsibleEmployeeId", { setValueAs: (v) => v || undefined })}>
              <option value="">Aucun</option>
              {employeesQuery.data?.rows.map((e) => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.matricule})</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Responsable — enseignant" error={errors.responsibleTeacherId?.message}>
            <Select {...register("responsibleTeacherId", { setValueAs: (v) => v || undefined })}>
              <option value="">Aucun</option>
              {teachersQuery.data?.rows.map((t) => (
                <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.matricule})</option>
              ))}
            </Select>
          </FormField>
          <p className="text-xs text-muted-foreground">
            Un seul responsable à la fois — employé ou enseignant, pas les deux.
          </p>
          <FormField label="État" error={errors.condition?.message}>
            <Select {...register("condition")}>
              {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Valeur d'acquisition" error={errors.acquisitionValue?.message}>
            <Input type="number" step="0.01" {...register("acquisitionValue", { valueAsNumber: true })} />
          </FormField>
          <FormField label="Date d'acquisition" error={errors.acquisitionDate?.message}>
            <Input type="date" {...register("acquisitionDate", { valueAsDate: true })} />
          </FormField>
          {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
