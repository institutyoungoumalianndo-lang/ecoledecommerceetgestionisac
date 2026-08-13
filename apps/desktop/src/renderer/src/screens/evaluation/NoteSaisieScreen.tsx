import { Badge, Button, Card, Input, Label, Select } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

/**
 * Saisie des notes (MODULE-06 §1.1/§1.2) — tableau par classe/matière/période. La note finale
 * n'est jamais saisie directement, toujours recalculée côté serveur après enregistrement.
 */
export function NoteSaisieScreen() {
  const [academicYearId, setAcademicYearId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [subjectOfferingId, setSubjectOfferingId] = useState("");
  const [classId, setClassId] = useState("");

  const canModify = useHasPermission("NOTES:MODIFICATION");
  const utils = trpc.useUtils();

  const yearsQuery = trpc.academicYears.list.useQuery();
  const periodsQuery = trpc.academicPeriods.list.useQuery({ academicYearId }, { enabled: Boolean(academicYearId) });
  const levelsQuery = trpc.levels.list.useQuery();
  const subjectsQuery = trpc.subjects.list.useQuery({});
  const classesQuery = trpc.schoolClasses.list.useQuery({});
  const offeringsQuery = trpc.subjectOfferings.list.useQuery(
    { academicYearId, periodId, levelId, subjectId },
    { enabled: Boolean(academicYearId && periodId && levelId && subjectId) }
  );

  const selectedOffering = (offeringsQuery.data ?? []).find((o) => o.id === subjectOfferingId);
  const availableClasses = (classesQuery.data ?? []).filter(
    (c) =>
      c.academicYearId === academicYearId &&
      c.levelId === levelId &&
      (!selectedOffering?.filiereId || c.filiereId === selectedOffering.filiereId)
  );

  useEffect(() => {
    const offerings = offeringsQuery.data ?? [];
    if (offerings.length === 1 && offerings[0] && !subjectOfferingId) {
      setSubjectOfferingId(offerings[0].id);
    }
  }, [offeringsQuery.data, subjectOfferingId]);

  const rowsQuery = trpc.notes.listForSaisie.useQuery(
    { classId, subjectOfferingId },
    { enabled: Boolean(classId && subjectOfferingId) }
  );

  const saisir = trpc.notes.saisir.useMutation({
    onSuccess: () => void utils.notes.listForSaisie.invalidate({ classId, subjectOfferingId }),
  });

  const [drafts, setDrafts] = useState<Record<string, { orale: string; ecrite: string; composition: string }>>({});

  function draftFor(studentId: string, fallback: { noteOrale: number | null; noteEcrite: number | null; noteComposition: number | null }) {
    return (
      drafts[studentId] ?? {
        orale: fallback.noteOrale?.toString() ?? "",
        ecrite: fallback.noteEcrite?.toString() ?? "",
        composition: fallback.noteComposition?.toString() ?? "",
      }
    );
  }

  function setDraft(studentId: string, field: "orale" | "ecrite" | "composition", value: string) {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: { orale: "", ecrite: "", composition: "", ...prev[studentId], [field]: value },
    }));
  }

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

      {!classId || !subjectOfferingId ? (
        <p className="text-sm text-muted-foreground">Sélectionnez une classe et une matière pour saisir les notes.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-3 py-2">Étudiant</th>
                <th className="px-3 py-2">Orale</th>
                <th className="px-3 py-2">Écrite</th>
                <th className="px-3 py-2">Composition</th>
                <th className="px-3 py-2">Note finale</th>
                <th className="px-3 py-2">Statut</th>
                {canModify && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {(rowsQuery.data ?? []).map((row) => {
                const draft = draftFor(row.studentId, row);
                return (
                  <tr key={row.studentId} className="border-t border-border">
                    <td className="px-3 py-2">{row.studentLastName} {row.studentFirstName}</td>
                    <td className="px-3 py-2">
                      <Input
                        type="number" min={0} max={20} step="0.25" className="w-20"
                        disabled={row.verrouillee && !canModify}
                        value={draft.orale}
                        onChange={(e) => setDraft(row.studentId, "orale", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number" min={0} max={20} step="0.25" className="w-20"
                        disabled={row.verrouillee && !canModify}
                        value={draft.ecrite}
                        onChange={(e) => setDraft(row.studentId, "ecrite", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number" min={0} max={20} step="0.25" className="w-20"
                        disabled={row.verrouillee && !canModify}
                        value={draft.composition}
                        onChange={(e) => setDraft(row.studentId, "composition", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">{row.noteFinale ?? "—"}</td>
                    <td className="px-3 py-2">
                      {row.verrouillee && <Badge variant="muted">Verrouillée</Badge>}
                    </td>
                    {canModify && (
                      <td className="px-3 py-2">
                        <Button
                          variant="outline"
                          disabled={(row.verrouillee && !canModify) || saisir.isPending}
                          onClick={() =>
                            saisir.mutate({
                              studentId: row.studentId,
                              subjectOfferingId,
                              noteOrale: draft.orale === "" ? null : Number(draft.orale),
                              noteEcrite: draft.ecrite === "" ? null : Number(draft.ecrite),
                              noteComposition: draft.composition === "" ? null : Number(draft.composition),
                            })
                          }
                        >
                          Enregistrer
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {(rowsQuery.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">
                    {rowsQuery.isLoading ? "Chargement…" : "Aucun étudiant dans cette classe."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {saisir.error && <p className="text-sm text-destructive">{saisir.error.message}</p>}
    </div>
  );
}
