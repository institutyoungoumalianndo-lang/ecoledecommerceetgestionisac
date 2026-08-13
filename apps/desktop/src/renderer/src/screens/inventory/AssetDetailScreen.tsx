import { zodResolver } from "@hookform/resolvers/zod";
import {
  type AssetMaintenanceDto,
  type AssetMovementDto,
  type CreateAssetMaintenanceInput,
  type ReformAssetInput,
  type UpdateAssetInput,
  createAssetMaintenanceInputSchema,
  reformAssetInputSchema,
  updateAssetInputSchema,
} from "@isac-erp/shared";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, DataTable, type DataTableColumn, Dialog, FormField, Input, Select } from "@isac-erp/ui";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const STATUS_LABELS = {
  EN_SERVICE: "En service",
  EN_PANNE: "En panne",
  EN_REPARATION: "En réparation",
  REFORME: "Réformé",
  PERDU_VOLE: "Perdu/volé",
} as const;

const CONDITION_LABELS = { BON: "Bon", MOYEN: "Moyen", MAUVAIS: "Mauvais" } as const;

const MAINTENANCE_STATUS_LABELS = { PLANIFIEE: "Planifiée", TERMINEE: "Terminée" } as const;

export function AssetDetailScreen({ assetId, onBack }: { assetId: string; onBack: () => void }) {
  const utils = trpc.useUtils();
  const canModify = useHasPermission("INVENTAIRE:MODIFICATION");
  const canReform = useHasPermission("INVENTAIRE:SUPPRESSION");

  const assetQuery = trpc.assets.get.useQuery({ id: assetId });
  const movementsQuery = trpc.assets.movements.useQuery({ id: assetId });
  const maintenancesQuery = trpc.assetMaintenances.list.useQuery({ id: assetId });
  const categoriesQuery = trpc.assetCategories.list.useQuery({ activeOnly: true });
  const locationsQuery = trpc.assetLocations.list.useQuery({ activeOnly: true });
  const employeesQuery = trpc.employees.list.useQuery({ includeArchived: false, pageSize: 200 });
  const teachersQuery = trpc.teachers.list.useQuery({ includeArchived: false, pageSize: 200 });

  const [reformOpen, setReformOpen] = useState(false);
  const [maintenanceDialog, setMaintenanceDialog] = useState<AssetMaintenanceDto | "new" | null>(null);

  function invalidateAsset() {
    void utils.assets.get.invalidate({ id: assetId });
    void utils.assets.list.invalidate();
    void utils.assets.movements.invalidate({ id: assetId });
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateAssetInput>({ resolver: zodResolver(updateAssetInputSchema) });

  useEffect(() => {
    if (assetQuery.data) {
      reset({
        id: assetQuery.data.id,
        label: assetQuery.data.label,
        description: assetQuery.data.description,
        categoryId: assetQuery.data.categoryId,
        locationId: assetQuery.data.locationId,
        responsibleEmployeeId: assetQuery.data.responsibleEmployeeId,
        responsibleTeacherId: assetQuery.data.responsibleTeacherId,
        condition: assetQuery.data.condition,
        acquisitionValue: assetQuery.data.acquisitionValue,
        acquisitionDate: assetQuery.data.acquisitionDate,
      });
    }
  }, [assetQuery.data, reset]);

  const update = trpc.assets.update.useMutation({ onSuccess: invalidateAsset });

  const {
    register: registerReform,
    handleSubmit: handleReformSubmit,
    reset: resetReform,
    formState: { errors: reformErrors },
  } = useForm<ReformAssetInput>({ resolver: zodResolver(reformAssetInputSchema), defaultValues: { id: assetId, status: "REFORME" } });

  const reform = trpc.assets.reform.useMutation({
    onSuccess: () => {
      invalidateAsset();
      setReformOpen(false);
      resetReform();
    },
  });

  const movementColumns: DataTableColumn<AssetMovementDto>[] = [
    { key: "field", header: "Champ", value: (m) => m.field },
    { key: "oldValue", header: "Ancienne valeur", value: (m) => m.oldValue ?? "—" },
    { key: "newValue", header: "Nouvelle valeur", value: (m) => m.newValue ?? "—" },
    { key: "changedByName", header: "Modifié par", value: (m) => m.changedByName ?? "—" },
    { key: "createdAt", header: "Date", value: (m) => m.createdAt.getTime(), render: (m) => m.createdAt.toLocaleString("fr-FR") },
  ];

  const maintenanceColumns: DataTableColumn<AssetMaintenanceDto>[] = [
    { key: "description", header: "Intervention", value: (m) => m.description },
    { key: "cost", header: "Coût", value: (m) => (m.cost !== null ? `${m.cost.toLocaleString("fr-FR")}` : "—") },
    { key: "performedBy", header: "Intervenant", value: (m) => m.performedBy ?? "—" },
    {
      key: "status",
      header: "Statut",
      value: (m) => MAINTENANCE_STATUS_LABELS[m.status],
      render: (m) => <Badge variant={m.status === "TERMINEE" ? "success" : "warning"}>{MAINTENANCE_STATUS_LABELS[m.status]}</Badge>,
    },
    { key: "createdAt", header: "Enregistrée le", value: (m) => m.createdAt.getTime(), render: (m) => m.createdAt.toLocaleDateString("fr-FR") },
  ];

  if (assetQuery.isLoading || !assetQuery.data) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }
  const asset = assetQuery.data;
  const isReformed = asset.status === "REFORME" || asset.status === "PERDU_VOLE";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={onBack}>
          Retour
        </Button>
        <h2 className="text-lg font-semibold text-foreground">
          {asset.label} <span className="font-mono text-sm text-muted-foreground">({asset.inventoryNumber})</span>
        </h2>
        <Badge variant={isReformed ? "muted" : asset.status === "EN_PANNE" ? "destructive" : "success"}>
          {STATUS_LABELS[asset.status]}
        </Badge>
        {canReform && !isReformed && (
          <Button variant="destructive" className="ml-auto" onClick={() => setReformOpen(true)}>
            Réformer / mettre au rebut
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fiche du bien</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit((values) => update.mutate(values))}>
            <FormField label="Désignation" required error={errors.label?.message}>
              <Input {...register("label")} disabled={!canModify || isReformed} />
            </FormField>
            <FormField label="Description" error={errors.description?.message}>
              <Input {...register("description")} disabled={!canModify || isReformed} />
            </FormField>
            <FormField label="Catégorie" error={errors.categoryId?.message}>
              <Select {...register("categoryId")} disabled={!canModify || isReformed}>
                {categoriesQuery.data?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Lieu" error={errors.locationId?.message}>
              <Select {...register("locationId", { setValueAs: (v) => v || undefined })} disabled={!canModify || isReformed}>
                <option value="">Aucun</option>
                {locationsQuery.data?.map((l) => (
                  <option key={l.id} value={l.id}>{[l.building, l.floor, l.label].filter(Boolean).join(" / ")}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Responsable — employé" error={errors.responsibleEmployeeId?.message}>
              <Select {...register("responsibleEmployeeId", { setValueAs: (v) => v || undefined })} disabled={!canModify || isReformed}>
                <option value="">Aucun</option>
                {employeesQuery.data?.rows.map((e) => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.matricule})</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Responsable — enseignant" error={errors.responsibleTeacherId?.message}>
              <Select {...register("responsibleTeacherId", { setValueAs: (v) => v || undefined })} disabled={!canModify || isReformed}>
                <option value="">Aucun</option>
                {teachersQuery.data?.rows.map((t) => (
                  <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.matricule})</option>
                ))}
              </Select>
            </FormField>
            <FormField label="État" error={errors.condition?.message}>
              <Select {...register("condition")} disabled={!canModify || isReformed}>
                {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Valeur d'acquisition" error={errors.acquisitionValue?.message}>
              <Input type="number" step="0.01" {...register("acquisitionValue", { valueAsNumber: true })} disabled={!canModify || isReformed} />
            </FormField>
            <FormField label="Date d'acquisition" error={errors.acquisitionDate?.message}>
              <Input type="date" {...register("acquisitionDate", { valueAsDate: true })} disabled={!canModify || isReformed} />
            </FormField>
            {update.error && <p className="col-span-2 text-sm text-destructive">{update.error.message}</p>}
            {canModify && !isReformed && (
              <div className="col-span-2 flex justify-end">
                <Button type="submit" disabled={update.isPending}>
                  {update.isPending ? "Enregistrement…" : "Enregistrer les modifications"}
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

      <Card>
        <CardHeader>
          <CardTitle>Historique de maintenance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {canModify && (
            <div className="flex justify-end">
              <Button onClick={() => setMaintenanceDialog("new")}>Ajouter une intervention</Button>
            </div>
          )}
          <DataTable
            columns={maintenanceColumns}
            rows={maintenancesQuery.data ?? []}
            getRowId={(m) => m.id}
            exportFilename="maintenance-bien"
            emptyMessage={maintenancesQuery.isLoading ? "Chargement…" : "Aucune intervention enregistrée."}
            rowActions={canModify ? (m) => <Button variant="outline" onClick={() => setMaintenanceDialog(m)}>Modifier</Button> : undefined}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des mouvements</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={movementColumns}
            rows={movementsQuery.data ?? []}
            getRowId={(m) => m.id}
            exportFilename="mouvements-bien"
            emptyMessage={movementsQuery.isLoading ? "Chargement…" : "Aucun mouvement enregistré."}
          />
        </CardContent>
      </Card>

      <Dialog open={reformOpen} onClose={() => setReformOpen(false)} title="Réformer / mettre au rebut" variant="destructive">
        <form className="flex flex-col gap-4" onSubmit={handleReformSubmit((values) => reform.mutate(values))}>
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
          {reform.error && <p className="text-sm text-destructive">{reform.error.message}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setReformOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="destructive" disabled={reform.isPending}>
              {reform.isPending ? "Confirmation…" : "Confirmer la réforme"}
            </Button>
          </div>
        </form>
      </Dialog>

      {maintenanceDialog && (
        <MaintenanceDialog
          assetId={assetId}
          maintenance={maintenanceDialog === "new" ? null : maintenanceDialog}
          onClose={() => setMaintenanceDialog(null)}
          onSaved={() => void utils.assetMaintenances.list.invalidate({ id: assetId })}
        />
      )}
    </div>
  );
}

function MaintenanceDialog({
  assetId,
  maintenance,
  onClose,
  onSaved,
}: {
  assetId: string;
  maintenance: AssetMaintenanceDto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = maintenance !== null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateAssetMaintenanceInput>({
    resolver: zodResolver(createAssetMaintenanceInputSchema),
    defaultValues: maintenance
      ? {
          assetId,
          description: maintenance.description,
          cost: maintenance.cost,
          performedBy: maintenance.performedBy,
          status: maintenance.status,
          scheduledAt: maintenance.scheduledAt,
          completedAt: maintenance.completedAt,
        }
      : { assetId, status: "PLANIFIEE" },
  });

  const create = trpc.assetMaintenances.create.useMutation({
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });
  const update = trpc.assetMaintenances.update.useMutation({
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });

  function onSubmit(values: CreateAssetMaintenanceInput) {
    if (isEditing && maintenance) {
      update.mutate({ id: maintenance.id, ...values });
    } else {
      create.mutate(values);
    }
  }

  const mutation = isEditing ? update : create;

  return (
    <Dialog open onClose={onClose} title={isEditing ? "Modifier l'intervention" : "Ajouter une intervention"}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <FormField label="Description" required error={errors.description?.message}>
          <Input {...register("description")} placeholder="Réparation, entretien…" />
        </FormField>
        <FormField label="Coût" error={errors.cost?.message}>
          <Input type="number" step="0.01" {...register("cost", { valueAsNumber: true })} />
        </FormField>
        <FormField label="Intervenant" error={errors.performedBy?.message}>
          <Input {...register("performedBy")} placeholder="Technicien interne, prestataire…" />
        </FormField>
        <FormField label="Statut" error={errors.status?.message}>
          <Select {...register("status")}>
            {Object.entries(MAINTENANCE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Date planifiée" error={errors.scheduledAt?.message}>
          <Input type="date" {...register("scheduledAt", { valueAsDate: true })} />
        </FormField>
        <FormField label="Date de fin" error={errors.completedAt?.message}>
          <Input type="date" {...register("completedAt", { valueAsDate: true })} />
        </FormField>
        {mutation.error && <p className="text-sm text-destructive">{mutation.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
