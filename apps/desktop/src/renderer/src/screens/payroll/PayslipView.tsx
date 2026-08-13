import type { PayrollLineDto } from "@isac-erp/shared";
import { Button, Dialog } from "@isac-erp/ui";
import { useEffect } from "react";
import { resolveUploadUrl } from "../../lib/upload";
import { trpc } from "../../lib/trpc";

/**
 * Bulletin de paie officiel (MODULE-08 §1.10/§11.10) — migré du rendu HTML/window.print() vers le
 * moteur PDF centralisé le 2026-07-30 (voir CHANGELOG). Uniquement proposé pour les lignes VALIDEE
 * (voir PayrollLineDetailDialog.tsx) : les données sont figées, la génération est donc idempotente
 * côté serveur (voir documentEngineService.ts) — un seul document archivé par ligne de paie, quel
 * que soit le nombre de consultations. Le double exemplaire Employé/Administration, initialement
 * ajouté sur demande explicite, a été retiré à la demande du porteur du projet — impossible à
 * afficher/imprimer correctement sur une seule feuille — un seul exemplaire est désormais généré.
 */
export function PayslipView({ line, onClose }: { line: PayrollLineDto; onClose: () => void }) {
  const generate = trpc.documents.generate.useMutation();

  useEffect(() => {
    generate.mutate({ documentType: "BULLETIN_SALAIRE", payrollLineId: line.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line.id]);

  return (
    <Dialog open onClose={onClose} title={`Bulletin de paie — ${line.payPeriodLabel}`}>
      <div className="flex flex-col gap-4">
        {generate.isPending && <p className="text-sm text-muted-foreground">Génération du bulletin…</p>}
        {generate.error && <p className="text-sm text-destructive">{generate.error.message}</p>}
        {generate.data && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p>
              Bulletin <strong>{generate.data.documentNumber}</strong> prêt.
            </p>
            <a
              className="mt-1 inline-block underline"
              href={resolveUploadUrl(generate.data.filePath) ?? "#"}
              target="_blank"
              rel="noreferrer"
            >
              Voir / imprimer le PDF
            </a>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
