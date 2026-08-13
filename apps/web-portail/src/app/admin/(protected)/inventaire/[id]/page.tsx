"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type {
  AssetCategoryDto,
  AssetDto,
  AssetLocationDto,
  AssetMovementDto,
  ReformAssetInput,
  TeacherListRow,
  UpdateAssetInput,
} from "@isac-erp/shared";
import { reformAssetInputSchema, updateAssetInputSchema } from "@isac-erp/shared";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, DataTable, type DataTableColumn, Dialog, FormField, Input, Select } from "@isac-erp/ui";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { trpcClient } from "../../../../../lib/trpc";

const STATUS_LABELS: Record<AssetDto["status"], string> = {
  EN_SERVICE: "En service",
  EN_PANNE: "En panne",
  EN_REPARATION: "En réparation",
  REFORME: "Réformé",
  PERDU_VOLE: "Perdu/volé",
};

const CONDITION_LABELS: Record<AssetDto["condition"], string> = { BON: "Bon", MOYEN: "Moyen", MAUVAIS: "Mauvais" };

type EmployeeRow = { id: string; firstName: string | null; lastName: string | null; matricule: string };

/** Fiche d'un bien — identité éditable + historique de mouvements + réforme (MODULE-14 §1.1-1.4),
 * portée au portail Super Administrateur — même périmètre que `AssetDetailScreen.tsx` (desktop). */
