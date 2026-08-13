import type { JournalEntryLineInput } from "@isac-erp/shared";
import { Button, Dialog, Input, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

interface DraftLine {
  accountId: string;
  side: "debit" | "credit";
  amount: string;
}

/** Écriture manuelle (MODULE-07 §1.3) — pour ce qui ne peut pas être généré automatiquement. */
export function CreateJournalEntryDialog({ onClose }: { onClose: () => void }) {
  const accountsQuery = trpc.chartAccounts.list.useQuery({});
  const utils = trpc.useUtils();
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { accountId: "", side: "debit", amount: "" },
    { accountId: "", side: "credit", amount: "" },
  ]);

  const create = trpc.journalEntries.create.useMutation({
    onSuccess: () => {
      void utils.journalEntries.list.invalidate();
      void utils.financialReports.trialBalance.invalidate();
      onClose();
    },
  });

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { accountId: "", side: "debit", amount: "" }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  const totalDebit = lines.filter((l) => l.side === "debit").reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const totalCredit = lines.filter((l) => l.side === "credit").reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const balanced = lines.length >= 2 && totalDebit === totalCredit && totalDebit > 0;

  function submit() {
    const payloadLines: JournalEntryLineInput[] = lines
      .filter((l) => l.accountId && Number(l.amount) > 0)
      .map((l) => ({
        accountId: l.accountId,
        debit: l.side === "debit" ? Number(l.amount) : 0,
        credit: l.side === "credit" ? Number(l.amount) : 0,
      }));
    create.mutate({ entryDate: new Date(entryDate), label, lines: payloadLines });
  }

  return (
    <Dialog open onClose={onClose} title="Nouvelle écriture manuelle">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Date</Label>
            <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Libellé</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Lignes</Label>
          {lines.map((line, index) => (
            <div key={index} className="flex items-center gap-2">
              <Select
                className="flex-1"
                value={line.accountId}
                onChange={(e) => updateLine(index, { accountId: e.target.value })}
              >
                <option value="">— Compte —</option>
                {(accountsQuery.data ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.label}
                  </option>
                ))}
              </Select>
              <Select className="w-28" value={line.side} onChange={(e) => updateLine(index, { side: e.target.value as "debit" | "credit" })}>
                <option value="debit">Débit</option>
                <option value="credit">Crédit</option>
              </Select>
              <Input
                type="number"
                min={0}
                className="w-32"
                value={line.amount}
                onChange={(e) => updateLine(index, { amount: e.target.value })}
              />
              <Button variant="outline" onClick={() => removeLine(index)} disabled={lines.length <= 2}>
                ✕
              </Button>
            </div>
          ))}
          <Button variant="outline" className="self-start" onClick={addLine}>
            Ajouter une ligne
          </Button>
        </div>

        <p className={`text-sm ${balanced ? "text-success" : "text-destructive"}`}>
          Total débit : {totalDebit.toLocaleString("fr-FR")} — Total crédit : {totalCredit.toLocaleString("fr-FR")}
          {!balanced && " (l'écriture doit être équilibrée)"}
        </p>

        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={!balanced || !label || create.isPending} onClick={submit}>
            {create.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
