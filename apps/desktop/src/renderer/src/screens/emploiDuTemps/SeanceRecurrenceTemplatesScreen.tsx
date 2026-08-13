import type { DayOfWeek, SeanceRecurrenceTemplateDto } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, Input, Label, Select } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const DAY_LABELS: Record<DayOfWeek, string> = {
  LUNDI: "Lundi",
  MARDI: "Mardi",
  MERCREDI: "Mercredi",
  JEUDI: "Jeudi",
  VENDREDI: "Vendredi",
  SAMEDI: "Samedi",
  DIMANCHE: "Dimanche",
};

/**
 * Modèles de récurrence hebdomadaire (MODULE-05.2 §1.8.1) — remplace TeacherWeeklySlot (Module 5.1).
 * Génère des séances concrètes et indépendantes sur une plage de dates, idempotent.
 */
export function SeanceRecurrenceTemplatesScreen() {
  const [teacherId, setTeacherId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [generateForTemplate, setGenerateForTemplate] = useState<SeanceRecurrenceTemplateDto | null>(null);

  const canModify = useHasPermission("EMPLOI_DU_TEMPS:MODIFICATION");
  const utils = trpc.useUtils();

  const teachersQuery = trpc.teachers.list.useQuery({
    includeArchived: false,
    page: 1,
    pageSize: 200,
    sortBy: "lastName",
    sortDirection: "asc",
  });

  const templatesQuery = trpc.seanceRecurrenceTemplates.list.useQuery({ teacherId: teacherId || undefined });

  function invalidate() {
    void utils.seanceRecurrenceTemplates.list.invalidate();
  }

  const deactivate = trpc.seanceRecurrenceTemplates.deactivate.useMutation({ onSuccess: invalidate });
  const reactivate = trpc.seanceRecurrenceTemplates.reactivate.useMutation({ onSuccess: invalidate });

  const columns: DataTableColumn<SeanceRecurrenceTemplateDto>[] = [
    { key: "enseignant", header: "Enseignant", value: (r) => r.teacherName },
    { key: "matiere", header: "Matière", value: (r) => r.subjectName },
    { key: "classes", header: "Classes", value: (r) => r.classNames.join(", ") },
    { key: "jour", header: "Jour", value: (r) => DAY_LABELS[r.dayOfWeek] },
    { key: "horaire", header: "Horaire", value: (r) => `${r.startTime} - ${r.endTime}` },
    { key: "salle", header: "Salle", value: (r) => r.roomLabel ?? "—" },
    {
      key: "statut",
      header: "Statut",
      value: (r) => (r.isActive ? "Actif" : "Inactif"),
      render: (r) => <Badge variant={r.isActive ? "success" : "muted"}>{r.isActive ? "Actif" : "Inactif"}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Enseignant</label>
          <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">Tous</option>
            {(teachersQuery.data?.rows ?? []).map((t) => <option key={t.id} value={t.id}>{t.lastName} {t.firstName}</option>)}
          </Select>
        </div>
        {canModify && <Button onClick={() => setCreateOpen(true)}>Nouveau modèle</Button>}
      </div>

      <DataTable
        columns={columns}
        rows={templatesQuery.data ?? []}
        getRowId={(r) => r.id}
        exportFilename="modeles-recurrence"
        emptyMessage={templatesQuery.isLoading ? "Chargement…" : "Aucun modèle de récurrence."}
        rowActions={
          canModify
            ? (r) => (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setGenerateForTemplate(r)}>
                    Générer les séances
                  </Button>
                  {r.isActive ? (
                    <Button variant="destructive" onClick={() => deactivate.mutate({ id: r.id })}>
                      Désactiver
                    </Button>
                  ) : (
                    <Button variant="success" onClick={() => reactivate.mutate({ id: r.id })}>
                      Réactiver
                    </Button>
                  )}
                </div>
              )
            : undefined
        }
      />

      {createOpen && <CreateTemplateDialog onClose={() => setCreateOpen(false)} />}
      {generateForTemplate && (
        <GenerateSeancesDialog template={generateForTemplate} onClose={() => setGenerateForTemplate(null)} />
      )}
    </div>
  );
}

function CreateTemplateDialog({ onClose }: { onClose: () => void }) {
  const [academicYearId, setAcademicYearId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [subjectOfferingId, setSubjectOfferingId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [pedagogicalGroupId, setPedagogicalGroupId] = useState("");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>("LUNDI");
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

  const utils = trpc.useUtils();
  const create = trpc.seanceRecurrenceTemplates.create.useMutation({
    onSuccess: () => {
      void utils.seanceRecurrenceTemplates.list.invalidate();
      onClose();
    },
  });

  const canSubmit = Boolean(teacherId && subjectOfferingId && classIds.length > 0) && startTime < endTime;

  return (
    <Dialog open onClose={onClose} title="Nouveau modèle de récurrence">
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
          <Label>Classes concernées</Label>
          <div className="flex max-h-40 flex-col gap-1.5 overflow-auto rounded-lg border border-border p-2">
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
            <Label>Jour de la semaine</Label>
            <Select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}>
              {Object.entries(DAY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
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
                dayOfWeek,
                startTime,
                endTime,
                pedagogicalGroupId: pedagogicalGroupId || undefined,
                classIds,
              })
            }
          >
            {create.isPending ? "Création…" : "Créer le modèle"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function GenerateSeancesDialog({ template, onClose }: { template: SeanceRecurrenceTemplateDto; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const utils = trpc.useUtils();
  const generate = trpc.seanceRecurrenceTemplates.generateSeances.useMutation({
    onSuccess: () => {
      void utils.seances.list.invalidate();
      onClose();
    },
  });

  function fillFullSemester() {
    setStartDate(new Date(template.periodStartDate).toISOString().slice(0, 10));
    setEndDate(new Date(template.periodEndDate).toISOString().slice(0, 10));
  }

  return (
    <Dialog open onClose={onClose} title="Générer les séances depuis ce modèle">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Génère une séance concrète pour chaque occurrence du jour de la semaine du modèle, entre les deux dates —
          idempotent : les séances déjà générées ne sont jamais dupliquées.
        </p>
        <p className="text-xs text-muted-foreground">
          Enseignement modulaire (2 semestres/an) — ce modèle n'est valide que pour le semestre {template.periodLabel}
          . Un enseignant n'est pas forcément reconduit au semestre suivant : générez à nouveau, un nouveau modèle
          par modèle, pour le semestre suivant le moment venu.
        </p>
        <Button type="button" variant="outline" className="self-start" onClick={fillFullSemester}>
          Reconduire sur tout le semestre {template.periodLabel} (
          {new Date(template.periodStartDate).toLocaleDateString("fr-FR")} –{" "}
          {new Date(template.periodEndDate).toLocaleDateString("fr-FR")})
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Du</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Au</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        {generate.error && <p className="text-sm text-destructive">{generate.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={generate.isPending || startDate > endDate}
            onClick={() =>
              generate.mutate({ templateId: template.id, startDate: new Date(startDate), endDate: new Date(endDate) })
            }
          >
            {generate.isPending ? "Génération…" : "Générer"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
