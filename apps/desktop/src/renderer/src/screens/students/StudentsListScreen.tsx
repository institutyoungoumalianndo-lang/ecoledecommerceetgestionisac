import type { StudentInaExportRow, StudentListRow } from "@isac-erp/shared";
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
import { EnrollmentFormDialog } from "../enrollments/EnrollmentFormDialog";

const EXPORT_COLUMNS = [
  { header: "Matricule", value: (r: StudentListRow) => r.matricule },
  { header: "INA", value: (r: StudentListRow) => r.ina ?? "" },
  { header: "Nom", value: (r: StudentListRow) => r.lastName },
  { header: "Prénom", value: (r: StudentListRow) => r.firstName },
  { header: "Sexe", value: (r: StudentListRow) => r.gender },
  { header: "Téléphone", value: (r: StudentListRow) => r.phonePrimary ?? "" },
  { header: "Email", value: (r: StudentListRow) => r.email ?? "" },
  { header: "Filière", value: (r: StudentListRow) => r.currentFiliereName ?? "" },
  { header: "Niveau", value: (r: StudentListRow) => r.currentLevelLabel ?? "" },
  { header: "Classe", value: (r: StudentListRow) => r.currentClassName ?? "" },
  { header: "Année", value: (r: StudentListRow) => r.currentAcademicYearLabel ?? "" },
];

function formatDate(date: Date | string | null): string {
  return date ? new Date(date).toLocaleDateString("fr-FR") : "";
}

function getInitials(lastName: string, firstName: string): string {
  return `${lastName.charAt(0)}${firstName.charAt(0)}`.toUpperCase();
}

/**
 * Canevas national INA (2026-08-03, retour du porteur du projet) — gabarit externe à colonnes
 * fixes. Institution/Région/E-mail sont des valeurs par défaut (pas des champs par étudiant) :
 * Région toujours "Kindia", Institution et E-mail toujours ceux de l'établissement (Paramètres).
 */
function buildInaExportColumns(establishmentName: string, establishmentEmail: string) {
  return [
    { header: "INA", value: (r: StudentInaExportRow) => r.ina ?? "" },
    { header: "NOM", value: (r: StudentInaExportRow) => r.lastName },
    { header: "PRENOM", value: (r: StudentInaExportRow) => r.firstName },
    { header: "SEXE", value: (r: StudentInaExportRow) => (r.gender === "M" ? "Masculin" : "Féminin") },
    { header: "DATE DE NAISSANCE", value: (r: StudentInaExportRow) => formatDate(r.birthDate) },
    { header: "LIEU DE NAISSANCE", value: (r: StudentInaExportRow) => r.birthPlace ?? "" },
    { header: "NOM DU PERE", value: (r: StudentInaExportRow) => r.fatherName ?? "" },
    { header: "NOM DE LA MERE", value: (r: StudentInaExportRow) => r.motherName ?? "" },
    { header: "INSTITUTION", value: () => establishmentName },
    { header: "PROGRAMME", value: (r: StudentInaExportRow) => r.programme ?? "" },
    { header: "FILIERE", value: (r: StudentInaExportRow) => r.filiereName ?? "" },
    { header: "REGION", value: () => "Kindia" },
    { header: "EMAIL", value: () => establishmentEmail },
  ];
}

