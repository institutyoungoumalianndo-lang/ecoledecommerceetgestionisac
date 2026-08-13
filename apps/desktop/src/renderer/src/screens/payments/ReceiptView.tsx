import type { PaymentDto } from "@isac-erp/shared";
import { Button, Dialog } from "@isac-erp/ui";
import { useEffect } from "react";
import { resolveUploadUrl } from "../../lib/upload";
import { trpc } from "../../lib/trpc";

/**
 * Reçu officiel (MODULE-04.3 §1.5) — migré du rendu HTML/window.print() vers le moteur PDF
 * centralisé le 2026-07-30 (voir CHANGELOG). Génère (ou récupère, si déjà généré — l'appel est
 * idempotent côté serveur, voir documentEngineService.ts) l'archive officielle dès l'ouverture, puis
 * propose son téléchargement. Le numéro affiché est celui du document archivé — identique à
 * `payment.receiptNumber`, ce reçu n'a pas de série de numérotation propre.
 */
export function ReceiptView({ payment, onClose }: { payment: PaymentDto; onClose: () => void }) {
  const generate = trpc.documents.generate.useMutation();

  useEffect(() => {
    generate.mutate({ documentType: "RECU_PAIEMENT", paymentId: payment.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment.id]);

  return (
    <Dialog open onClose={onClose} title={`Reçu ${payment.receiptNumber}`}>
      <div className="flex flex-col gap-4">
        {generate.isPending && <p className="text-sm text-muted-foreground">Génération du reçu…</p>}
        {generate.error && <p className="text-sm text-destructive">{generate.error.message}</p>}
        {generate.data && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p>
              Reçu <strong>{generate.data.documentNumber}</strong> prêt.
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
