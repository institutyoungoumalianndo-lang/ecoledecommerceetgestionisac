import { Button, Checkbox, Dialog, Input, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

/** Affectation d'une matière à un contexte (MODULE-02.1 §1.2/§9.9/§9.10) — coefficient, volumes horaires, obligatoire. */
export function CreateSubjectOfferingDialog({
  onClose,
  initialSubjectId,
}: {
  onClose: () => void;
  initialSubjectId?: string;
}) {
  const subjectsQuery = trpc.subjects.list.useQuery({});
  const yearsQuery = trpc.academicYears.list.useQuery();
  const levelsQuery = trpc.levels.list.useQuery();
  const filieresQuery = trpc.filieres.list.useQuery();
  const teachingUnitsQuery = trpc.teachingUnits.list.useQuery();
  const utils = trpc.useUtils();

  const [subjectId, setSubjectId] = useState(initialSubjectId ?? "");
  const [academicYearId, setAcademicYearId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [filiereId, setFiliereId] = useState("");
  const [teachingUnitId, setTeachingUnitId] = useState("");
  const [coefficient, setCoefficient] = useState("1");
  const [hoursCourse, setHoursCourse] = useState("0");
  const [hoursTd, setHoursTd] = useState("0");
  const [hoursTp, setHoursTp] = useState("0");
  const [hoursPersonalWork, setHoursPersonalWork] = useState("0");
  const [isRequired, setIsRequired] = useState(true);

  const periodsQuery = trpc.academicPeriods.list.useQuery({ academicYearId }, { enabled: Boolean(academicYearId) });

  const create = trpc.subjectOfferings.create.useMutation({
    onSuccess: () => {
      void utils.subjectOfferings.list.invalidate();
      onClose();
    },
  });

  const canSubmit = Boolean(subjectId && academicYearId && periodId && levelId && Number(coefficient) > 0);

  function submit() {
    create.mutate({
      subjectId,
      academicYearId,
      periodId,
      levelId,
      filiereId: filiereId || undefined,
      teachingUnitId: teachingUnitId || undefined,
      coefficient: Number(coefficient),
      hoursCourse: Number(hoursCourse),
      hoursTd: Number(hoursTd),
      hoursTp: Number(hoursTp),
      hoursPersonalWork: Number(hoursPersonalWork),
      isRequired,
    });
  }

  return (
    <Dialog open onClose={onClose} title="Nouvelle affectation de matière">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>Matière</Label>
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">—</option>
              {(subjectsQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Année universitaire</Label>
            <Select value={academicYearId} onChange={(e) => { setAcademicYearId(e.target.value); setPeriodId(""); }}>
              <option value="">—</option>
              {(yearsQuery.data ?? []).map((y) => (
                <option key={y.id} value={y.id}>{y.label}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Semestre</Label>
            <Select value={periodId} onChange={(e) => setPeriodId(e.target.value)} disabled={!academicYearId}>
              <option value="">—</option>
              {(periodsQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </Select>
            {academicYearId && periodsQuery.data?.length === 0 && (
              <p className="text-xs text-destructive">
                Aucun semestre pour cette année — créez-en un dans Paramètres → Années universitaires → bouton "Périodes".
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Niveau</Label>
            <Select value={levelId} onChange={(e) => setLevelId(e.target.value)}>
              <option value="">—</option>
              {(levelsQuery.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Filière (optionnel — vide = toutes les filières de ce niveau)</Label>
            <Select value={filiereId} onChange={(e) => setFiliereId(e.target.value)}>
              <option value="">Toutes les filières</option>
              {(filieresQuery.data ?? []).map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Unité d'enseignement (optionnel)</Label>
            <Select value={teachingUnitId} onChange={(e) => setTeachingUnitId(e.target.value)}>
              <option value="">—</option>
              {(teachingUnitsQuery.data ?? []).map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Coefficient</Label>
            <Input type="number" min={0} step="0.5" value={coefficient} onChange={(e) => setCoefficient(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Heures de cours</Label>
            <Input type="number" min={0} value={hoursCourse} onChange={(e) => setHoursCourse(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Heures de TD</Label>
            <Input type="number" min={0} value={hoursTd} onChange={(e) => setHoursTd(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Heures de TP</Label>
            <Input type="number" min={0} value={hoursTp} onChange={(e) => setHoursTp(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Heures de travail personnel</Label>
            <Input type="number" min={0} value={hoursPersonalWork} onChange={(e) => setHoursPersonalWork(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Checkbox checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} />
            <Label>Matière obligatoire</Label>
          </div>
        </div>

        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={!canSubmit || create.isPending} onClick={submit}>
            {create.isPending ? "Création…" : "Créer"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
