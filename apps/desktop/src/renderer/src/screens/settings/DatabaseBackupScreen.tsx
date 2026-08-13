import type { DatabaseBackupDto } from "@isac-erp/shared";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Checkbox, DataTable, type DataTableColumn, Dialog, Input, Label, Select } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const STATUS_LABELS: Record<DatabaseBackupDto["status"], string> = {
  EN_COURS: "En cours",
  REUSSIE: "Réussie",
  ECHOUEE: "Échouée",
};

const TRIGGER_LABELS: Record<DatabaseBackupDto["triggerType"], string> = {
  PLANIFIEE: "Planifiée",
  MANUELLE: "Manuelle",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Sauvegarde/restauration réelle de la base de données (MODULE-11 §1.1) — distincte de l'écran
 * "Sauvegarde des paramètres" (export/import de configuration uniquement, Module 2). `pg_dump`/
 * `pg_restore` côté serveur (`packages/api`), planifiée quotidienne + déclenchement manuel.
 */
export function DatabaseBackupScreen() {
  const utils = trpc.useUtils();
  const canCreate = useHasPermission("SAUVEGARDE_BDD:CREATION");
  const canModify = useHasPermission("SAUVEGARDE_BDD:MODIFICATION");
  const canRestore = useHasPermission("SAUVEGARDE_BDD:ADMINISTRATION");

  const backupsQuery = trpc.databaseBackup.list.useQuery();
  const settingsQuery = trpc.databaseBackup.getSettings.useQuery();

  const [isScheduleEnabled, setIsScheduleEnabled] = useState(true);
  const [scheduleHour, setScheduleHour] = useState("2");
  const [retentionCount, setRetentionCount] = useState("14");
  const [storageDirectory, setStorageDirectory] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<DatabaseBackupDto | null>(null);

  useEffect(() => {
    if (!settingsQuery.data) return;
    setIsScheduleEnabled(settingsQuery.data.isScheduleEnabled);
    setScheduleHour(settingsQuery.data.scheduleHour.toString());
    setRetentionCount(settingsQuery.data.retentionCount.toString());
    setStorageDirectory(settingsQuery.data.storageDirectory ?? "");
  }, [settingsQuery.data]);

  const updateSettings = trpc.databaseBackup.updateSettings.useMutation({
    onSuccess: () => void utils.databaseBackup.getSettings.invalidate(),
  });
  const triggerManual = trpc.databaseBackup.triggerManual.useMutation({
    onSuccess: () => void utils.databaseBackup.list.invalidate(),
  });

  const columns: DataTableColumn<DatabaseBackupDto>[] = [
    { key: "fileName", header: "Fichier", value: (b) => b.fileName },
    { key: "triggerType", header: "Déclenchement", value: (b) => TRIGGER_LABELS[b.triggerType] },
    {
      key: "status",
      header: "Statut",
      value: (b) => STATUS_LABELS[b.status],
      render: (b) => (
        <Badge
          variant={b.status === "REUSSIE" ? "success" : b.status === "ECHOUEE" ? "destructive" : "muted"}
          title={b.status === "ECHOUEE" ? (b.errorMessage ?? undefined) : undefined}
        >
          {STATUS_LABELS[b.status]}
        </Badge>
      ),
    },
    { key: "fileSizeBytes", header: "Taille", value: (b) => b.fileSizeBytes, render: (b) => formatSize(b.fileSizeBytes) },
    { key: "createdByName", header: "Déclenchée par", value: (b) => b.createdByName ?? "Automatique" },
    { key: "createdAt", header: "Date", value: (b) => b.createdAt.getTime(), render: (b) => b.createdAt.toLocaleString("fr-FR") },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Sauvegarde de la base de données</h2>
        {canCreate && (
          <Button disabled={triggerManual.isPending} onClick={() => triggerManual.mutate()}>
            {triggerManual.isPending ? "Sauvegarde en cours…" : "Sauvegarder maintenant"}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planification</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Checkbox checked={isScheduleEnabled} onChange={(e) => setIsScheduleEnabled(e.target.checked)} disabled={!canModify} />
            <Label>Sauvegarde automatique quotidienne</Label>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Heure (0-23)</Label>
              <Select value={scheduleHour} onChange={(e) => setScheduleHour(e.target.value)} disabled={!canModify}>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{h.toString().padStart(2, "0")}h00</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Nombre de sauvegardes conservées</Label>
              <Input type="number" min={1} max={365} value={retentionCount} onChange={(e) => setRetentionCount(e.target.value)} disabled={!canModify} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Dossier de stockage (vide = par défaut)</Label>
              <Input value={storageDirectory} onChange={(e) => setStorageDirectory(e.target.value)} disabled={!canModify} />
            </div>
          </div>
          {canModify && (
            <div className="flex justify-end">
              <Button
                disabled={updateSettings.isPending}
                onClick={() =>
                  updateSettings.mutate({
                    isScheduleEnabled,
                    scheduleHour: Number(scheduleHour),
                    retentionCount: Number(retentionCount),
                    storageDirectory: storageDirectory || null,
                  })
                }
              >
                {updateSettings.isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={backupsQuery.data ?? []}
        getRowId={(b) => b.id}
        exportFilename="sauvegardes-base-de-donnees"
        emptyMessage={backupsQuery.isLoading ? "Chargement…" : "Aucune sauvegarde."}
        rowActions={
          canRestore
            ? (b) =>
                b.status === "REUSSIE" ? (
                  <Button variant="destructive" onClick={() => setRestoreTarget(b)}>
                    Restaurer
                  </Button>
                ) : undefined
            : undefined
        }
      />

      {restoreTarget && <RestoreConfirmationDialog backup={restoreTarget} onClose={() => setRestoreTarget(null)} />}
    </div>
  );
}

const CONFIRMATION_PHRASE = "RESTAURER";

function RestoreConfirmationDialog({ backup, onClose }: { backup: DatabaseBackupDto; onClose: () => void }) {
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const restore = trpc.databaseBackup.restore.useMutation({ onSuccess: onClose });

  return (
    <Dialog open onClose={onClose} title="Restaurer une sauvegarde">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-destructive">
          Action irréversible : toutes les données actuelles de la base seront remplacées par le contenu de la
          sauvegarde <strong>{backup.fileName}</strong> du {backup.createdAt.toLocaleString("fr-FR")}. Aucun retour en arrière
          possible après confirmation.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label>
            Tapez exactement <strong>{CONFIRMATION_PHRASE}</strong> pour confirmer
          </Label>
          <Input value={confirmationPhrase} onChange={(e) => setConfirmationPhrase(e.target.value)} />
        </div>
        {restore.error && <p className="text-sm text-destructive">{restore.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            disabled={confirmationPhrase !== CONFIRMATION_PHRASE || restore.isPending}
            onClick={() => restore.mutate({ id: backup.id, confirmationPhrase })}
          >
            {restore.isPending ? "Restauration…" : "Restaurer définitivement"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
