"use client";

import type { AcademicYearDto, FiliereDto, LevelDto, SchoolClassDto, StudentListRow } from "@isac-erp/shared";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Label,
  Select,
  ServerDataTable,
  type ServerDataTableColumn,
} from "@isac-erp/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { trpcClient } from "../../../../lib/trpc";

type SortBy = "lastName" | "firstName" | "matricule";

/**
 * Annuaire des étudiants côté portail Super Administrateur (MODULE-15 §4 phase "accès complet") —
 * réutilise directement `students.list` (déjà `permissionProcedure`, contourné par le rôle Super
 * Admin) et le même modèle de colonnes que `StudentsListScreen.tsx` du desktop.
 */
export default function AdminStudentsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<StudentListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [filieres, setFilieres] = useState<FiliereDto[]>([]);
  const [levels, setLevels] = useState<LevelDto[]>([]);
  const [classes, setClasses] = useState<SchoolClassDto[]>([]);
  const [years, setYears] = useState<AcademicYearDto[]>([]);

  const [search, setSearch] = useState("");
  const [filiereId, setFiliereId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [classId, setClassId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortBy>("lastName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    trpcClient.filieres.list.query().then(setFilieres).catch(() => setFilieres([]));
    trpcClient.levels.list.query().then(setLevels).catch(() => setLevels([]));
    trpcClient.schoolClasses.list.query({}).then(setClasses).catch(() => setClasses([]));
    trpcClient.academicYears.list.query().then(setYears).catch(() => setYears([]));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    trpcClient.students.list
      .query({
        search: search || undefined,
        filiereId: filiereId || undefined,
        levelId: levelId || undefined,
        classId: classId || undefined,
        academicYearId: academicYearId || undefined,
        includeArchived,
        sortBy,
        sortDirection,
        page,
        pageSize: 50,
      })
      .then((result) => {
        setRows(result.rows);
        setTotal(result.total);
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement des étudiants."))
      .finally(() => setIsLoading(false));
  }, [search, filiereId, levelId, classId, academicYearId, includeArchived, sortBy, sortDirection, page]);

  const columns: ServerDataTableColumn<StudentListRow>[] = [
    { key: "matricule", header: "Matricule", value: (r) => r.matricule, sortKey: "matricule" },
    { key: "ina", header: "INA", value: (r) => r.ina ?? "—" },
    { key: "lastName", header: "Nom", value: (r) => r.lastName, sortKey: "lastName" },
    { key: "firstName", header: "Prénom", value: (r) => r.firstName, sortKey: "firstName" },
    { key: "gender", header: "Sexe", value: (r) => r.gender },
    { key: "phone", header: "Téléphone", value: (r) => r.phonePrimary ?? "—" },
    { key: "filiere", header: "Filière", value: (r) => r.currentFiliereName ?? "—" },
    { key: "classe", header: "Classe", value: (r) => r.currentClassName ?? "—" },
    { key: "annee", header: "Année", value: (r) => r.currentAcademicYearLabel ?? "—", defaultVisible: false },
    {
      key: "statut",
      header: "Statut",
      value: (r) => (r.isArchived ? "Archivé" : "Actif"),
      render: (r) => <Badge variant={r.isArchived ? "muted" : "success"}>{r.isArchived ? "Archivé" : "Actif"}</Badge>,
    },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Étudiants</h1>
        <Button onClick={() => router.push("/admin/etudiants/nouveau")}>Nouvel étudiant</Button>
      </div>

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      <Card variant="static" className="grid grid-cols-2 gap-3 p-4 md:grid-cols-5">
        <div className="flex flex-col gap-1.5">
          <Label>Filière</Label>
          <Select value={filiereId} onChange={(e) => { setFiliereId(e.target.value); setPage(1); }}>
            <option value="">Toutes</option>
            {filieres.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Niveau</Label>
          <Select value={levelId} onChange={(e) => { setLevelId(e.target.value); setPage(1); }}>
            <option value="">Tous</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Classe</Label>
          <Select value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }}>
            <option value="">Toutes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Année universitaire</Label>
          <Select value={academicYearId} onChange={(e) => { setAcademicYearId(e.target.value); setPage(1); }}>
            <option value="">Toutes</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>{y.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex items-end gap-2 pb-2">
          <Checkbox checked={includeArchived} onChange={(e) => { setIncludeArchived(e.target.checked); setPage(1); }} />
          <Label>Afficher les archivés</Label>
        </div>
      </Card>

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        total={total}
        page={page}
        pageSize={50}
        onPageChange={setPage}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Matricule, INA, nom, téléphone, email..."
        sortKey={sortBy}
        sortDirection={sortDirection}
        onSortChange={(key) => {
          setSortBy(key as SortBy);
          setSortDirection((prev) => (sortBy === key && prev === "asc" ? "desc" : "asc"));
        }}
        isLoading={isLoading}
        emptyMessage="Aucun étudiant."
        columnStorageKey="portal-admin-students-table-columns"
        rowActions={(r) => (
          <Button variant="outline" onClick={() => router.push(`/admin/etudiants/${r.id}`)}>
            Ouvrir
          </Button>
        )}
      />
    </div>
  );
}
