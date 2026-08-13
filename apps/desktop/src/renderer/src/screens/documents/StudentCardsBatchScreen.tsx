import { Button, Card, CardContent, CardHeader, CardTitle, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { resolveUploadUrl } from "../../lib/upload";
import { trpc } from "../../lib/trpc";

/** Génération par lot des cartes d'étudiant (MODULE-09.1 §6 point 5) — une carte par étudiant inscrit correspondant aux filtres. */
export function StudentCardsBatchScreen() {
  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [filiereId, setFiliereId] = useState("");

  const yearsQuery = trpc.academicYears.list.useQuery();
  const classesQuery = trpc.schoolClasses.list.useQuery({});
  const levelsQuery = trpc.levels.list.useQuery();
  const filieresQuery = trpc.filieres.list.useQuery();

  const generateBatch = trpc.studentCards.generateBatch.useMutation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Impression par lot des cartes d'étudiant</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Génère une carte individuelle pour chaque étudiant ayant une inscription active correspondant
          aux filtres ci-dessous, réunies dans un seul PDF à imprimer.
        </p>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label>Année universitaire</Label>
            <Select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {(yearsQuery.data ?? []).map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Classe (facultatif)</Label>
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">— Toutes —</option>
              {(classesQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Niveau (facultatif)</Label>
            <Select value={levelId} onChange={(e) => setLevelId(e.target.value)}>
              <option value="">— Tous —</option>
              {(levelsQuery.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Filière (facultatif)</Label>
            <Select value={filiereId} onChange={(e) => setFiliereId(e.target.value)}>
              <option value="">— Toutes —</option>
              {(filieresQuery.data ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {generateBatch.error && <p className="text-sm text-destructive">{generateBatch.error.message}</p>}

        {generateBatch.data && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <p>
              <strong>{generateBatch.data.generatedCount}</strong> carte(s) générée(s).{" "}
              <a className="underline" href={resolveUploadUrl(generateBatch.data.batchFilePath) ?? "#"} target="_blank" rel="noreferrer">
                Télécharger le PDF du lot
              </a>
            </p>
            {generateBatch.data.failed.length > 0 && (
              <div className="mt-2">
                <p className="font-medium text-amber-800">{generateBatch.data.failed.length} échec(s) :</p>
                <ul className="list-inside list-disc">
                  {generateBatch.data.failed.map((f) => (
                    <li key={f.studentId}>
                      {f.studentName} — {f.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <Button
          className="self-end"
          disabled={!academicYearId || generateBatch.isPending}
          onClick={() =>
            generateBatch.mutate({
              academicYearId,
              classId: classId || undefined,
              levelId: levelId || undefined,
              filiereId: filiereId || undefined,
            })
          }
        >
          {generateBatch.isPending ? "Génération…" : "Générer les cartes"}
        </Button>
      </CardContent>
    </Card>
  );
}