export function StudentsListScreen({
  onCreate,
  onOpenStudent,
  onImport,
}: {
  onCreate: () => void;
  onOpenStudent: (studentId: string) => void;
  onImport: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filiereId, setFiliereId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [classId, setClassId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"lastName" | "firstName" | "matricule">("lastName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [reenrollOpen, setReenrollOpen] = useState(false);

  const canCreate = useHasPermission("ETUDIANTS:CREATION");
  const canImport = useHasPermission("ETUDIANTS_IMPORT:CREATION");
  const canExport = useHasPermission("ETUDIANTS:EXPORT");
  const canReenroll = useHasPermission("INSCRIPTIONS:CREATION");

  const filieresQuery = trpc.filieres.list.useQuery();
  const levelsQuery = trpc.levels.list.useQuery();
  const classesQuery = trpc.schoolClasses.list.useQuery({});
  const yearsQuery = trpc.academicYears.list.useQuery();
  const activeYear = yearsQuery.data?.find((y) => y.isActive);

  const baseFilter = {
    search: search || undefined,
    filiereId: filiereId || undefined,
    levelId: levelId || undefined,
    classId: classId || undefined,
    academicYearId: academicYearId || undefined,
    includeArchived,
    sortBy,
    sortDirection,
  };

  const query = trpc.students.list.useQuery({ ...baseFilter, page, pageSize: 50 });
  // Cartes "Réinscrits"/"À réinscrire" (2026-08-09, retour du porteur du projet — habillage visuel de
  // cet écran) : la 2e requête ne sert qu'à compter (pageSize minimal), pas à afficher des lignes —
  // réutilise le filtre `needsReenrollmentForYearId` déjà construit pour le bouton "Réinscription".
  const reenrollmentCountQuery = trpc.students.list.useQuery(
    { ...baseFilter, needsReenrollmentForYearId: activeYear?.id, page: 1, pageSize: 10 },
    { enabled: Boolean(activeYear) }
  );
  const needsReenrollmentCount = reenrollmentCountQuery.data?.total ?? 0;
  const reenrolledCount = Math.max(0, (query.data?.total ?? 0) - needsReenrollmentCount);
  const exportQuery = trpc.students.listForExport.useQuery(baseFilter, { enabled: false });
  const inaExportQuery = trpc.students.listForInaExport.useQuery(baseFilter, { enabled: false });
  const establishmentQuery = trpc.establishment.get.useQuery();

  async function handleExport(format: "csv" | "xlsx") {
    const result = await exportQuery.refetch();
    const rows = result.data ?? [];
    if (format === "csv") exportRowsToCsv(rows, EXPORT_COLUMNS, "etudiants");
    else exportRowsToXlsx(rows, EXPORT_COLUMNS, "etudiants");
  }

  async function handleInaExport() {
    const result = await inaExportQuery.refetch();
    const rows = result.data ?? [];
    const establishment = establishmentQuery.data;
    const columns = buildInaExportColumns(
      establishment?.officialName ?? "",
      establishment?.primaryEmail ?? ""
    );
    exportRowsToXlsx(rows, columns, "canevas-ina");
  }

  const columns: ServerDataTableColumn<StudentListRow>[] = [
    {
      key: "etudiant",
      header: "Étudiant",
      value: (r) => `${r.lastName} ${r.firstName} (${r.matricule})`,
      sortKey: "lastName",
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-button text-sm font-medium text-button-foreground">
            {getInitials(r.lastName, r.firstName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {r.lastName} {r.firstName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {r.matricule}
              {r.ina ? ` · INA ${r.ina}` : ""}
              {r.phonePrimary ? ` · ${r.phonePrimary}` : ""}
              {" · "}
              {r.gender}
            </p>
          </div>
        </div>
      ),
    },
    { key: "filiere", header: "Filière", value: (r) => r.currentFiliereName ?? "—" },
    { key: "classe", header: "Classe", value: (r) => r.currentClassName ?? "—" },
    { key: "annee", header: "Année", value: (r) => r.currentAcademicYearLabel ?? "—", defaultVisible: false },
    {
      key: "statut",
      header: "Statut",
      value: (r) => (r.isArchived ? "Archivé" : "Actif"),
      render: (r) => <Badge variant={r.isArchived ? "muted" : "success"}>{r.isArchived ? "Archivé" : "Actif"}</Badge>,
    },
    {
      key: "reinscription",
      header: "Réinscription",
      value: (r) => (r.isReenrolledActiveYear ? "Réinscrit" : "À réinscrire"),
      render: (r) =>
        r.isArchived ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <Badge variant={r.isReenrolledActiveYear ? "success" : "warning"}>
            {r.isReenrolledActiveYear ? "Réinscrit" : "À réinscrire"}
          </Badge>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-gradient-to-br from-button to-button/75 p-4 shadow-[0_10px_26px_-8px_hsl(var(--button)/0.55),inset_0_1px_0_hsl(var(--button-foreground)/0.15)]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-button-foreground">Étudiants</h2>
          <div className="flex gap-2">
            {canExport && (
              <Button
                variant="success"
                disabled={inaExportQuery.isFetching}
                className="border-none bg-gradient-to-b from-success to-success/80 shadow-[0_4px_10px_-3px_hsl(var(--success)/0.6),inset_0_1px_0_hsl(var(--success-foreground)/0.25)] hover:shadow-[0_6px_14px_-3px_hsl(var(--success)/0.7),inset_0_1px_0_hsl(var(--success-foreground)/0.25)]"
                onClick={() => void handleInaExport()}
              >
                {inaExportQuery.isFetching ? "Export…" : "Exporter (canevas INA)"}
              </Button>
            )}
            {canImport && (
              <Button
                variant="destructive"
                className="border-none bg-gradient-to-b from-destructive to-destructive/80 shadow-[0_4px_10px_-3px_hsl(var(--destructive)/0.6),inset_0_1px_0_hsl(var(--destructive-foreground)/0.25)] hover:shadow-[0_6px_14px_-3px_hsl(var(--destructive)/0.7),inset_0_1px_0_hsl(var(--destructive-foreground)/0.25)]"
                onClick={onImport}
              >
                Importer
              </Button>
            )}
            {canReenroll && (
              <Button
                className="border-2 border-success bg-white text-success shadow-[0_3px_8px_-2px_rgba(0,0,0,0.35)] hover:bg-success/10"
                onClick={() => setReenrollOpen(true)}
              >
                Réinscription
              </Button>
            )}
            {canCreate && (
              <Button
                onClick={onCreate}
                className="border-none bg-gradient-to-b from-sky-400 to-sky-600 text-white shadow-[0_6px_14px_-4px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.35)] hover:shadow-[0_8px_18px_-4px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.35)]"
              >
                Nouvel étudiant
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:w-1/2">
          <div className="rounded-lg border-none bg-gradient-to-b from-success to-success/80 p-3 shadow-[0_4px_10px_-3px_hsl(var(--success)/0.6),inset_0_1px_0_hsl(var(--success-foreground)/0.25)]">
            <p className="text-sm font-bold text-success-foreground">Réinscrits ({activeYear?.label ?? "—"})</p>
            <p className="text-2xl font-bold text-success-foreground">{reenrolledCount}</p>
          </div>
          <div className="rounded-lg border-none bg-gradient-to-b from-warning to-warning/80 p-3 shadow-[0_4px_10px_-3px_hsl(var(--warning)/0.6),inset_0_1px_0_hsl(var(--warning-foreground)/0.25)]">
            <p className="text-sm font-bold text-warning-foreground">À réinscrire</p>
            <p className="text-2xl font-bold text-warning-foreground">{needsReenrollmentCount}</p>
          </div>
        </div>
      </div>

      <Card
        variant="static"
        className="grid grid-cols-2 gap-3 border-2 border-button/35 p-4 shadow-[0_2px_8px_-2px_hsl(var(--button)/0.15)] md:grid-cols-5"
      >
        <div className="flex flex-col gap-1.5">
          <Label>Filière</Label>
          <Select
            className="border-2 border-button/30 focus-visible:ring-button"
            value={filiereId}
            onChange={(e) => { setFiliereId(e.target.value); setPage(1); }}
          >
            <option value="">Toutes</option>
            {(filieresQuery.data ?? []).map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Niveau</Label>
          <Select
            className="border-2 border-button/30 focus-visible:ring-button"
            value={levelId}
            onChange={(e) => { setLevelId(e.target.value); setPage(1); }}
          >
            <option value="">Tous</option>
            {(levelsQuery.data ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Classe</Label>
          <Select
            className="border-2 border-button/30 focus-visible:ring-button"
            value={classId}
            onChange={(e) => { setClassId(e.target.value); setPage(1); }}
          >
            <option value="">Toutes</option>
            {(classesQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Année universitaire</Label>
          <Select
            className="border-2 border-button/30 focus-visible:ring-button"
            value={academicYearId}
            onChange={(e) => { setAcademicYearId(e.target.value); setPage(1); }}
          >
            <option value="">Toutes</option>
            {(yearsQuery.data ?? []).map((y) => (
              <option key={y.id} value={y.id}>{y.label}</option>
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
        searchPlaceholder="Matricule, INA, nom, téléphone, email..."
        sortKey={sortBy}
        sortDirection={sortDirection}
        onSortChange={(key) => {
          setSortBy(key as typeof sortBy);
          setSortDirection((prev) => (sortBy === key && prev === "asc" ? "desc" : "asc"));
        }}
        isLoading={query.isLoading}
        emptyMessage="Aucun étudiant."
        columnStorageKey="students-table-columns"
        onExportCsv={canExport ? () => void handleExport("csv") : undefined}
        onExportExcel={canExport ? () => void handleExport("xlsx") : undefined}
        rowActions={(r) => (
          <Button variant="outline" onClick={() => onOpenStudent(r.id)}>
            Ouvrir
          </Button>
        )}
      />

      {reenrollOpen && (
        <EnrollmentFormDialog scopeSearchToYearId={activeYear?.id} onClose={() => setReenrollOpen(false)} />
      )}
    </div>
  );
}
