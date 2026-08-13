import { Button, Card, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { StudentBulletinsDialog } from "./StudentBulletinsDialog";

/** Bulletins par classe (MODULE-06 §1.7/§1.8/§4). */
export function BulletinsScreen() {
  const [academicYearId, setAcademicYearId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [classId, setClassId] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);

  const yearsQuery = trpc.academicYears.list.useQuery();
  const periodsQuery = trpc.academicPeriods.list.useQuery({ academicYearId }, { enabled: Boolean(academicYearId) });
  const levelsQuery = trpc.levels.list.useQuery();
  const classesQuery = trpc.schoolClasses.list.useQuery({});
  const studentsQuery = trpc.notes.listClassStudents.useQuery({ classId }, { enabled: Boolean(classId) });

  const availableClasses = (classesQuery.data ?? []).filter(
    (c) => c.academicYearId === academicYearId && c.levelId === levelId
  );

  return (
    <div className="flex flex-col gap-4">
      <Card variant="static" className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label>Année universitaire</Label>
          <Select value={academicYearId} onChange={(e) => { setAcademicYearId(e.target.value); setPeriodId(""); setClassId(""); }}>
            <option value="">—</option>
            {(yearsQuery.data ?? []).map((y) => (
              <option key={y.id} value={y.id}>{y.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Semestre (pour le bulletin de période)</Label>
          <Select value={periodId} disabled={!academicYearId} onChange={(e) => setPeriodId(e.target.value)}>
            <option value="">—</option>
            {(periodsQuery.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Niveau</Label>
          <Select value={levelId} onChange={(e) => { setLevelId(e.target.value); setClassId(""); }}>
            <option value="">—</option>
            {(levelsQuery.data ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Classe</Label>
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">—</option>
            {availableClasses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
      </Card>

      {!classId ? (
        <p className="text-sm text-muted-foreground">Sélectionnez une classe pour voir ses étudiants.</p>
      ) : !periodId ? (
        <p className="text-sm text-muted-foreground">Sélectionnez un semestre pour générer un bulletin de période (le bulletin annuel reste disponible sans le sélectionner).</p>
      ) : null}

      {classId && (
        <div className="flex flex-col gap-2">
          {(studentsQuery.data ?? []).map((s) => (
            <div key={s.studentId} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              <span>{s.lastName} {s.firstName} — {s.matricule}</span>
              <Button
                variant="outline"
                disabled={!periodId}
                onClick={() => setSelectedStudent({ id: s.studentId, name: `${s.lastName} ${s.firstName}` })}
              >
                Bulletins
              </Button>
            </div>
          ))}
          {(studentsQuery.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              {studentsQuery.isLoading ? "Chargement…" : "Aucun étudiant dans cette classe."}
            </p>
          )}
        </div>
      )}

      {selectedStudent && periodId && (
        <StudentBulletinsDialog
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
          academicPeriodId={periodId}
          academicYearId={academicYearId}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
