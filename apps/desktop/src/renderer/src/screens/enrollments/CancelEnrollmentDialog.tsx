import { Button, Dialog, Input, Label } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

/** MODULE-04.1 §3.4 : annulation réversible, jamais de suppression physique. */
export function CancelEnrollmentDialog({
  enrollmentId,
  onClose,
  onCancelled,
}: {
  enrollmentId: string;
  onClose: () => void;
  onCancelled?: () => void;
}) {
  const [reason, setReason] = useState("");
  const utils = trpc.useUtils();
  const cancel = trpc.enrollments.cancel.useMutation({
    onSuccess: () => {
      void utils.enrollments.list.invalidate();
      onCancelled?.();
      onClose();
    },
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Annuler cette inscription"
      description="L'inscription reste visible dans l'historique — cette action est réversible en créant une nouvelle inscription si besoin."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Motif</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {cancel.error && <p className="text-sm text-destructive">{cancel.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Retour
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || cancel.isPending}
            onClick={() => cancel.mutate({ enrollmentId, reason })}
          >
            {cancel.isPending ? "Annulation…" : "Annuler l'inscription"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
