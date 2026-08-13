import { Button, Dialog, Label } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

/** Annulation sécurisée d'un paiement (MODULE-04.3 §1.7/§3 règle 6) — justification obligatoire, jamais de suppression physique. */
export function CancelPaymentDialog({
  paymentId,
  receiptNumber,
  onClose,
}: {
  paymentId: string;
  receiptNumber: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const utils = trpc.useUtils();

  const cancel = trpc.payments.cancel.useMutation({
    onSuccess: () => {
      void utils.payments.list.invalidate();
      void utils.payments.getById.invalidate();
      void utils.feeSummary.getForStudent.invalidate();
      void utils.cashRegisterSessions.getMyOpenSession.invalidate();
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title={`Annuler le reçu ${receiptNumber}`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Cette action ne supprime rien physiquement : le paiement reste visible dans l'historique, marqué comme
          annulé. Une justification est obligatoire.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label>Motif de l'annulation</Label>
          <textarea
            className="min-h-20 rounded-md border border-white bg-background text-foreground px-3 py-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        {cancel.error && <p className="text-sm text-destructive">{cancel.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || cancel.isPending}
            onClick={() => cancel.mutate({ id: paymentId, reason })}
          >
            {cancel.isPending ? "Annulation…" : "Confirmer l'annulation"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
