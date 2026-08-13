import type { EmployeeListRow } from "@isac-erp/shared";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Label,
  Select,
  ServerDataTable,
  type ServerDataTableColumn,
  exportRowsToCsv,
  exportRowsToXlsx,
} from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const EXPORT_COLUMNS = [
  { header: "Matricule", value: (r: EmployeeListRow) => r.matricule },
  { header: "Nom", value: (r: EmployeeListRow) => r.lastName ?? "" },
  { header: "Prénom", value: (r: EmployeeListRow) => r.firstName ?? "" },
  { header: "Catégorie", value: (r: EmployeeListRow) => r.categoryLabel },
  { header: "Mode de rémunération", value: (r: EmployeeListRow) => r.salaryMode },
];

export function EmployeesListScreen({
  onCreate,
  onOpenEmployee,
}: {
  onCreate: () => void;
  onOpenEmployee: (employeeId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"lastName" | "firstName" | "matricule">("lastName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const canCreate = useHasPermission("PAIE_EMPLOYES:CREATION");
  const canExport = useHasPermission("PAIE_EMPLOYES:EXPORT");

  const categoriesQuery = trpc.employeeCategories.list.useQuery();

  const baseFilter = {
    search: search || undefined,
    categoryId: categoryId || undefined,
    includeArchived,
    sortBy,
    sortDirection,
  };

  const query = trpc.employees.list.useQuery({ ...baseFilter, page, pageSize: 50 });
  const exportQuery = trpc.employees.listForExport.useQuery(baseFilter, { enabled: false });

  async function handleExport(format: "csv" | "xlsx") {
    const result = await exportQuery.refetch();
    const rows = result.data ?? [];
    if (format === "csv") exportRowsToCsv(rows, EXPORT_COLUMNS, "employes");
    else exportRowsToXlsx(rows, EXPORT_COLUMNS, "employes");
  }

  const columns: ServerDataTableColumn<EmployeeListRow>[] = [
    { key: "matricule", header: "Matricule", value: (r) => r.matricule, sortKey: "matricule" },
    { key: "lastName", header: "Nom", value: (r) => r.lastName ?? "—", sortKey: "lastName" },
    { key: "firstName", header: "Prénom", value: (r) => r.firstName ?? "—", sortKey: "firstName" },
    { key: "category", header: "Catégorie", value: (r) => r.categoryLabel },
    {
      key: "teacher",
      header: "Lié à un enseignant",
      value: (r) => (r.isLinkedToTeacher ? "Oui" : "Non"),
      render: (r) => <Badge variant={r.isLinkedToTeacher ? "success" : "muted"}>{r.isLinkedToTeacher ? "Oui" : "Non"}</Badge>,
    },
    { key: "salaryMode", header: "Mode", value: (r) => r.salaryMode },
    {
      key: "statut",
      header: "Statut",
      value: (r) => (r.isArchived ? "Archivé" : "Actif"),
      render: (r) => <Badge variant={r.isArchived ? "muted" : "success"}>{r.isArchived ? "Archivé" : "Actif"}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Employés</h2>
        {canCreate && <Button onClick={onCreate}>Nouvel employé</Button>}
      </div>

      <Card variant="static" className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label>Catégorie</Label>
          <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
            <option value="">Toutes</option>
            {(categoriesQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex items-end gap-2 pb-2">
          <Checkbox
            checked={includeArchived}
            onChange={(e) => { setIncludeArchived(e.target.checked); setPage(1); }}
          />
          <Label>Afficher les archivés</Label>
        </div>
      </Card>

      <ServerDataTable
        columns={columns}
        rows={query.data?.rows ?? []}
        getRowId={(r) => r.id}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={50}
        onPageChange={setPage}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Matricule, nom..."
        sortKey={sortBy}
        sortDirection={sortDirection}
        onSortChange={(key) => {
          setSortBy(key as typeof sortBy);
          setSortDirection((prev) => (sortBy === key && prev === "asc" ? "desc" : "asc"));
        }}
        isLoading={query.isLoading}
        emptyMessage="Aucun employé."
        columnStorageKey="employees-table-columns"
        onExportCsv={canExport ? () => void handleExport("csv") : undefined}
        onExportExcel={canExport ? () => void handleExport("xlsx") : undefined}
        rowActions={(r) => (
          <Button variant="outline" onClick={() => onOpenEmployee(r.id)}>
            Ouvrir
          </Button>
        )}
      />
    </div>
  );
}
