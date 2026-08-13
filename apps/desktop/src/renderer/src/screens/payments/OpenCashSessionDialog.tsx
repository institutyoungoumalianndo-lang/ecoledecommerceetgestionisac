import { Button, Dialog, Label, Select, Input } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

/** Ouverture de caisse (MODULE-04.3 §1.6/§3 règle 1) — solde initial obligatoire. */
export function OpenCashSessionDialog({ onClose }: { onClose: () => void }) {
  const registersQuery = trpc.cashRegisters.list.useQuery();
  const [cashRegisterId, setCashRegisterId] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [notes, setNotes] = useState("");
  const utils = trpc.useUtils();

  const open = trpc.cashRegisterSessions.open.useMutation({
    onSuccess: () => {
      void utils.cashRegisterSessions.getMyOpenSession.invalidate();
      void utils.cashRegisterSessions.list.invalidate();
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Ouvrir une session de caisse">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Caisse</Label>
          <Select value={cashRegisterId} onChange={(e) => setCashRegisterId(e.target.value)}>
            <option value="">—</option>
            {(registersQuery.data ?? [])
              .filter((r) => r.isActive)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Solde initial</Label>
          <Input type="number" min={0} value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Notes (optionnel)</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {open.error && <p className="text-sm text-destructive">{open.error.message}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={!cashRegisterId || openingBalance === "" || open.isPending}
            onClick={() =>
              open.mutate({ cashRegisterId, openingBalance: Number(openingBalance), notes: notes || undefined })
            }
          >
            {open.isPending ? "Ouverture…" : "Ouvrir la caisse"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
