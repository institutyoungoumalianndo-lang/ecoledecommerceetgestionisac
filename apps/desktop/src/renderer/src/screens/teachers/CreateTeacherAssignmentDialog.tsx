import { Button, Dialog, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

export interface ReassignFrom {
  assignmentId: string;
  academicYearId: string;
  periodId: string;
  levelId: string;
  subjectId: string;
  subjectOfferingId: string;
  classId: string;
}

/**
 * Affectation pédagogique (MODULE-05 §1.2/§10.3) — réutilise une SubjectOffering existante (Module 2.1),
 * jamais dupliquée. En mode réaffectation (2026-08-08, retour du porteur du projet : "avec aussi la
 * possibilité de changer les matières les heures les niveaux etc"), le formulaire est pré-rempli avec les
 * valeurs de l'affectation d'origine mais TOUS les champs restent modifiables (année, semestre/module,
 * niveau, matière, offre — donc coefficient/volume horaire — et classe) : à la validation, la nouvelle
 * affectation est créée puis, seulement en cas de succès, l'ancienne est désactivée (jamais l'inverse, pour
 * ne jamais perdre l'affectation d'origine si la création échoue).
 */
export function CreateTeacherAssignmentDialog({
  teacherId,
  reassignFrom,
  onClose,
}: {
  teacherId: string;
  reassignFrom?: ReassignFrom;
  onClose: () => void;
}) {
  const [academicYearId, setAcademicYearId] = useState(reassignFrom?.academicYearId ?? "");
  const [periodId, setPeriodId] = useState(reassignFrom?.periodId ?? "");
  const [levelId, setLevelId] = useState(reassignFrom?.levelId ?? "");
  const [subjectId, setSubjectId] = useState(reassignFrom?.subjectId ?? "");
  const [subjectOfferingId, setSubjectOfferingId] = useState(reassignFrom?.subjectOfferingId ?? "");
  const [classId, setClassId] = useState(reassignFrom?.classId ?? "");

  const yearsQuery = trpc.academicYears.list.useQuery();
  const levelsQuery = trpc.levels.list.useQuery();
  const subjectsQuery = trpc.subjects.list.useQuery({});
  const periodsQuery = trpc.academicPeriods.list.useQuery({ academicYearId }, { enabled: Boolean(academicYearId) });
  const filieresQuery = trpc.filieres.list.useQuery();
  const classesQuery = trpc.schoolClasses.list.useQuery({});

  const offeringsQuery = trpc.subjectOfferings.list.useQuery(
    { academicYearId, periodId, levelId, subjectId },
    { enabled: Boolean(academicYearId && periodId && levelId && subjectId) }
  );
  const filiereById = new Map((filieresQuery.data ?? []).map((f) => [f.id, f]));

  const selectedOffering = (offeringsQuery.data ?? []).find((o) => o.id === subjectOfferingId);
  const availableClasses = (classesQuery.data ?? []).filter(
    (c) =>
      c.academicYearId === academicYearId &&
      c.levelId === levelId &&
      (!selectedOffering?.filiereId || c.filiereId === selectedOffering.filiereId)
  );

  const utils = trpc.useUtils();
  const deactivate = trpc.teacherAssignments.deactivate.useMutation();
  const create = trpc.teacherAssignments.create.useMutation({
    onSuccess: async () => {
      // En réaffectation, l'ancienne affectation n'est désactivée qu'APRÈS le succès de la nouvelle
      // (jamais l'inverse) pour ne jamais la perdre si la création échoue (ex. doublon, classe invalide).
      if (reassignFrom) {
        await deactivate.mutateAsync({ id: reassignFrom.assignmentId });
      }
      void utils.teacherAssignments.listByTeacher.invalidate({ teacherId, includeInactive: false });
      void utils.teacherAssignments.getWorkload.invalidate();
      onClose();
    },
  });

  const canSubmit = Boolean(subjectOfferingId && classId);

  return (
    <Dialog
      open
      onClose={onClose}
      title={reassignFrom ? "Réaffecter l'enseignant" : "Nouvelle affectation pédagogique"}
    >
      <div className="flex flex-col gap-4">
        {reassignFrom && (
          <p className="text-sm text-muted-foreground">
            Modifie librement l'année, le semestre, le niveau, la matière ou la classe ci-dessous, puis valide :
            la nouvelle affectation sera créée et l'ancienne retirée automatiquement.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Année universitaire</Label>
            <Select
              value={academicYearId}
              onChange={(e) => {
                setAcademicYearId(e.target.value);
                setPeriodId("");
                setSubjectOfferingId("");
                setClassId("");
              }}
            >
              <option value="">—</option>
              {(yearsQuery.data ?? []).map((y) => (
                <option key={y.id} value={y.id}>{y.label}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Semestre</Label>
            <Select
              value={periodId}
              disabled={!academicYearId}
              onChange={(e) => { setPeriodId(e.target.value); setSubjectOfferingId(""); setClassId(""); }}
            >
              <option value="">—</option>
              {(periodsQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Niveau</Label>
            <Select
              value={levelId}
              onChange={(e) => { setLevelId(e.target.value); setSubjectOfferingId(""); setClassId(""); }}
            >
              <option value="">—</option>
              {(levelsQuery.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Matière</Label>
            <Select
              value={subjectId}
              onChange={(e) => { setSubjectId(e.target.value); setSubjectOfferingId(""); setClassId(""); }}
            >
              <option value="">—</option>
              {(subjectsQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>Affectation (filière / coefficient / volume horaire)</Label>
            <Select
              value={subjectOfferingId}
              disabled={offeringsQuery.isFetching || (offeringsQuery.data ?? []).length === 0}
              onChange={(e) => { setSubjectOfferingId(e.target.value); setClassId(""); }}
            >
              <option value="">—</option>
              {(offeringsQuery.data ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.filiereId ? filiereById.get(o.filiereId)?.name ?? "?" : "Toutes filières"} — coeff. {o.coefficient} — {o.totalHours} h/sem.
                </option>
              ))}
            </Select>
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>Classe</Label>
            <Select value={classId} disabled={!subjectOfferingId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">—</option>
              {availableClasses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
        </div>

        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
        {deactivate.error && <p className="text-sm text-destructive">{deactivate.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={!canSubmit || create.isPending || deactivate.isPending}
            onClick={() => create.mutate({ teacherId, subjectOfferingId, classId })}
          >
            {create.isPending || deactivate.isPending
              ? "Enregistrement…"
              : reassignFrom
                ? "Réaffecter"
                : "Affecter"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