export default function AdminAssetDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const assetId = params.id;

  const [asset, setAsset] = useState<AssetDto | null>(null);
  const [movements, setMovements] = useState<AssetMovementDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reformOpen, setReformOpen] = useState(false);
  const [isReforming, setIsReforming] = useState(false);
  const [reformError, setReformError] = useState<string | null>(null);

  const [categories, setCategories] = useState<AssetCategoryDto[]>([]);
  const [locations, setLocations] = useState<AssetLocationDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherListRow[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateAssetInput>({ resolver: zodResolver(updateAssetInputSchema) });

  const {
    register: registerReform,
    handleSubmit: handleReformSubmit,
    reset: resetReform,
    formState: { errors: reformErrors },
  } = useForm<ReformAssetInput>({ resolver: zodResolver(reformAssetInputSchema), defaultValues: { id: assetId, status: "REFORME" } });

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

  const loadAsset = useCallback(() => {
    trpcClient.assets.get
      .query({ id: assetId })
      .then((result) => {
        setAsset(result);
        reset({
          id: result.id,
          label: result.label,
          description: result.description,
          categoryId: result.categoryId,
          locationId: result.locationId,
          responsibleEmployeeId: result.responsibleEmployeeId,
          responsibleTeacherId: result.responsibleTeacherId,
          condition: result.condition,
          acquisitionValue: result.acquisitionValue,
          acquisitionDate: result.acquisitionDate,
        });
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement du bien."));
    trpcClient.assets.movements.query({ id: assetId }).then(setMovements).catch(() => setMovements([]));
  }, [assetId, reset]);

  useEffect(() => {
    loadAsset();
  }, [loadAsset]);

  async function onSubmit(values: UpdateAssetInput) {
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await trpcClient.assets.update.mutate(values);
      setAsset(updated);
      loadAsset();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  }

  async function onReform(values: ReformAssetInput) {
    setIsReforming(true);
    setReformError(null);
    try {
      const updated = await trpcClient.assets.reform.mutate(values);
      setAsset(updated);
      setReformOpen(false);
      resetReform();
      loadAsset();
    } catch (err) {
      setReformError(err instanceof Error ? err.message : "Échec de la réforme.");
    } finally {
      setIsReforming(false);
    }
  }

  const movementColumns: DataTableColumn<AssetMovementDto>[] = [
    { key: "field", header: "Champ", value: (m) => m.field },
    { key: "oldValue", header: "Ancienne valeur", value: (m) => m.oldValue ?? "—" },
    { key: "newValue", header: "Nouvelle valeur", value: (m) => m.newValue ?? "—" },
    { key: "changedByName", header: "Modifié par", value: (m) => m.changedByName ?? "—" },
    { key: "createdAt", header: "Date", value: (m) => new Date(m.createdAt).getTime(), render: (m) => new Date(m.createdAt).toLocaleString("fr-FR") },
  ];

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button variant="outline" onClick={() => router.push("/admin/inventaire")}>
          ← Retour à la liste
        </Button>
      </div>
    );
  }

  if (!asset) return null;

  const isReformed = asset.status === "REFORME" || asset.status === "PERDU_VOLE";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">{asset.label}</h1>
          <Badge>{asset.inventoryNumber}</Badge>
          <Badge variant={isReformed ? "muted" : asset.status === "EN_PANNE" ? "destructive" : "success"}>
            {STATUS_LABELS[asset.status]}
          </Badge>
        </div>
        <div className="flex gap-2">
          {!isReformed && (
            <Button variant="destructive" onClick={() => setReformOpen(true)}>
              Réformer / mettre au rebut
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push("/admin/inventaire")}>
            ← Retour à la liste
          </Button>
        </div>
      </div>

      <Card variant="form">
        <CardHeader>
          <CardTitle>Fiche du bien</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit(onSubmit)}>
            <FormField label="Désignation" required error={errors.label?.message}>
              <Input {...register("label")} disabled={isReformed} />
            </FormField>
            <FormField label="Description" error={errors.description?.message}>
              <Input {...register("description")} disabled={isReformed} />
            </FormField>
            <FormField label="Catégorie" error={errors.categoryId?.message}>
              <Select {...register("categoryId")} disabled={isReformed}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Lieu" error={errors.locationId?.message}>
              <Select {...register("locationId", { setValueAs: (v) => v || undefined })} disabled={isReformed}>
                <option value="">Aucun</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{[l.building, l.floor, l.label].filter(Boolean).join(" / ")}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Responsable — employé" error={errors.responsibleEmployeeId?.message}>
              <Select {...register("responsibleEmployeeId", { setValueAs: (v) => v || undefined })} disabled={isReformed}>
                <option value="">Aucun</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.matricule})</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Responsable — enseignant" error={errors.responsibleTeacherId?.message}>
              <Select {...register("responsibleTeacherId", { setValueAs: (v) => v || undefined })} disabled={isReformed}>
                <option value="">Aucun</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.matricule})</option>
                ))}
              </Select>
            </FormField>
            <FormField label="État" error={errors.condition?.message}>
              <Select {...register("condition")} disabled={isReformed}>
                {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Valeur d'acquisition" error={errors.acquisitionValue?.message}>
              <Input type="number" step="0.01" {...register("acquisitionValue", { valueAsNumber: true })} disabled={isReformed} />
            </FormField>
            <FormField label="Date d'acquisition" error={errors.acquisitionDate?.message}>
              <Input type="date" {...register("acquisitionDate", { valueAsDate: true })} disabled={isReformed} />
            </FormField>
            {saveError && <p className="col-span-2 text-sm text-destructive">{saveError}</p>}
            {!isReformed && (
              <div className="col-span-2 flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Enregistrement…" : "Enregistrer les modifications"}
                </Button>
              </div>
            )}
          </form>
          {isReformed && asset.reformJustification && (
            <p className="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">
              <strong>Justification de réforme :</strong> {asset.reformJustification}
            </p>
          )}
        </CardContent>
      </Card>

      <Card variant="form">
        <CardHeader>
          <CardTitle>Historique des mouvements</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={movementColumns}
            rows={movements}
            getRowId={(m) => m.id}
            exportFilename="mouvements-bien"
            emptyMessage="Aucun mouvement enregistré."
          />
        </CardContent>
      </Card>

      <Dialog open={reformOpen} onClose={() => setReformOpen(false)} title="Réformer / mettre au rebut" variant="destructive">
        <form className="flex flex-col gap-4" onSubmit={handleReformSubmit(onReform)}>
          <p className="text-sm text-destructive">
            Action définitive : le bien passera au statut réformé et n'apparaîtra plus comme actif. Une justification est obligatoire.
          </p>
          <FormField label="Motif" error={reformErrors.status?.message}>
            <Select {...registerReform("status")}>
              <option value="REFORME">Réformé (hors d'usage)</option>
              <option value="PERDU_VOLE">Perdu / volé</option>
            </Select>
          </FormField>
          <FormField label="Justification" required error={reformErrors.justification?.message}>
            <Input {...registerReform("justification")} placeholder="Motif de la réforme…" />
          </FormField>
          {reformError && <p className="text-sm text-destructive">{reformError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setReformOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="destructive" disabled={isReforming}>
              {isReforming ? "Confirmation…" : "Confirmer la réforme"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
