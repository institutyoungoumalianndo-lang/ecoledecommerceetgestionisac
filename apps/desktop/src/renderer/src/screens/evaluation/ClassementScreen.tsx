import { Button, Card, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { InstitutionalHeaderPrint } from "../../components/print/InstitutionalHeaderPrint";
import { resolveUploadUrl } from "../../lib/upload";
import { usePrintThemeStyle } from "../../lib/printTheme";
import { trpc } from "../../lib/trpc";
import { DECISION_LABELS } from "./decisionLabels";

/**
 * Classement par mérite (MODULE-06 §1.9) — jamais stocké, recalculé à la demande, imprimable.
 *
 * Même traitement "Relevé officiel" que les bulletins (2026-08-03, retour du porteur du projet) :
 * en-tête institutionnelle partagée (`InstitutionalHeaderPrint`, réutilise les réglages du modèle
 * BULLETIN — aucun type de document dédié n'existe pour ce classement, jamais stocké), tableau à
 * grille complète, signature et cachet institutionnel.
 */
export function ClassementScreen() {
  const [academicYearId, setAcademicYearId] = useState("");
  const [filiereId, setFiliereId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [periodId, setPeriodId] = useState("");

  const printThemeStyle = usePrintThemeStyle();
  const yearsQuery = trpc.academicYears.list.useQuery();
  const filieresQuery = trpc.filieres.list.useQuery();
  const levelsQuery = trpc.levels.list.useQuery();
  const periodsQuery = trpc.academicPeriods.list.useQuery({ academicYearId }, { enabled: Boolean(academicYearId) });
  const stampQuery = trpc.branding.stamp.get.useQuery();
  const templatesQuery = trpc.branding.documentTemplates.list.useQuery();
  const signatoriesQuery = trpc.branding.signatories.list.useQuery();

  const classementQuery = trpc.classement.get.useQuery(
    { filiereId, levelId, academicYearId, academicPeriodId: periodId || null },
    { enabled: Boolean(filiereId && levelId && academicYearId) }
  );

  const filiere = (filieresQuery.data ?? []).find((f) => f.id === filiereId);
  const level = (levelsQuery.data ?? []).find((l) => l.id === levelId);
  const year = (yearsQuery.data ?? []).find((y) => y.id === academicYearId);
  const period = (periodsQuery.data ?? []).find((p) => p.id === periodId);
  const stamp = stampQuery.data;
  const template = templatesQuery.data?.find((t) => t.documentType === "BULLETIN");
  const showStamp = template?.showStamp && stamp?.imagePath && stamp.applicableDocumentTypes.includes("BULLETIN");
  // Deux signatures fixes (retour du porteur du projet, 2026-08-03) — même règle que la fiche
  // d'inscription complétée : le nom du Directeur des Études n'est jamais imprimé (seul le poste),
  // celui du Directeur est le signataire configuré sous le rôle "Directeur de Campus".
  const etudesDirector = signatoriesQuery.data?.find((s) => s.roleCode === "DIRECTEUR_ETUDES");
  const campusDirector = signatoriesQuery.data?.find((s) => s.roleCode === "DIRECTEUR_CAMPUS");

  return (
    <div className="flex flex-col gap-4">
      <Card variant="static" className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
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
          <Label>Filière</Label>
          <Select value={filiereId} onChange={(e) => setFiliereId(e.target.value)}>
            <option value="">—</option>
            {(filieresQuery.data ?? []).map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </Select>
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
          <Label>Période</Label>
          <Select value={periodId} disabled={!academicYearId} onChange={(e) => setPeriodId(e.target.value)}>
            <option value="">Annuel</option>
            {(periodsQuery.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </Select>
        </div>
      </Card>

      {!filiereId || !levelId || !academicYearId ? (
        <p className="text-sm text-muted-foreground">Sélectionnez une filière, un niveau et une année.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Button onClick={() => window.print()}>Imprimer</Button>
          </div>
          <div data-print-area style={printThemeStyle} className="rounded-lg border print-border bg-background p-8 text-sm print-text">
            <InstitutionalHeaderPrint documentType="BULLETIN" />

            <hr className="my-3 border-t-2 print-separator" />
            <p className="text-center text-base font-semibold uppercase tracking-[0.18em] print-title">Classement par mérite</p>
            <p className="mt-1 text-center text-xs uppercase tracking-wide print-text-secondary">
              {filiere?.name} — {level?.label} — {year?.label} — {period ? period.label : "Annuel"}
            </p>
            <hr className="mb-6 mt-2 border-t print-separator" />

            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[7%]" />
                <col className="w-[16%]" />
                <col className="w-[38%]" />
                <col className="w-[11%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className="border-b-2 print-separator px-2 py-2 text-center text-xs uppercase tracking-wide print-header">Rang</th>
                  <th className="border-b-2 print-separator px-2 py-2 text-left text-xs uppercase tracking-wide print-header">Matricule</th>
                  <th className="border-b-2 print-separator px-2 py-2 text-left text-xs uppercase tracking-wide print-header">Étudiant</th>
                  <th className="border-b-2 print-separator px-2 py-2 text-right text-xs uppercase tracking-wide print-header">Moyenne</th>
                  <th className="border-b-2 print-separator px-2 py-2 text-left text-xs uppercase tracking-wide print-header">Mention</th>
                  <th className="border-b-2 print-separator px-2 py-2 text-left text-xs uppercase tracking-wide print-header">Décision</th>
                </tr>
              </thead>
              <tbody>
                {(classementQuery.data ?? []).map((row) => (
                  <tr key={row.studentId}>
                    <td className={`border-b print-table-border px-2 py-2 text-center tabular-nums ${row.rang <= 3 ? "font-bold" : ""}`}>
                      {row.rang}
                    </td>
                    <td className="border-b print-table-border px-2 py-2 tabular-nums">{row.matricule}</td>
                    <td className="border-b print-table-border px-2 py-2 font-medium leading-snug">{row.studentName}</td>
                    <td className="border-b print-table-border px-2 py-2 text-right font-medium tabular-nums">{row.moyenne}</td>
                    <td className="border-b print-table-border px-2 py-2">{row.mention}</td>
                    <td className="border-b print-table-border px-2 py-2">{DECISION_LABELS[row.decision] ?? row.decision}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(classementQuery.data ?? []).length === 0 && (
              <p className="mt-4 text-center print-text-secondary">
                {classementQuery.isLoading ? "Chargement…" : "Aucune moyenne calculable pour ce contexte."}
              </p>
            )}

            {(classementQuery.data ?? []).length > 0 && (
              <>
                <div className="mt-12 flex items-end justify-center gap-14">
                  <div className="text-center text-xs">
                    {etudesDirector?.signatureImagePath && (
                      <img src={resolveUploadUrl(etudesDirector.signatureImagePath)!} alt="" className="mx-auto h-10 object-contain" />
                    )}
                    <div className="mt-1 w-36 border-t print-separator pt-1 font-medium">Le Directeur des Études</div>
                  </div>
                  {showStamp && (
                    <img src={resolveUploadUrl(stamp!.imagePath)!} alt="" className="h-16 w-16 object-contain opacity-80" />
                  )}
                  <div className="text-center text-xs">
                    {campusDirector?.signatureImagePath && (
                      <img src={resolveUploadUrl(campusDirector.signatureImagePath)!} alt="" className="mx-auto h-10 object-contain" />
                    )}
                    <div className="mt-1 w-36 border-t print-separator pt-1">
                      <p className="font-medium">Le Directeur</p>
                      {campusDirector?.displayName && <p className="print-text-secondary">{campusDirector.displayName}</p>}
                    </div>
                  </div>
                </div>
                <p className="mt-6 text-center text-[10px] print-text-secondary">
                  Effectif : {(classementQuery.data ?? []).length} étudiant(s) — Document généré le {new Date().toLocaleDateString("fr-FR")}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
