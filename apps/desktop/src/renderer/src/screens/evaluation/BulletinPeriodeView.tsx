import type { BulletinPeriodeDto } from "@isac-erp/shared";
import { Button, Dialog } from "@isac-erp/ui";
import { User } from "lucide-react";
import { InstitutionalHeaderPrint } from "../../components/print/InstitutionalHeaderPrint";
import { resolveUploadUrl } from "../../lib/upload";
import { usePrintThemeStyle } from "../../lib/printTheme";
import { trpc } from "../../lib/trpc";
import { DECISION_LABELS } from "./decisionLabels";

/**
 * Bulletin de période imprimable (MODULE-06 §1.7) — écran HTML/CSS, aucun fichier PDF stocké
 * (même mécanisme que le bulletin de paie/reçu — voir ADR-037).
 *
 * Mise en page "Relevé officiel" (2026-08-03, retour du porteur du projet sur maquette : 3 options
 * proposées, celle-ci retenue) : composition centrée façon acte administratif, filets fins, tableau
 * à grille complète, décision imprimée en cachet. Couleurs exclusivement via les classes `.print-*`
 * (thème piloté depuis Paramètres → Thème d'impression) — aucune couleur codée en dur. En-tête
 * institutionnelle (République/devise/logos gauche-droite) partagée avec les documents PDF via
 * `InstitutionalHeaderPrint` (retour du porteur du projet, 2026-08-03 : absente jusqu'ici sur ce document).
 */
export function BulletinPeriodeView({ bulletin, onClose }: { bulletin: BulletinPeriodeDto; onClose: () => void }) {
  const stampQuery = trpc.branding.stamp.get.useQuery();
  const templatesQuery = trpc.branding.documentTemplates.list.useQuery();
  const signatoriesQuery = trpc.branding.signatories.list.useQuery();
  const printThemeStyle = usePrintThemeStyle();

  const stamp = stampQuery.data;
  const template = templatesQuery.data?.find((t) => t.documentType === "BULLETIN");
  const signatory = signatoriesQuery.data?.find((s) => s.roleCode === template?.signatoryRoleCode);
  const showStamp = template?.showStamp && stamp?.imagePath && stamp.applicableDocumentTypes.includes("BULLETIN");
  const photoUrl = resolveUploadUrl(bulletin.studentPhotoPath);

  return (
    <Dialog open onClose={onClose} title={`Bulletin — ${bulletin.academicPeriodLabel}`}>
      <div className="flex flex-col gap-4">
        <div data-print-area style={printThemeStyle} className="rounded-lg border print-border bg-background p-8 text-sm print-text">
          <InstitutionalHeaderPrint documentType="BULLETIN" />

          <hr className="my-3 border-t-2 print-separator" />
          <p className="text-center text-sm font-semibold uppercase tracking-[0.14em] print-title">Bulletin de notes</p>
          <p className="mt-0.5 text-center text-xs print-text-secondary">
            {bulletin.academicPeriodLabel} — Année universitaire {bulletin.academicYearLabel}
          </p>
          <hr className="mb-5 mt-2 border-t print-separator" />

          <div className="mb-5 flex gap-4">
            <div className="flex h-20 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded border print-box">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-7 w-7 print-text-secondary" />
              )}
            </div>
            <table className="text-sm">
              <tbody>
                <tr>
                  <td className="w-28 pb-1 pr-3 align-top text-xs uppercase tracking-wide print-text-secondary">Étudiant</td>
                  <td className="pb-1 font-semibold">{bulletin.studentName}</td>
                </tr>
                <tr>
                  <td className="pb-1 pr-3 align-top text-xs uppercase tracking-wide print-text-secondary">Matricule</td>
                  <td className="pb-1 font-medium tabular-nums">{bulletin.studentMatricule}</td>
                </tr>
                <tr>
                  <td className="pr-3 align-top text-xs uppercase tracking-wide print-text-secondary">Classe</td>
                  <td className="font-medium">{bulletin.classLabel} — {bulletin.filiereLabel ?? bulletin.levelLabel}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <table className="mb-5 w-full border print-table-border text-sm">
            <thead>
              <tr>
                <th className="border print-table-border px-2 py-1.5 text-left text-xs uppercase print-header">Matière</th>
                <th className="border print-table-border px-2 py-1.5 text-right text-xs uppercase print-header">Coeff.</th>
                <th className="border print-table-border px-2 py-1.5 text-right text-xs uppercase print-header">Orale</th>
                <th className="border print-table-border px-2 py-1.5 text-right text-xs uppercase print-header">Écrite</th>
                <th className="border print-table-border px-2 py-1.5 text-right text-xs uppercase print-header">Composition</th>
                <th className="border print-table-border px-2 py-1.5 text-right text-xs uppercase print-header">Note finale</th>
              </tr>
            </thead>
            <tbody>
              {bulletin.matieres.map((m) => (
                <tr key={m.subjectOfferingId}>
                  <td className="border print-table-border px-2 py-1">{m.subjectName}</td>
                  <td className="border print-table-border px-2 py-1 text-right tabular-nums">{m.coefficient}</td>
                  <td className="border print-table-border px-2 py-1 text-right tabular-nums">{m.noteOrale ?? "—"}</td>
                  <td className="border print-table-border px-2 py-1 text-right tabular-nums">{m.noteEcrite ?? "—"}</td>
                  <td className="border print-table-border px-2 py-1 text-right tabular-nums">{m.noteComposition ?? "—"}</td>
                  <td className="border print-table-border px-2 py-1 text-right font-medium tabular-nums">{m.noteFinale ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t print-separator pt-3">
            <div className="text-sm leading-7 print-text-secondary">
              Moyenne générale : <strong className="print-text tabular-nums">{bulletin.moyenne ?? "—"} / 20</strong>
              <br />
              Rang : <strong className="print-text tabular-nums">{bulletin.rang ?? "—"} / {bulletin.effectifClasse}</strong>
              {" "}&bull; Mention : <strong className="print-text">{bulletin.mention}</strong>
              <br />
              Régularité : <strong className="print-text">{bulletin.regularite}</strong>
            </div>
            <div
              className="-rotate-3 rounded border-2 px-4 py-2 text-center text-sm font-bold uppercase tracking-wide print-net"
              style={{ borderColor: "var(--print-net-amount-color, #000000)" }}
            >
              {DECISION_LABELS[bulletin.decision] ?? bulletin.decision}
            </div>
          </div>

          <div className="mt-8 flex items-end justify-center gap-6">
            {signatory && (
              <div className="text-center text-xs">
                {signatory.signatureImagePath && (
                  <img src={resolveUploadUrl(signatory.signatureImagePath)!} alt="" className="mx-auto h-10 object-contain" />
                )}
                <div className="mt-1 w-32 border-t print-separator pt-1">{signatory.displayName ?? signatory.title ?? ""}</div>
              </div>
            )}
            {showStamp && (
              <img src={resolveUploadUrl(stamp!.imagePath)!} alt="" className="h-16 w-16 object-contain opacity-80" />
            )}
          </div>

          <p className="mt-6 text-center text-[10px] print-text-secondary">
            N° dossier : {bulletin.numeroDossier} — Code de vérification : {bulletin.verificationCode}
            {bulletin.annule && <strong className="print-text"> — ANNULÉ</strong>}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button onClick={() => window.print()}>Imprimer</Button>
        </div>
      </div>
    </Dialog>
  );
}
