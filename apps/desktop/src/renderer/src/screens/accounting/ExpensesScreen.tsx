import type { ExpenseDto } from "@isac-erp/shared";
import { Badge, Button, Label, Select, ServerDataTable, type ServerDataTableColumn } from "@isac-erp/ui";
import { useState } from "react";
import { formatTimestamp } from "../../lib/formatTimestamp";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { CreateExpenseDialog } from "./CreateExpenseDialog";
import { ExpenseDetailDialog } from "./ExpenseDetailDialog";

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  EN_ATTENTE_APPROBATION: "En attente",
  APPROUVEE: "Approuvée",
  REJETEE: "Rejetée",
  ANNULEE: "Annulée",
};

/** Dépenses (MODULE-07 §1.3/§8.4) — enregistrement, catégorisation, pièces justificatives, approbation. */
export function ExpensesScreen() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const canCreate = useHasPermission("DEPENSES:CREATION");
  const categoriesQuery = trpc.expenseCategories.list.useQuery();

  const query = trpc.expenses.list.useQuery({
    search: search || undefined,
    categoryId: categoryId || undefined,
    status: (status || undefined) as ExpenseDto["status"] | undefined,
    page,
    pageSize: 50,
  });

  const columns: ServerDataTableColumn<ExpenseDto>[] = [
    { key: "expenseNumber", header: "N°", value: (e) => e.expenseNumber, sortKey: "expenseNumber" },
    { key: "date", header: "Date", value: (e) => formatTimestamp(e.date), sortKey: "date" },
    { key: "label", header: "Libellé", value: (e) => e.label },
    { key: "categoryName", header: "Catégorie", value: (e) => e.categoryName },
    { key: "supplierName", header: "Fournisseur", value: (e) => e.supplierName ?? "—" },
    { key: "amount", header: "Montant", value: (e) => e.amount, render: (e) => e.amount.toLocaleString("fr-FR"), sortKey: "amount" },
    {
      key: "status",
      header: "Statut",
      value: (e) => STATUS_LABELS[e.status] ?? e.status,
      render: (e) => (
        <Badge variant={e.status === "APPROUVEE" ? "success" : e.status === "REJETEE" || e.status === "ANNULEE" ? "destructive" : "muted"}>
          {STATUS_LABELS[e.status] ?? e.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">{canCreate && <Button onClick={() => setCreateOpen(true)}>Nouvelle dépense</Button>}</div>

      <ServerDataTable
        columns={columns}
        rows={query.data?.items ?? []}
        getRowId={(e) => e.id}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={50}
        onPageChange={setPage}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="N°, libellé..."
        isLoading={query.isLoading}
        emptyMessage="Aucune dépense."
        columnStorageKey="expenses-table-columns"
        filters={
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Catégorie</Label>
              <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
                <option value="">Toutes</option>
                {(categoriesQuery.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Statut</Label>
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                <option value="">Tous</option>
                {Object.entries(STATUS_LABELS).map(([value, l]) => <option key={value} value={value}>{l}</option>)}
              </Select>
            </div>
          </div>
        }
        rowActions={(e) => (
          <Button variant="outline" onClick={() => setDetailId(e.id)}>
            Détails
          </Button>
        )}
      />

      {createOpen && <CreateExpenseDialog onClose={() => setCreateOpen(false)} />}
      {detailId && <ExpenseDetailDialog expenseId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}
