import { Button, Dialog, Label } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

/** Annulation par contre-passation (MODULE-07 §1.6) — jamais de suppression, une écriture miroir inverse est créée. */
export function CancelJournalEntryDialog({
  entryId,
  entryNumber,
  onClose,
}: {
  entryId: string;
  entryNumber: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const utils = trpc.useUtils();

  const cancel = trpc.journalEntries.cancel.useMutation({
    onSuccess: () => {
      void utils.journalEntries.list.invalidate();
      void utils.financialReports.trialBalance.invalidate();
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title={`Annuler l'écriture ${entryNumber}`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Aucune écriture n'est jamais supprimée : une écriture de contre-passation (montants inversés) sera créée
          automatiquement.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label>Motif</Label>
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
          <Button variant="destructive" disabled={!reason.trim() || cancel.isPending} onClick={() => cancel.mutate({ id: entryId, reason })}>
            {cancel.isPending ? "Annulation…" : "Confirmer"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
