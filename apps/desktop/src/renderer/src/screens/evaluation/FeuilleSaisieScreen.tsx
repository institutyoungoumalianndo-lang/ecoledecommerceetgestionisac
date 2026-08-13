import { Button, Card, Label, Select } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { usePrintThemeStyle } from "../../lib/printTheme";
import { trpc } from "../../lib/trpc";

/** Feuille de saisie imprimable (MODULE-06 §1.10) — aucune donnée stockée. */
export function FeuilleSaisieScreen() {
  const [academicYearId, setAcademicYearId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [subjectOfferingId, setSubjectOfferingId] = useState("");
  const [classId, setClassId] = useState("");

  const printThemeStyle = usePrintThemeStyle();
  const yearsQuery = trpc.academicYears.list.useQuery();
  const periodsQuery = trpc.academicPeriods.list.useQuery({ academicYearId }, { enabled: Boolean(academicYearId) });
  const levelsQuery = trpc.levels.list.useQuery();
  const subjectsQuery = trpc.subjects.list.useQuery({});
  const classesQuery = trpc.schoolClasses.list.useQuery({});
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

  const feuilleQuery = trpc.feuilleSaisie.get.useQuery(
    { subjectOfferingId, classId },
    { enabled: Boolean(subjectOfferingId && classId) }
  );

  return (
    <div className="flex flex-col gap-4">
      <Card variant="static" className="grid grid-cols-2 gap-3 p-4 md:grid-cols-5">
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
          <Label>Semestre</Label>
          <Select value={periodId} disabled={!academicYearId} onChange={(e) => { setPeriodId(e.target.value); setClassId(""); }}>
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
          <Label>Matière</Label>
          <Select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setSubjectOfferingId(""); }}>
            <option value="">—</option>
            {(subjectsQuery.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Classe</Label>
          <Select value={classId} disabled={!subjectOfferingId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">—</option>
            {availableClasses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        {(offeringsQuery.data ?? []).length > 1 && (
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>Affectation (coefficient)</Label>
            <Select value={subjectOfferingId} onChange={(e) => setSubjectOfferingId(e.target.value)}>
              <option value="">—</option>
              {(offeringsQuery.data ?? []).map((o) => (
                <option key={o.id} value={o.id}>coeff. {o.coefficient}</option>
              ))}
            </Select>
          </div>
        )}
      </Card>

      {feuilleQuery.data && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Button onClick={() => window.print()}>Imprimer</Button>
          </div>
          <div data-print-area style={printThemeStyle} className="rounded-lg border print-border bg-background p-6 text-sm print-text">
            <div className="mb-4 text-center">
              <p className="text-base font-semibold print-title">Feuille de saisie des notes</p>
              <p className="text-xs print-text-secondary">
                {feuilleQuery.data.subjectName} — {feuilleQuery.data.classLabel} — {feuilleQuery.data.filiereLabel ?? feuilleQuery.data.levelLabel} — {feuilleQuery.data.academicYearLabel} — {feuilleQuery.data.academicPeriodLabel}
              </p>
              <p className="text-xs print-text-secondary">
                Enseignant : {feuilleQuery.data.teacherName ?? "________________________"}
                {feuilleQuery.data.teacherPhone ? ` — ${feuilleQuery.data.teacherPhone}` : ""}
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b print-table-border text-left text-xs print-header">
                  <th className="py-1">Matricule</th>
                  <th className="py-1">Étudiant</th>
                  <th className="py-1 text-right">Orale</th>
                  <th className="py-1 text-right">Écrite</th>
                  <th className="py-1 text-right">Composition</th>
                </tr>
              </thead>
              <tbody>
                {feuilleQuery.data.students.map((s) => (
                  <tr key={s.studentId} className="border-b print-table-border">
                    <td className="py-2">{s.matricule}</td>
                    <td className="py-2">{s.lastName} {s.firstName}</td>
                    <td className="py-2 text-right">&nbsp;</td>
                    <td className="py-2 text-right">&nbsp;</td>
                    <td className="py-2 text-right">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
