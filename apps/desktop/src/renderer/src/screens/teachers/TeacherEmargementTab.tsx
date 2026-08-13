import { Button, Input, Label, Select } from "@isac-erp/ui";
import { useEffect, useState } from "react";
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

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR");
}

/**
 * Fiche d'émargement mensuelle (MODULE-09, 2026-08-03, retour du porteur du projet) — remplace le
 * suivi numérique du pointage (Module 5.1/5.2), abandonné. Formulaire à remplir à la main
 * (dates/heures/signatures), un document par mois choisi ici. Même principe que
 * `FicheInscriptionTab.tsx` : chaque génération crée un nouveau document archivé.
 */
export function TeacherEmargementTab({ teacherId }: { teacherId: string }) {
  const canView = useHasPermission("DOCUMENTS:LECTURE");
  const canGenerate = useHasPermission("DOCUMENTS:CREATION");

  const [academicYearId, setAcademicYearId] = useState("");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [matiere, setMatiere] = useState("");
  const [volumeHorairePrevu, setVolumeHorairePrevu] = useState("15");

  const yearsQuery = trpc.academicYears.list.useQuery();
  const activeYearId = yearsQuery.data?.find((y) => y.isActive)?.id ?? "";
  const effectiveYearId = academicYearId || activeYearId;
  const selectedYear = yearsQuery.data?.find((y) => y.id === effectiveYearId);

  // Suggestion pré-remplie depuis le calendrier réel des affectations (2026-08-08, retour du porteur
  // du projet : "je voudrais que cela puisse être appliqué automatiquement... pour me permettre de
  // gagner en temps") — reste entièrement modifiable, jamais imposée (voir MODULE-08 §9 pour la même
  // logique côté paie, où elle a au contraire été retirée sur demande explicite : ici la fiche
  // d'émargement n'est pas la paie, une suggestion administrative reste utile).
  const calendarYear = selectedYear ? resolveCalendarYearForMonth(Number(month), selectedYear) : null;
  const plannedHoursQuery = trpc.teacherAssignments.getPlannedHoursForMonth.useQuery(
    { teacherId, year: calendarYear ?? 0, month: Number(month) },
    { enabled: calendarYear !== null }
  );
  const plannedHours = plannedHoursQuery.data?.plannedHours;
  useEffect(() => {
    if (plannedHours !== undefined) {
      setVolumeHorairePrevu(String(plannedHours));
    }
  }, [plannedHours]);

  const utils = trpc.useUtils();
  const query = trpc.documents.list.useQuery({ documentType: "FICHE_EMARGEMENT_ENSEIGNANT", relatedEntityId: teacherId });
  const generate = trpc.documents.generate.useMutation({
    onSuccess: () =>
      void utils.documents.list.invalidate({ documentType: "FICHE_EMARGEMENT_ENSEIGNANT", relatedEntityId: teacherId }),
  });

  if (!canView) return <p className="text-sm text-muted-foreground">Accès non autorisé.</p>;

  const documents = [...(query.data ?? [])].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  const latest = documents[0];
  const volume = Number(volumeHorairePrevu);
  const volumeValid = Number.isFinite(volume) && volume >= 12 && volume <= 15;

  return (
    <div className="flex flex-col gap-4">
      {canGenerate && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">Générer la fiche d'émargement du mois</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
            <div className="flex flex-col gap-1.5">
              <Label>Matière</Label>
              <Input value={matiere} onChange={(e) => setMatiere(e.target.value)} placeholder="Optionnel" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Volume horaire prévu (12 à 15h)</Label>
              {plannedHoursQuery.isFetching && <p className="text-xs text-muted-foreground">Calcul depuis le calendrier…</p>}
              <Input
                type="number"
                min={12}
                max={15}
                value={volumeHorairePrevu}
                onChange={(e) => setVolumeHorairePrevu(e.target.value)}
              />
            </div>
          </div>
          {!volumeValid && <p className="text-xs text-destructive">Le volume horaire prévu doit être compris entre 12 et 15 heures.</p>}
          {generate.error && <p className="text-sm text-destructive">{generate.error.message}</p>}
          <div className="flex justify-end">
            <Button
              disabled={!effectiveYearId || !volumeValid || generate.isPending}
              onClick={() =>
                generate.mutate({
                  documentType: "FICHE_EMARGEMENT_ENSEIGNANT",
                  teacherId,
                  academicYearId: effectiveYearId,
                  month: Number(month),
                  matiere,
                  volumeHorairePrevu: volume,
                })
              }
            >
              {generate.isPending ? "Génération…" : "Générer la fiche"}
            </Button>
          </div>
        </div>
      )}

      {latest && (
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium">Dernière fiche générée — n° {latest.documentNumber}</p>
            <p className="text-xs text-muted-foreground">Générée le {formatDate(latest.generatedAt)}</p>
          </div>
          <a href={resolveUploadUrl(latest.filePath) ?? "#"} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
            Voir le PDF
          </a>
        </div>
      )}

      {documents.length > 1 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Historique</p>
          <div className="flex flex-col gap-2">
            {documents.slice(1).map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <p className="text-sm">
                  N° {d.documentNumber} — {formatDate(d.generatedAt)}
                </p>
                <a href={resolveUploadUrl(d.filePath) ?? "#"} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                  Voir
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
