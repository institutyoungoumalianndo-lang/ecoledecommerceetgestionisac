import { Button } from "@isac-erp/ui";
import { resolveUploadUrl } from "../../lib/upload";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

/** Carte de paiement (extension du 2026-07-30) : génération à la demande, sans cycle de vie propre — chaque génération est une nouvelle archive. */
export function PaymentCardTab({ studentId }: { studentId: string }) {
  const canGenerate = useHasPermission("DOCUMENTS:CREATION");
  const generate = trpc.paymentCards.generate.useMutation();

  if (!canGenerate) return <p className="text-sm text-muted-foreground">Accès non autorisé.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-start gap-3 rounded-lg border border-border p-4">
        <p className="text-sm text-muted-foreground">
          Génère une carte de paiement (montants scolarité/inscription et échéancier des tranches) pour cet étudiant.
        </p>
        {generate.error && <p className="text-sm text-destructive">{generate.error.message}</p>}
        <Button disabled={generate.isPending} onClick={() => generate.mutate({ studentId })}>
          {generate.isPending ? "Génération…" : "Générer la carte de paiement"}
        </Button>
        {generate.data && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Carte générée — n° <strong>{generate.data.documentNumber}</strong>.{" "}
            <a
              className="underline"
              href={resolveUploadUrl(generate.data.filePath) ?? "#"}
              target="_blank"
              rel="noreferrer"
            >
              Télécharger le PDF
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
