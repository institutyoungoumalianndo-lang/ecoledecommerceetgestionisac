import type { SubjectOfferingDto } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { CreateSubjectOfferingDialog } from "./CreateSubjectOfferingDialog";

/** Affectations de matières (MODULE-02.1 §1.2/§9.9/§9.10) — coefficient et volumes horaires par contexte. */
export function SubjectOfferingsScreen() {
  const [academicYearId, setAcademicYearId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [filiereId, setFiliereId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const canCreate = useHasPermission("MATIERES:CREATION");
  const canModify = useHasPermission("MATIERES:MODIFICATION");

  const yearsQuery = trpc.academicYears.list.useQuery();
  const periodsQuery = trpc.academicPeriods.list.useQuery({ academicYearId }, { enabled: Boolean(academicYearId) });
  const levelsQuery = trpc.levels.list.useQuery();
  const filieresQuery = trpc.filieres.list.useQuery();
  const utils = trpc.useUtils();

  const query = trpc.subjectOfferings.list.useQuery({
    academicYearId: academicYearId || undefined,
    periodId: periodId || undefined,
    levelId: levelId || undefined,
    filiereId: filiereId || undefined,
    includeInactive: true,
  });

  const deactivate = trpc.subjectOfferings.deactivate.useMutation({ onSuccess: () => void utils.subjectOfferings.list.invalidate() });
  const reactivate = trpc.subjectOfferings.reactivate.useMutation({ onSuccess: () => void utils.subjectOfferings.list.invalidate() });

  const columns: DataTableColumn<SubjectOfferingDto>[] = [
    { key: "subjectName", header: "Matière", value: (o) => `${o.subjectCode} — ${o.subjectName}` },
    { key: "academicYearLabel", header: "Année", value: (o) => o.academicYearLabel },
    { key: "periodLabel", header: "Semestre", value: (o) => o.periodLabel },
    { key: "levelLabel", header: "Niveau", value: (o) => o.levelLabel },
    { key: "filiereName", header: "Filière", value: (o) => o.filiereName ?? "Toutes" },
    { key: "teachingUnitName", header: "UE", value: (o) => o.teachingUnitName ?? "—" },
    { key: "coefficient", header: "Coefficient", value: (o) => o.coefficient },
    { key: "totalHours", header: "Volume horaire total", value: (o) => o.totalHours },
    {
      key: "isRequired",
      header: "Obligatoire",
      value: (o) => (o.isRequired ? "Oui" : "Non"),
      render: (o) => <Badge variant={o.isRequired ? "default" : "muted"}>{o.isRequired ? "Obligatoire" : "Optionnelle"}</Badge>,
    },
    {
      key: "status",
      header: "Statut",
      value: (o) => (o.isActive ? "Actif" : "Inactif"),
      render: (o) => <Badge variant={o.isActive ? "success" : "muted"}>{o.isActive ? "Actif" : "Inactif"}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Affectations de matières</h2>
        {canCreate && <Button onClick={() => setCreateOpen(true)}>Nouvelle affectation</Button>}
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(o) => o.id}
        exportFilename="affectations-matieres"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucune affectation."}
        filters={
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Année</Label>
              <Select
                value={academicYearId}
                onChange={(e) => {
                  setAcademicYearId(e.target.value);
                  setPeriodId("");
                }}
              >
                <option value="">Toutes</option>
                {(yearsQuery.data ?? []).map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Semestre</Label>
              <Select value={periodId} onChange={(e) => setPeriodId(e.target.value)} disabled={!academicYearId}>
                <option value="">Tous</option>
                {(periodsQuery.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Niveau</Label>
              <Select value={levelId} onChange={(e) => setLevelId(e.target.value)}>
                <option value="">Tous</option>
                {(levelsQuery.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Filière</Label>
              <Select value={filiereId} onChange={(e) => setFiliereId(e.target.value)}>
                <option value="">Toutes</option>
                {(filieresQuery.data ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            </div>
          </div>
        }
        rowActions={
          canModify
            ? (o) =>
                o.isActive ? (
                  <Button variant="outline" onClick={() => deactivate.mutate({ id: o.id })}>
                    Désactiver
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => reactivate.mutate({ id: o.id })}>
                    Réactiver
                  </Button>
                )
            : undefined
        }
      />

      {createOpen && <CreateSubjectOfferingDialog onClose={() => setCreateOpen(false)} />}
    </div>
  );
}
