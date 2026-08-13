"use client";

import type { TeacherContractTypeDto, TeacherListRow, TeacherStatusDto } from "@isac-erp/shared";
import { Badge, Button, Card, Checkbox, Label, Select, ServerDataTable, type ServerDataTableColumn } from "@isac-erp/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { trpcClient } from "../../../../lib/trpc";

type SortBy = "lastName" | "firstName" | "matricule";

/**
 * Annuaire des enseignants côté portail Super Administrateur (MODULE-15 §4 phase "accès complet") —
 * réutilise directement `teachers.list` (déjà `permissionProcedure`, contourné par le rôle Super
 * Admin) et le même modèle de colonnes que `TeachersListScreen.tsx` du desktop.
 */
export default function AdminTeachersPage() {
  const router = useRouter();
  const [rows, setRows] = useState<TeacherListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statuses, setStatuses] = useState<TeacherStatusDto[]>([]);
  const [, setContractTypes] = useState<TeacherContractTypeDto[]>([]);

  const [search, setSearch] = useState("");
  const [statusId, setStatusId] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortBy>("lastName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    trpcClient.teacherStatuses.list.query().then(setStatuses).catch(() => setStatuses([]));
    trpcClient.teacherContractTypes.list.query().then(setContractTypes).catch(() => setContractTypes([]));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    trpcClient.teachers.list
      .query({
        search: search || undefined,
        statusId: statusId || undefined,
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
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement des enseignants."))
      .finally(() => setIsLoading(false));
  }, [search, statusId, includeArchived, sortBy, sortDirection, page]);

  const columns: ServerDataTableColumn<TeacherListRow>[] = [
    { key: "matricule", header: "Matricule", value: (r) => r.matricule, sortKey: "matricule" },
    { key: "lastName", header: "Nom", value: (r) => r.lastName, sortKey: "lastName" },
    { key: "firstName", header: "Prénom", value: (r) => r.firstName, sortKey: "firstName" },
    { key: "gender", header: "Sexe", value: (r) => r.gender },
    { key: "phone", header: "Téléphone", value: (r) => r.phonePrimary ?? "—" },
    { key: "email", header: "E-mail", value: (r) => r.email ?? "—", defaultVisible: false },
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
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Enseignants</h1>
        <Button onClick={() => router.push("/admin/enseignants/nouveau")}>Nouvel enseignant</Button>
      </div>

      {loadError && (
        <Card variant="static" className="border-destructive/40 p-4 text-sm text-destructive">
          {loadError}
        </Card>
      )}

      <Card variant="static" className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label>Statut</Label>
          <Select value={statusId} onChange={(e) => { setStatusId(e.target.value); setPage(1); }}>
            <option value="">Tous</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
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
        searchPlaceholder="Matricule, nom, téléphone, email, spécialité..."
        sortKey={sortBy}
        sortDirection={sortDirection}
        onSortChange={(key) => {
          setSortBy(key as SortBy);
          setSortDirection((prev) => (sortBy === key && prev === "asc" ? "desc" : "asc"));
        }}
        isLoading={isLoading}
        emptyMessage="Aucun enseignant."
        columnStorageKey="portal-admin-teachers-table-columns"
        rowActions={(r) => (
          <Button variant="outline" onClick={() => router.push(`/admin/enseignants/${r.id}`)}>
            Ouvrir
          </Button>
        )}
      />
    </div>
  );
}
