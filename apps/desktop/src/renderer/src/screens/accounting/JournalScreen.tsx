import type { JournalEntryDto } from "@isac-erp/shared";
import { Badge, Button, Label, Select, ServerDataTable, type ServerDataTableColumn } from "@isac-erp/ui";
import { useState } from "react";
import { formatTimestamp } from "../../lib/formatTimestamp";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { CancelJournalEntryDialog } from "./CancelJournalEntryDialog";
import { CreateJournalEntryDialog } from "./CreateJournalEntryDialog";
import { PeriodLockPanel } from "./PeriodLockPanel";

/** Journal comptable (MODULE-07 §1.2/§1.3/§8.3) — écritures générées automatiquement depuis les Modules 4.2/4.3, ou manuelles. */
export function JournalScreen() {
  const [search, setSearch] = useState("");
  const [sourceModule, setSourceModule] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<JournalEntryDto | null>(null);

  const canCreate = useHasPermission("ECRITURES:CREATION");
  const canCancel = useHasPermission("ECRITURES:SUPPRESSION");

  const query = trpc.journalEntries.list.useQuery({
    search: search || undefined,
    sourceModule: sourceModule || undefined,
    status: (status || undefined) as "VALIDEE" | "ANNULEE" | undefined,
    page,
    pageSize: 50,
  });

  const columns: ServerDataTableColumn<JournalEntryDto>[] = [
    { key: "entryNumber", header: "N° écriture", value: (e) => e.entryNumber, sortKey: "entryNumber" },
    { key: "entryDate", header: "Date", value: (e) => formatTimestamp(e.entryDate), sortKey: "entryDate" },
    { key: "label", header: "Libellé", value: (e) => e.label },
    { key: "sourceModule", header: "Origine", value: (e) => e.sourceModule },
    { key: "totalDebit", header: "Montant", value: (e) => e.totalDebit, render: (e) => e.totalDebit.toLocaleString("fr-FR") },
    {
      key: "status",
      header: "Statut",
      value: (e) => e.status,
      render: (e) => (e.status === "VALIDEE" ? <Badge variant="success">Validée</Badge> : <Badge variant="destructive">Annulée</Badge>),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PeriodLockPanel />

      <div className="flex justify-end">{canCreate && <Button onClick={() => setCreateOpen(true)}>Nouvelle écriture manuelle</Button>}</div>

      <ServerDataTable
        columns={columns}
        rows={query.data?.items ?? []}
        getRowId={(e) => e.id}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={50}
        onPageChange={setPage}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="N° d'écriture, libellé..."
        isLoading={query.isLoading}
        emptyMessage="Aucune écriture."
        columnStorageKey="journal-entries-table-columns"
        filters={
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Origine</Label>
              <Select value={sourceModule} onChange={(e) => { setSourceModule(e.target.value); setPage(1); }}>
                <option value="">Toutes</option>
                <option value="PAIEMENTS">Paiements</option>
                <option value="DEPENSES">Dépenses</option>
                <option value="MANUEL">Manuel</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Statut</Label>
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                <option value="">Tous</option>
                <option value="VALIDEE">Validée</option>
                <option value="ANNULEE">Annulée</option>
              </Select>
            </div>
          </div>
        }
        rowActions={(e) =>
          canCancel && e.status === "VALIDEE" ? (
            <Button variant="destructive" onClick={() => setCancelTarget(e)}>
              Annuler
            </Button>
          ) : undefined
        }
      />

      {createOpen && <CreateJournalEntryDialog onClose={() => setCreateOpen(false)} />}
      {cancelTarget && (
        <CancelJournalEntryDialog entryId={cancelTarget.id} entryNumber={cancelTarget.entryNumber} onClose={() => setCancelTarget(null)} />
      )}
    </div>
  );
}
