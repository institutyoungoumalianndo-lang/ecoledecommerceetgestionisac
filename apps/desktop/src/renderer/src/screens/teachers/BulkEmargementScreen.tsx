import type { GeneratedDocumentDto } from "@isac-erp/shared";
import { Button, Card, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { resolveCalendarYearForMonth } from "../../lib/academicCalendar";
import { resolveUploadUrl } from "../../lib/upload";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const MOIS_OPTIONS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

interface BulkResult {
  teacherId: string;
  teacherName: string;
  document: GeneratedDocumentDto | null;
  error: string | null;
}

/**
 * Génération en lot des fiches d'émargement mensuelles (2026-08-03, retour du porteur du projet :
 * "pour tout enseignant actif"). Le volume horaire prévu de chaque fiche est désormais calculé
 * automatiquement depuis le calendrier réel des affectations de CHAQUE enseignant (2026-08-08, retour
 * du porteur du projet — "je voudrais que cela puisse être appliqué automatiquement à sa fiche...
 * sans pour autant modifier ce qui existe déjà dans Documents à générer") : un enseignant avec 5
 * séances ce mois-ci reçoit un volume différent d'un enseignant qui n'en a que 2 — jamais la même
 * valeur forfaitaire pour tout le monde comme auparavant. La saisie du document lui-même
 * (`documentEngineService.ts`, `FICHE_EMARGEMENT_ENSEIGNANT`) n'est pas modifiée : seule cette page
 * calcule désormais la suggestion au lieu de demander un chiffre unique à l'utilisateur. La matière
 * reste vide sur chaque fiche — à compléter à la main, elle diffère par enseignant (voir
 * `TeacherEmargementTab.tsx`).
 */
export function BulkEmargementScreen() {
  const canGenerate = useHasPermission("DOCUMENTS:CREATION");

  const [academicYearId, setAcademicYearId] = useState("");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const yearsQuery = trpc.academicYears.list.useQuery();
  const activeYearId = yearsQuery.data?.find((y) => y.isActive)?.id ?? "";
  const effectiveYearId = academicYearId || activeYearId;
  const selectedYear = yearsQuery.data?.find((y) => y.id === effectiveYearId);

  // `pageSize` est plafonné à 200 par `teacherListFilterInputSchema` — une valeur au-delà (ex. 500)
  // fait échouer la requête silencieusement (aucun message d'erreur affiché par défaut par
  // react-query), donnant l'impression trompeuse de "0 enseignant" (2026-08-08, bug signalé par le
  // porteur du projet : le bouton restait grisé sans explication).
  const teachersQuery = trpc.teachers.list.useQuery({ includeArchived: false, page: 1, pageSize: 200 });
  const activeTeachers = teachersQuery.data?.rows ?? [];

  const utils = trpc.useUtils();
  const generateOne = trpc.documents.generate.useMutation();

  const isRunning = progress !== null && progress.done < progress.total;

  async function handleBulkGenerate() {
    if (!selectedYear) return;
    const calendarYear = resolveCalendarYearForMonth(Number(month), selectedYear);
    setResults(null);
    setProgress({ done: 0, total: activeTeachers.length });
    const newResults: BulkResult[] = [];
    for (const teacher of activeTeachers) {
      const teacherName = `${teacher.lastName} ${teacher.firstName}`;
      try {
        const { plannedHours } = await utils.client.teacherAssignments.getPlannedHoursForMonth.query({
          teacherId: teacher.id,
          year: calendarYear,
          month: Number(month),
        });
        const document = await generateOne.mutateAsync({
          documentType: "FICHE_EMARGEMENT_ENSEIGNANT",
          teacherId: teacher.id,
          academicYearId: effectiveYearId,
          month: Number(month),
          matiere: "",
          volumeHorairePrevu: plannedHours,
        });
        newResults.push({ teacherId: teacher.id, teacherName, document, error: null });
      } catch (err) {
        newResults.push({
          teacherId: teacher.id,
          teacherName,
          document: null,
          error: err instanceof Error ? err.message : "Échec de la génération.",
        });
      }
      setProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
    }
    setResults(newResults);
    void utils.documents.list.invalidate();
  }

  const succeeded = results?.filter((r) => r.document) ?? [];
  const failed = results?.filter((r) => !r.document) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Card variant="static" className="flex flex-col gap-3 p-4">
        <p className="text-sm text-muted-foreground">
          Génère une fiche d'émargement mensuelle pour chaque enseignant actif ({activeTeachers.length} enseignant(s)).
          Le volume horaire prévu est calculé automatiquement pour chacun depuis son calendrier réel
          d'affectations ce mois-ci (jamais la même valeur pour tout le monde) — la matière reste vide sur
          chaque fiche, à compléter à la main.
        </p>
        {teachersQuery.isError && (
          <p className="text-sm text-destructive">
            Échec du chargement des enseignants : {teachersQuery.error.message}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>Année scolaire</Label>
            <Select value={effectiveYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
              <option value="">—</option>
              {(yearsQuery.data ?? []).map((y) => (
                <option key={y.id} value={y.id}>{y.label}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Mois</Label>
            <Select value={month} onChange={(e) => setMonth(e.target.value)}>
              {MOIS_OPTIONS.map((label, i) => (
                <option key={label} value={i + 1}>{label}</option>
              ))}
            </Select>
          </div>
        </div>

        {canGenerate && (
          <div className="flex justify-end">
            <Button
              disabled={!effectiveYearId || activeTeachers.length === 0 || isRunning}
              onClick={() => void handleBulkGenerate()}
            >
              {isRunning
                ? `Génération… (${progress?.done}/${progress?.total})`
                : `Générer pour les ${activeTeachers.length} enseignant(s) actif(s)`}
            </Button>
          </div>
        )}

        {results && !isRunning && (
          <p className="text-sm text-muted-foreground">
            {succeeded.length} fiche(s) générée(s) sur {results.length}.
            {failed.length > 0 && ` Échec pour : ${failed.map((r) => r.teacherName).join(", ")}.`}
          </p>
        )}
      </Card>

      {succeeded.length > 0 && (
        <Card variant="static" className="flex flex-col gap-2 p-4">
          <p className="text-sm font-medium">Fiches générées — aperçu et impression</p>
          <div className="flex flex-col gap-2">
            {succeeded.map((r) => (
              <div key={r.teacherId} className="flex items-center justify-between rounded-lg border border-border p-3">
                <p className="text-sm">
                  {r.teacherName} — n° {r.document!.documentNumber}
                </p>
                <a
                  href={resolveUploadUrl(r.document!.filePath) ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline"
                >
                  Voir le PDF
                </a>
              </div>
            ))}
          </div>
        </Card>
      )}

      {failed.length > 0 && (
        <Card variant="static" className="flex flex-col gap-2 p-4">
          <p className="text-sm font-medium text-destructive">Échecs</p>
          <div className="flex flex-col gap-1">
            {failed.map((r) => (
              <p key={r.teacherId} className="text-sm text-muted-foreground">
                {r.teacherName} — {r.error}
              </p>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
