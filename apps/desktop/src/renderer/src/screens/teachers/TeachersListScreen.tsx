import type { TeacherListRow } from "@isac-erp/shared";
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
  { header: "Matricule", value: (r: TeacherListRow) => r.matricule },
  { header: "Nom", value: (r: TeacherListRow) => r.lastName },
  { header: "Prénom", value: (r: TeacherListRow) => r.firstName },
  { header: "Sexe", value: (r: TeacherListRow) => r.gender },
  { header: "Téléphone", value: (r: TeacherListRow) => r.phonePrimary ?? "" },
  { header: "Email", value: (r: TeacherListRow) => r.email ?? "" },
  { header: "Spécialité", value: (r: TeacherListRow) => r.specialty ?? "" },
  { header: "Statut", value: (r: TeacherListRow) => r.statusLabel ?? "" },
];

export function TeachersListScreen({
  onCreate,
  onOpenTeacher,
}: {
  onCreate: () => void;
  onOpenTeacher: (teacherId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusId, setStatusId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [filiereId, setFiliereId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"lastName" | "firstName" | "matricule">("lastName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const canCreate = useHasPermission("ENSEIGNANTS:CREATION");
  const canExport = useHasPermission("ENSEIGNANTS:EXPORT");

  const statusesQuery = trpc.teacherStatuses.list.useQuery();
  const subjectsQuery = trpc.subjects.list.useQuery({});
  const filieresQuery = trpc.filieres.list.useQuery();
  const levelsQuery = trpc.levels.list.useQuery();

  const baseFilter = {
    search: search || undefined,
    statusId: statusId || undefined,
    subjectId: subjectId || undefined,
    filiereId: filiereId || undefined,
    levelId: levelId || undefined,
    includeArchived,
    sortBy,
    sortDirection,
  };

  const query = trpc.teachers.list.useQuery({ ...baseFilter, page, pageSize: 50 });
  const exportQuery = trpc.teachers.listForExport.useQuery(baseFilter, { enabled: false });

  async function handleExport(format: "csv" | "xlsx") {
    const result = await exportQuery.refetch();
    const rows = result.data ?? [];
    if (format === "csv") exportRowsToCsv(rows, EXPORT_COLUMNS, "enseignants");
    else exportRowsToXlsx(rows, EXPORT_COLUMNS, "enseignants");
  }

  const columns: ServerDataTableColumn<TeacherListRow>[] = [
    { key: "matricule", header: "Matricule", value: (r) => r.matricule, sortKey: "matricule" },
    { key: "lastName", header: "Nom", value: (r) => r.lastName, sortKey: "lastName" },
    { key: "firstName", header: "Prénom", value: (r) => r.firstName, sortKey: "firstName" },
    { key: "gender", header: "Sexe", value: (r) => r.gender },
    { key: "phone", header: "Téléphone", value: (r) => r.phonePrimary ?? "—" },
    { key: "specialty", header: "Spécialité", value: (r) => r.specialty ?? "—" },
    {
      key: "statut",
      header: "Statut",
      value: (r) => (r.isArchived ? "Archivé" : r.statusLabel ?? "—"),
      render: (r) =>
        r.isArchived ? (
          <Badge variant="muted">Archivé</Badge>
        ) : (
          <Badge variant="success">{r.statusLabel ?? "—"}</Badge>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Enseignants</h2>
        {canCreate && <Button onClick={onCreate}>Nouvel enseignant</Button>}
      </div>

      <Card variant="static" className="grid grid-cols-2 gap-3 p-4 md:grid-cols-5">
        <div className="flex flex-col gap-1.5">
          <Label>Statut</Label>
          <Select value={statusId} onChange={(e) => { setStatusId(e.target.value); setPage(1); }}>
            <option value="">Tous</option>
            {(statusesQuery.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Matière</Label>
          <Select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setPage(1); }}>
            <option value="">Toutes</option>
            {(subjectsQuery.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Filière</Label>
          <Select value={filiereId} onChange={(e) => { setFiliereId(e.target.value); setPage(1); }}>
            <option value="">Toutes</option>
            {(filieresQuery.data ?? []).map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Niveau</Label>
          <Select value={levelId} onChange={(e) => { setLevelId(e.target.value); setPage(1); }}>
            <option value="">Tous</option>
            {(levelsQuery.data ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
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
        searchPlaceholder="Matricule, nom, téléphone, email, spécialité..."
        sortKey={sortBy}
        sortDirection={sortDirection}
        onSortChange={(key) => {
          setSortBy(key as typeof sortBy);
          setSortDirection((prev) => (sortBy === key && prev === "asc" ? "desc" : "asc"));
        }}
        isLoading={query.isLoading}
        emptyMessage="Aucun enseignant."
        columnStorageKey="teachers-table-columns"
        onExportCsv={canExport ? () => void handleExport("csv") : undefined}
        onExportExcel={canExport ? () => void handleExport("xlsx") : undefined}
        rowActions={(r) => (
          <Button variant="outline" onClick={() => onOpenTeacher(r.id)}>
            Ouvrir
          </Button>
        )}
      />
    </div>
  );
}
