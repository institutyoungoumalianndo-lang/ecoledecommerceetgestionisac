import type { AuditLogEntry } from "@isac-erp/shared";
import { DataTable, type DataTableColumn } from "@isac-erp/ui";
import { formatTimestamp } from "../../lib/formatTimestamp";
import { trpc } from "../../lib/trpc";

/**
 * Historique de l'enseignant (MODULE-05 §1.5/§10.7) — vue filtrée du journal d'audit existant
 * (changements de statut/fonction, modifications administratives), pas de table dédiée. Les
 * affectations et formations restent consultables dans leurs propres onglets, jamais supprimées.
 */
export function TeacherHistoryTab({ teacherId }: { teacherId: string }) {
  const query = trpc.auditLog.list.useQuery({ module: "ENSEIGNANTS", page: 1, pageSize: 200 });
  const entries = (query.data?.entries ?? []).filter((e) => e.entityId === teacherId);

  const columns: DataTableColumn<AuditLogEntry>[] = [
    { key: "createdAt", header: "Date et heure", value: (e) => formatTimestamp(e.createdAt) },
    { key: "user", header: "Utilisateur", value: (e) => e.userDisplayName ?? e.usernameInput ?? "—" },
    { key: "action", header: "Action", value: (e) => e.action },
  ];

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        columns={columns}
        rows={entries}
        getRowId={(e) => e.id}
        exportFilename="historique-enseignant"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucune modification enregistrée."}
      />
    </div>
  );
}
