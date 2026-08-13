import type { TeacherAssignmentDto } from "@isac-erp/shared";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, DataTable, StatRingCard as StatCard, type DataTableColumn } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { CreateTeacherAssignmentDialog, type ReassignFrom } from "./CreateTeacherAssignmentDialog";
import { TeacherWeeklyScheduleCard } from "./TeacherWeeklyScheduleCard";

/** Affectations pédagogiques et charge horaire (MODULE-05 §1.2/§1.3/§10.3/§10.4) — jamais stockée, calculée à la volée. */
export function TeacherAssignmentsTab({ teacherId }: { teacherId: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [reassignFrom, setReassignFrom] = useState<ReassignFrom | null>(null);
  const utils = trpc.useUtils();

  const canView = useHasPermission("ENSEIGNANTS_AFFECTATIONS:LECTURE");
  const canCreate = useHasPermission("ENSEIGNANTS_AFFECTATIONS:CREATION");
  const canModify = useHasPermission("ENSEIGNANTS_AFFECTATIONS:SUPPRESSION");

  const assignmentsQuery = trpc.teacherAssignments.listByTeacher.useQuery({ teacherId, includeInactive: true });
  const workloadQuery = trpc.teacherAssignments.getWorkload.useQuery({ teacherId });

  function invalidate() {
    void utils.teacherAssignments.listByTeacher.invalidate({ teacherId, includeInactive: true });
    void utils.teacherAssignments.getWorkload.invalidate({ teacherId });
  }

  const deactivate = trpc.teacherAssignments.deactivate.useMutation({ onSuccess: invalidate });
  const reactivate = trpc.teacherAssignments.reactivate.useMutation({ onSuccess: invalidate });

  if (!canView) return <p className="text-sm text-muted-foreground">Accès non autorisé.</p>;

  const workload = workloadQuery.data;

  const columns: DataTableColumn<TeacherAssignmentDto>[] = [
    { key: "annee", header: "Année", value: (a) => a.academicYearLabel },
    { key: "periode", header: "Semestre", value: (a) => a.periodLabel },
    { key: "matiere", header: "Matière", value: (a) => a.subjectName },
    { key: "classe", header: "Classe", value: (a) => a.className },
    { key: "filiere", header: "Filière", value: (a) => a.filiereName ?? "Toutes" },
    { key: "coefficient", header: "Coefficient", value: (a) => String(a.coefficient) },
    { key: "heures", header: "Heures/semaine", value: (a) => String(a.hoursPerWeek) },
    {
      key: "statut",
      header: "Statut",
      value: (a) => (a.isActive ? "Active" : "Inactive"),
      render: (a) => <Badge variant={a.isActive ? "success" : "muted"}>{a.isActive ? "Active" : "Inactive"}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card variant="static">
        <CardHeader>
          <CardTitle>Charge horaire (semestre en cours)</CardTitle>
        </CardHeader>
        <CardContent>
          {!workload ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <StatCard label="Par semaine" value={`${workload.weeklyHours} h`} />
              <StatCard label="Par mois (estimé)" value={`${workload.monthlyHours.toFixed(1)} h`} />
              <StatCard label="Par semestre" value={`${workload.semesterHours.toFixed(1)} h`} />
              <StatCard label="Par année" value={`${workload.yearlyHours.toFixed(1)} h`} />
              <StatCard
                label="Encore disponible / semaine"
                value={workload.weeklyRemaining === null ? "Non plafonné" : `${workload.weeklyRemaining} h`}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <TeacherWeeklyScheduleCard teacherId={teacherId} />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Affectations pédagogiques</h3>
        {canCreate && <Button onClick={() => setCreateOpen(true)}>Nouvelle affectation</Button>}
      </div>

      <DataTable
        columns={columns}
        rows={assignmentsQuery.data ?? []}
        getRowId={(a) => a.id}
        exportFilename="affectations-enseignant"
        emptyMessage={assignmentsQuery.isLoading ? "Chargement…" : "Aucune affectation."}
        rowActions={
          canModify
            ? (a) => (
                <div className="flex justify-end gap-2">
                  {a.isActive ? (
                    <>
                      {canCreate && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            setReassignFrom({
                              assignmentId: a.id,
                              academicYearId: a.academicYearId,
                              periodId: a.periodId,
                              levelId: a.levelId,
                              subjectId: a.subjectId,
                              subjectOfferingId: a.subjectOfferingId,
                              classId: a.classId,
                            })
                          }
                        >
                          Réaffecter
                        </Button>
                      )}
                      <Button variant="destructive" onClick={() => deactivate.mutate({ id: a.id })}>
                        Retirer
                      </Button>
                    </>
                  ) : (
                    <Button variant="success" onClick={() => reactivate.mutate({ id: a.id })}>
                      Réactiver
                    </Button>
                  )}
                </div>
              )
            : undefined
        }
      />

      {createOpen && <CreateTeacherAssignmentDialog teacherId={teacherId} onClose={() => setCreateOpen(false)} />}
      {reassignFrom && (
        <CreateTeacherAssignmentDialog
          teacherId={teacherId}
          reassignFrom={reassignFrom}
          onClose={() => setReassignFrom(null)}
        />
      )}
    </div>
  );
}
