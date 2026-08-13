"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type {
  AssetCategoryDto,
  AssetDto,
  AssetLocationDto,
  CreateAssetInput,
  TeacherListRow,
} from "@isac-erp/shared";
import { createAssetInputSchema } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, FormField, Input, Select } from "@isac-erp/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { trpcClient } from "../../../../lib/trpc";

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

type EmployeeRow = { id: string; firstName: string | null; lastName: string | null; matricule: string };

/**
 * Registre des biens (MODULE-14 §1.1), porté au portail Super Administrateur — réutilise directement
 * `assets.list`/`assets.create` (déjà `permissionProcedure`, contourné par le rôle Super Admin) et le
 * même modèle de colonnes que `AssetsScreen.tsx` du desktop.
 */
export default function AdminInventoryPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<AssetDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [categories, setCategories] = useState<AssetCategoryDto[]>([]);
  const [locations, setLocations] = useState<AssetLocationDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherListRow[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    trpcClient.assetCategories.list.query({ activeOnly: true }).then(setCategories).catch(() => setCategories([]));
    trpcClient.assetLocations.list.query({ activeOnly: true }).then(setLocations).catch(() => setLocations([]));
    trpcClient.employees.list
      .query({ includeArchived: false, pageSize: 200 })
      .then((r) => setEmployees(r.rows))
      .catch(() => setEmployees([]));
    trpcClient.teachers.list
      .query({ includeArchived: false, pageSize: 200 })
      .then((r) => setTeachers(r.rows))
      .catch(() => setTeachers([]));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    trpcClient.assets.list
      .query({
        categoryId: categoryId || undefined,
        locationId: locationId || undefined,
        status: (status || undefined) as AssetDto["status"] | undefined,
        search: search || undefined,
      })
      .then(setAssets)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement des biens."))
      .finally(() => setIsLoading(false));
  }, [categoryId, locationId, status, search]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAssetInput>({ resolver: zodResolver(createAssetInputSchema) });

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function onCreate(values: CreateAssetInput) {
    setIsCreating(true);
    setCreateError(null);
    try {
      await trpcClient.assets.create.mutate(values);
      setCreateOpen(false);
      reset();
      const refreshed = await trpcClient.assets.list.query({
        categoryId: categoryId || undefined,
        locationId: locationId || undefined,
        status: (status || undefined) as AssetDto["status"] | undefined,
        search: search || undefined,
      });
      setAssets(refreshed);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    } finally {
      setIsCreating(false);
    }
  }

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
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Inventaire — Biens</h1>
        <Button onClick={() => setCreateOpen(true)}>Nouveau bien</Button>
      </div>

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          <option value="">Tous les lieux</option>
          {locations.map((l) => (
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
        rows={assets}
        getRowId={(a) => a.id}
        exportFilename="biens-inventaire"
        emptyMessage={isLoading ? "Chargement…" : "Aucun bien."}
        rowActions={(a) => (
          <Button variant="outline" onClick={() => router.push(`/admin/inventaire/${a.id}`)}>
            Ouvrir
          </Button>
        )}
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Enregistrer un bien">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onCreate)}>
          <FormField label="Désignation" required error={errors.label?.message}>
            <Input {...register("label")} placeholder="Ordinateur portable, Bureau…" />
          </FormField>
          <FormField label="Description" error={errors.description?.message}>
            <Input {...register("description")} />
          </FormField>
          <FormField label="Catégorie" required error={errors.categoryId?.message}>
            <Select {...register("categoryId")}>
              <option value="">Sélectionner…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Lieu" error={errors.locationId?.message}>
            <Select {...register("locationId", { setValueAs: (v) => v || undefined })}>
              <option value="">Aucun</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{[l.building, l.floor, l.label].filter(Boolean).join(" / ")}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Responsable — employé" error={errors.responsibleEmployeeId?.message}>
            <Select {...register("responsibleEmployeeId", { setValueAs: (v) => v || undefined })}>
              <option value="">Aucun</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.matricule})</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Responsable — enseignant" error={errors.responsibleTeacherId?.message}>
            <Select {...register("responsibleTeacherId", { setValueAs: (v) => v || undefined })}>
              <option value="">Aucun</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.matricule})</option>
              ))}
            </Select>
          </FormField>
          <p className="text-xs text-window-foreground/70">
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
          {createError && <p className="text-sm text-destructive">{createError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
