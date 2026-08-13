import type { AuditLogEntry } from "@isac-erp/shared";
import { DataTable, type DataTableColumn } from "@isac-erp/ui";
import { formatTimestamp } from "../../lib/formatTimestamp";
import { trpc } from "../../lib/trpc";

/** Historique des tarifs (MODULE-04.2 §1.6) — vue filtrée du journal d'audit existant, pas de table dédiée. */
export function FeeTariffHistoryScreen() {
  const query = trpc.auditLog.list.useQuery({ module: "FRAIS", page: 1, pageSize: 200 });

  const columns: DataTableColumn<AuditLogEntry>[] = [
    { key: "createdAt", header: "Date et heure", value: (e) => formatTimestamp(e.createdAt) },
    { key: "user", header: "Utilisateur", value: (e) => e.userDisplayName ?? e.usernameInput ?? "—" },
    { key: "action", header: "Action", value: (e) => e.action },
    {
      key: "details",
      header: "Détails",
      value: (e) => (e.details ? JSON.stringify(e.details) : ""),
      render: (e) => {
        const d = e.details as { before?: { amount?: number }; after?: { amount?: number }; justification?: string } | null;
        if (!d) return "—";
        return (
          <span className="text-sm">
            {d.before?.amount !== undefined && d.after?.amount !== undefined && (
              <>
                {d.before.amount} → <strong>{d.after.amount}</strong>
                {d.justification && ` — ${d.justification}`}
              </>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Historique des tarifs</h2>
      <DataTable
        columns={columns}
        rows={query.data?.entries ?? []}
        getRowId={(e) => e.id}
        exportFilename="historique-tarifs"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucune modification enregistrée."}
      />
    </div>
  );
}
