import type { CashRegisterSessionDto } from "@isac-erp/shared";
import { Badge, Button, Dialog, Input, Label } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

/**
 * Fermeture de caisse (MODULE-04.3 §1.6/§3 règle 5) : le solde calculé et
 * l'écart ne portent que sur les espèces — affichés une fois la fermeture
 * confirmée par le serveur, jamais recalculés côté client.
 */
export function CloseCashSessionDialog({ session, onClose }: { session: CashRegisterSessionDto; onClose: () => void }) {
  const [closingBalanceDeclared, setClosingBalanceDeclared] = useState("");
  const [notes, setNotes] = useState("");
  const utils = trpc.useUtils();

  const close = trpc.cashRegisterSessions.close.useMutation({
    onSuccess: () => {
      void utils.cashRegisterSessions.getMyOpenSession.invalidate();
      void utils.cashRegisterSessions.list.invalidate();
    },
  });

  const result = close.data;

  return (
    <Dialog open onClose={onClose} title={`Fermer la caisse — ${session.cashRegisterName}`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Total encaissé (tous modes) pendant cette session : <strong>{session.totalCollected.toLocaleString("fr-FR")}</strong> (
          {session.paymentCount} opération(s)).
        </p>

        {!result ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>Solde compté en caisse (espèces uniquement)</Label>
              <Input
                type="number"
                min={0}
                value={closingBalanceDeclared}
                onChange={(e) => setClosingBalanceDeclared(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Notes (optionnel)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {close.error && <p className="text-sm text-destructive">{close.error.message}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button
                disabled={closingBalanceDeclared === "" || close.isPending}
                onClick={() =>
                  close.mutate({ id: session.id, closingBalanceDeclared: Number(closingBalanceDeclared), notes: notes || undefined })
                }
              >
                {close.isPending ? "Fermeture…" : "Confirmer la fermeture"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Solde calculé (espèces)</p>
                <p className="font-medium">{result.closingBalanceComputed?.toLocaleString("fr-FR")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Solde déclaré</p>
                <p className="font-medium">{result.closingBalanceDeclared?.toLocaleString("fr-FR")}</p>
              </div>
            </div>
            {result.variance !== null && result.variance !== 0 ? (
              <Badge variant="destructive">
                Écart de caisse : {result.variance > 0 ? "+" : ""}
                {result.variance.toLocaleString("fr-FR")}
              </Badge>
            ) : (
              <Badge variant="success">Aucun écart</Badge>
            )}
            <div className="flex justify-end">
              <Button onClick={onClose}>Fermer</Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
