import type { BulletinPeriodeDto } from "@isac-erp/shared";
import { Button, Card, Label, Select } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc";
import { BulletinPeriodeView } from "../evaluation/BulletinPeriodeView";
import { StudentBulletinsDialog } from "../evaluation/StudentBulletinsDialog";

/**
 * Notes / Bulletins de l'étudiant (MODULE-06 §1.7/§1.8) — remplace le placeholder "à venir" de
 * l'onglet dédié (2026-08-03, retour du porteur du projet : Module 6 déjà livré et validé entretemps).
 *
 * Lecture seule : les notes obtenues s'affichent directement dès l'accès à l'onglet, comme dans l'écran
 * de saisie — leur modification se fait exclusivement depuis "Saisie de notes", hors de la fiche
 * étudiant (retour du porteur du projet, 2026-08-03). La génération/annulation de bulletin et l'aperçu
 * imprimable réutilisent `StudentBulletinsDialog`/`BulletinPeriodeView` tels quels (déjà utilisés depuis
 * `BulletinsScreen.tsx`), sans dupliquer leur logique.
 */
export function StudentNotesTab({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [academicYearId, setAcademicYearId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewingBulletin, setViewingBulletin] = useState<BulletinPeriodeDto | null>(null);

  const yearsQuery = trpc.academicYears.list.useQuery();
  const years = yearsQuery.data ?? [];
  const activeYearId = years.find((y) => y.isActive)?.id ?? "";
  const effectiveYearId = academicYearId || activeYearId;

  const periodsQuery = trpc.academicPeriods.list.useQuery({ academicYearId: effectiveYearId }, { enabled: Boolean(effectiveYearId) });
  const periods = periodsQuery.data ?? [];
  const periodeListQuery = trpc.bulletinsPeriode.listByStudent.useQuery({ studentId });
  const annuelListQuery = trpc.bulletinsAnnuels.listByStudent.useQuery({ studentId });

  // Présélectionne le semestre du bulletin le plus récemment généré dans l'année choisie (sinon le
  // premier semestre de l'année) — les notes s'affichent ainsi sans action de l'utilisateur.
  useEffect(() => {
    if (periodId || !periodsQuery.data || periodsQuery.data.length === 0) return;
    const periodIdsInYear = new Set(periodsQuery.data.map((p) => p.id));
    const latest = [...(periodeListQuery.data ?? [])]
      .filter((b) => periodIdsInYear.has(b.academicPeriodId) && !b.annule)
      .sort((a, b) => new Date(b.genereLe).getTime() - new Date(a.genereLe).getTime())[0];
    setPeriodId(latest?.academicPeriodId ?? periodsQuery.data[0]!.id);
  }, [periodsQuery.data, periodeListQuery.data, periodId]);

  const bulletin = (periodeListQuery.data ?? []).find((b) => b.academicPeriodId === periodId && !b.annule);
  const bulletinAnnuel = (annuelListQuery.data ?? []).find((b) => b.academicYearId === effectiveYearId && !b.annule);

  return (
    <div className="flex flex-col gap-4">
      <Card variant="static" className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Année universitaire</Label>
          <Select
            value={effectiveYearId}
            onChange={(e) => {
              setAcademicYearId(e.target.value);
              setPeriodId("");
            }}
          >
            <option value="">—</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Semestre</Label>
          <Select value={periodId} disabled={!effectiveYearId} onChange={(e) => setPeriodId(e.target.value)}>
            <option value="">—</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {!effectiveYearId ? (
        <p className="text-sm text-muted-foreground">Sélectionnez une année universitaire.</p>
      ) : !periodId ? (
        <p className="text-sm text-muted-foreground">Sélectionnez un semestre pour afficher les notes.</p>
      ) : !bulletin ? (
        <p className="text-sm text-muted-foreground">Aucun bulletin généré pour ce semestre — aucune note à afficher.</p>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Notes — {bulletin.academicPeriodLabel} ({bulletin.classLabel})
            </p>
            <Button variant="outline" onClick={() => setViewingBulletin(bulletin)}>
              Voir le bulletin imprimable
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-1.5">Matière</th>
                  <th className="py-1.5 text-right">Coeff.</th>
                  <th className="py-1.5 text-right">Orale</th>
                  <th className="py-1.5 text-right">Écrite</th>
                  <th className="py-1.5 text-right">Composition</th>
                  <th className="py-1.5 text-right">Note finale</th>
                </tr>
              </thead>
              <tbody>
                {bulletin.matieres.map((m) => (
                  <tr key={m.subjectOfferingId} className="border-b border-border">
                    <td className="py-1.5">{m.subjectName}</td>
                    <td className="py-1.5 text-right">{m.coefficient}</td>
                    <td className="py-1.5 text-right">{m.noteOrale ?? "—"}</td>
                    <td className="py-1.5 text-right">{m.noteEcrite ?? "—"}</td>
                    <td className="py-1.5 text-right">{m.noteComposition ?? "—"}</td>
                    <td className="py-1.5 text-right font-medium">{m.noteFinale ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>Rang : {bulletin.rang ?? "—"} / {bulletin.effectifClasse}</span>
            <span>Mention : {bulletin.mention}</span>
            <span>Régularité : {bulletin.regularite}</span>
            <span className="font-medium text-foreground">
              Moyenne : {bulletin.moyenne ?? "—"} — {bulletin.decision}
            </span>
          </div>
        </div>
      )}

      {bulletinAnnuel && (
        <p className="text-sm text-muted-foreground">
          Bulletin annuel {bulletinAnnuel.academicYearLabel} disponible — moyenne annuelle {bulletinAnnuel.moyenneAnnuelle ?? "—"}.
        </p>
      )}

      {effectiveYearId && periodId && (
        <Button variant="outline" className="w-fit" onClick={() => setDialogOpen(true)}>
          Générer / annuler un bulletin
        </Button>
      )}

      {dialogOpen && periodId && effectiveYearId && (
        <StudentBulletinsDialog
          studentId={studentId}
          studentName={studentName}
          academicPeriodId={periodId}
          academicYearId={effectiveYearId}
          onClose={() => setDialogOpen(false)}
        />
      )}

      {viewingBulletin && <BulletinPeriodeView bulletin={viewingBulletin} onClose={() => setViewingBulletin(null)} />}
    </div>
  );
}
