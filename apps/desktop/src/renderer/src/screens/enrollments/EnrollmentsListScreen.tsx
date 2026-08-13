import type { EnrollmentListRow } from "@isac-erp/shared";
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

const STATUS_LABELS: Record<string, string> = {
  NOUVEAU: "Nouveau",
  ANCIEN: "Ancien",
  REDOUBLANT: "Redoublant",
  TRANSFERT: "Transfert",
  REPRISE: "Reprise",
};

const PAYMENT_LABELS: Record<string, string> = {
  NON_PAYE: "Non payé",
  PARTIELLEMENT_PAYE: "Partiellement payé",
  TOTALEMENT_PAYE: "Totalement payé",
};

const EXPORT_COLUMNS = [
  { header: "Matricule", value: (r: EnrollmentListRow) => r.matricule },
  { header: "Nom", value: (r: EnrollmentListRow) => r.studentLastName },
  { header: "Prénom", value: (r: EnrollmentListRow) => r.studentFirstName },
  { header: "Année", value: (r: EnrollmentListRow) => r.academicYearLabel },
  { header: "Filière", value: (r: EnrollmentListRow) => r.filiereName },
  { header: "Niveau", value: (r: EnrollmentListRow) => r.levelLabel },
  { header: "Classe", value: (r: EnrollmentListRow) => r.className },
  { header: "N° inscription", value: (r: EnrollmentListRow) => r.registrationNumber ?? "" },
  { header: "Statut", value: (r: EnrollmentListRow) => STATUS_LABELS[r.status] ?? r.status },
  { header: "Paiement", value: (r: EnrollmentListRow) => (r.paymentStatus ? PAYMENT_LABELS[r.paymentStatus] ?? "" : "") },
];

export function EnrollmentsListScreen({ onOpenStudent }: { onOpenStudent: (studentId: string) => void }) {
  const [search, setSearch] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [filiereId, setFiliereId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [classId, setClassId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [page, setPage] = useState(1);

  const canExport = useHasPermission("INSCRIPTIONS:EXPORT");

  const yearsQuery = trpc.academicYears.list.useQuery();
  const filieresQuery = trpc.filieres.list.useQuery();
  const levelsQuery = trpc.levels.list.useQuery();
  const classesQuery = trpc.schoolClasses.list.useQuery({});

  const baseFilter = {
    search: search || undefined,
    academicYearId: academicYearId || undefined,
    filiereId: filiereId || undefined,
    levelId: levelId || undefined,
    classId: classId || undefined,
    paymentStatus: (paymentStatus || undefined) as "NON_PAYE" | "PARTIELLEMENT_PAYE" | "TOTALEMENT_PAYE" | undefined,
    includeCancelled,
  };

  const query = trpc.enrollments.list.useQuery({ ...baseFilter, page, pageSize: 50 });
  const exportQuery = trpc.enrollments.listForExport.useQuery(baseFilter, { enabled: false });

  async function handleExport(format: "csv" | "xlsx") {
    const result = await exportQuery.refetch();
    const rows = result.data ?? [];
    if (format === "csv") exportRowsToCsv(rows, EXPORT_COLUMNS, "inscriptions");
    else exportRowsToXlsx(rows, EXPORT_COLUMNS, "inscriptions");
  }

  const columns: ServerDataTableColumn<EnrollmentListRow>[] = [
    { key: "matricule", header: "Matricule", value: (r) => r.matricule, sortKey: "matricule" },
    { key: "nom", header: "Étudiant", value: (r) => `${r.studentLastName} ${r.studentFirstName}`, sortKey: "studentLastName" },
    { key: "annee", header: "Année", value: (r) => r.academicYearLabel },
    { key: "filiere", header: "Filière", value: (r) => r.filiereName },
    { key: "classe", header: "Classe", value: (r) => r.className },
    { key: "numero", header: "N° inscription", value: (r) => r.registrationNumber ?? "—", defaultVisible: false },
    { key: "statut", header: "Statut", value: (r) => STATUS_LABELS[r.status] ?? r.status },
    {
      key: "paiement",
      header: "Paiement",
      value: (r) => (r.paymentStatus ? PAYMENT_LABELS[r.paymentStatus] ?? "—" : "—"),
      render: (r) =>
        r.paymentStatus ? (
          <Badge variant={r.paymentStatus === "TOTALEMENT_PAYE" ? "success" : "muted"}>
            {PAYMENT_LABELS[r.paymentStatus] ?? r.paymentStatus}
          </Badge>
        ) : (
          "—"
        ),
    },
    {
      key: "cancelled",
      header: "État",
      value: (r) => (r.isCancelled ? "Annulée" : "Active"),
      render: (r) => <Badge variant={r.isCancelled ? "destructive" : "success"}>{r.isCancelled ? "Annulée" : "Active"}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card variant="static" className="grid grid-cols-2 gap-3 p-4 md:grid-cols-5">
        <div className="flex flex-col gap-1.5">
          <Label>Année universitaire</Label>
          <Select value={academicYearId} onChange={(e) => { setAcademicYearId(e.target.value); setPage(1); }}>
            <option value="">Toutes</option>
            {(yearsQuery.data ?? []).map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Filière</Label>
          <Select value={filiereId} onChange={(e) => { setFiliereId(e.target.value); setPage(1); }}>
            <option value="">Toutes</option>
            {(filieresQuery.data ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Niveau</Label>
          <Select value={levelId} onChange={(e) => { setLevelId(e.target.value); setPage(1); }}>
            <option value="">Tous</option>
            {(levelsQuery.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Classe</Label>
          <Select value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }}>
            <option value="">Toutes</option>
            {(classesQuery.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Statut de paiement</Label>
          <Select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}>
            <option value="">Tous</option>
            {Object.entries(PAYMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </div>
        <div className="col-span-2 flex items-end gap-2 pb-2 md:col-span-1">
          <Checkbox checked={includeCancelled} onChange={(e) => { setIncludeCancelled(e.target.checked); setPage(1); }} />
          <Label>Inclure les annulées</Label>
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
        searchPlaceholder="Matricule, nom, N° d'inscription..."
        isLoading={query.isLoading}
        emptyMessage="Aucune inscription."
        columnStorageKey="enrollments-table-columns"
        onExportCsv={canExport ? () => void handleExport("csv") : undefined}
        onExportExcel={canExport ? () => void handleExport("xlsx") : undefined}
        rowActions={(r) => (
          <Button variant="outline" onClick={() => onOpenStudent(r.studentId)}>
            Ouvrir l'étudiant
          </Button>
        )}
      />
    </div>
  );
}
