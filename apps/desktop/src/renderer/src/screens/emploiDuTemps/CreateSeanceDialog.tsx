import { Badge, Button, Dialog, Input, Label, Select } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Création manuelle/assistée d'une séance (MODULE-05.2 §1.3/§1.4) — les conflits (enseignant/salle/
 * classe) sont vérifiés en direct pendant la saisie et affichés avant validation, le contrôle
 * bloquant définitif restant côté serveur.
 */
export function CreateSeanceDialog({ onClose }: { onClose: () => void }) {
  const [academicYearId, setAcademicYearId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [subjectOfferingId, setSubjectOfferingId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [pedagogicalGroupId, setPedagogicalGroupId] = useState("");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [sessionDate, setSessionDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");

  const yearsQuery = trpc.academicYears.list.useQuery();
  const periodsQuery = trpc.academicPeriods.list.useQuery({ academicYearId }, { enabled: Boolean(academicYearId) });
  const levelsQuery = trpc.levels.list.useQuery();
  const subjectsQuery = trpc.subjects.list.useQuery({});
  const classesQuery = trpc.schoolClasses.list.useQuery({});
  const teachersQuery = trpc.teachers.list.useQuery({
    includeArchived: false,
    page: 1,
    pageSize: 200,
    sortBy: "lastName",
    sortDirection: "asc",
  });
  const roomsQuery = trpc.rooms.list.useQuery({ activeOnly: true });
  const pedagogicalGroupsQuery = trpc.pedagogicalGroups.list.useQuery({ activeOnly: true });
  const offeringsQuery = trpc.subjectOfferings.list.useQuery(
    { academicYearId, periodId, levelId, subjectId },
    { enabled: Boolean(academicYearId && periodId && levelId && subjectId) }
  );

  useEffect(() => {
    const offerings = offeringsQuery.data ?? [];
    if (offerings.length === 1 && offerings[0] && !subjectOfferingId) {
      setSubjectOfferingId(offerings[0].id);
    }
  }, [offeringsQuery.data, subjectOfferingId]);

  const selectedOffering = (offeringsQuery.data ?? []).find((o) => o.id === subjectOfferingId);
  const availableClasses = (classesQuery.data ?? []).filter(
    (c) =>
      c.academicYearId === academicYearId &&
      c.levelId === levelId &&
      (!selectedOffering?.filiereId || c.filiereId === selectedOffering.filiereId)
  );

  useEffect(() => {
    if (!pedagogicalGroupId) return;
    const group = (pedagogicalGroupsQuery.data ?? []).find((g) => g.id === pedagogicalGroupId);
    if (group) setClassIds(group.classIds);
  }, [pedagogicalGroupId, pedagogicalGroupsQuery.data]);

  function toggleClass(id: string) {
    setClassIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  const canCheckConflicts =
    Boolean(teacherId) && classIds.length > 0 && Boolean(sessionDate) && timePattern.test(startTime) && timePattern.test(endTime);

  const conflictsQuery = trpc.seances.checkConflicts.useQuery(
    {
      teacherId,
      roomId: roomId || null,
      classIds,
      sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
      startTime,
      endTime,
    },
    { enabled: canCheckConflicts }
  );

  const utils = trpc.useUtils();
  const create = trpc.seances.create.useMutation({
    onSuccess: () => {
      void utils.seances.list.invalidate();
      onClose();
    },
  });

  const conflicts = conflictsQuery.data?.conflicts ?? [];
  const canSubmit =
    Boolean(teacherId && subjectOfferingId && sessionDate && classIds.length > 0) &&
    timePattern.test(startTime) &&
    timePattern.test(endTime) &&
    startTime < endTime;

  return (
    <Dialog open onClose={onClose} title="Nouvelle séance">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label>Année</Label>
            <Select value={academicYearId} onChange={(e) => { setAcademicYearId(e.target.value); setPeriodId(""); setClassIds([]); }}>
              <option value="">—</option>
              {(yearsQuery.data ?? []).map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Semestre</Label>
            <Select value={periodId} disabled={!academicYearId} onChange={(e) => setPeriodId(e.target.value)}>
              <option value="">—</option>
              {(periodsQuery.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Niveau</Label>
            <Select value={levelId} onChange={(e) => { setLevelId(e.target.value); setClassIds([]); }}>
              <option value="">—</option>
              {(levelsQuery.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Matière</Label>
            <Select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setSubjectOfferingId(""); }}>
              <option value="">—</option>
              {(subjectsQuery.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
        </div>

        {(offeringsQuery.data ?? []).length > 1 && (
          <div className="flex flex-col gap-1.5">
            <Label>Affectation (coefficient)</Label>
            <Select value={subjectOfferingId} onChange={(e) => setSubjectOfferingId(e.target.value)}>
              <option value="">—</option>
              {(offeringsQuery.data ?? []).map((o) => <option key={o.id} value={o.id}>coeff. {o.coefficient}</option>)}
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>Enseignant</Label>
            <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">—</option>
              {(teachersQuery.data?.rows ?? []).map((t) => <option key={t.id} value={t.id}>{t.lastName} {t.firstName}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Salle (optionnel)</Label>
            <Select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">—</option>
              {(roomsQuery.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Groupe pédagogique (préremplit les classes)</Label>
            <Select value={pedagogicalGroupId} onChange={(e) => setPedagogicalGroupId(e.target.value)}>
              <option value="">— Sélection libre —</option>
              {(pedagogicalGroupsQuery.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Classes concernées (cours mutualisé possible — sélection multiple)</Label>
          <div className="flex max-h-40 flex-col gap-1.5 overflow-auto rounded-lg border border-border p-2">
            {availableClasses.length === 0 && (
              <p className="text-xs text-muted-foreground">Sélectionnez l'année et le niveau pour voir les classes.</p>
            )}
            {availableClasses.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={classIds.includes(c.id)}
                  onChange={() => toggleClass(c.id)}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Date</Label>
            <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Heure de début</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Heure de fin</Label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>

        {canCheckConflicts && conflicts.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
            <div className="flex items-center gap-2">
              <Badge variant="destructive">Conflit détecté</Badge>
            </div>
            {conflicts.map((c, i) => (
              <p key={i} className="text-xs text-destructive">{c.label}</p>
            ))}
          </div>
        )}

        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={!canSubmit || create.isPending}
            onClick={() =>
              create.mutate({
                teacherId,
                subjectOfferingId,
                roomId: roomId || undefined,
                sessionDate: new Date(sessionDate),
                startTime,
                endTime,
                classIds,
              })
            }
          >
            {create.isPending ? "Création…" : "Créer la séance"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
