import { Button, Dialog, Input, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useAuthStore } from "../../store/authStore";

/** Dépense (MODULE-07 §1.3/§8.4) — créée en brouillon, l'écriture n'est générée qu'à l'approbation. */
export function CreateExpenseDialog({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const categoriesQuery = trpc.expenseCategories.list.useQuery();
  const suppliersQuery = trpc.suppliers.list.useQuery({});
  const methodsQuery = trpc.paymentMethods.list.useQuery();
  const openSessionsQuery = trpc.cashRegisterSessions.list.useQuery({ status: "OUVERTE" });
  const utils = trpc.useUtils();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [cashRegisterSessionId, setCashRegisterSessionId] = useState("");
  const [observations, setObservations] = useState("");

  const create = trpc.expenses.create.useMutation({
    onSuccess: () => {
      void utils.expenses.list.invalidate();
      onClose();
    },
  });

  function submit() {
    if (!user) return;
    create.mutate({
      date: new Date(date),
      label,
      categoryId,
      supplierId: supplierId || undefined,
      amount: Number(amount),
      paymentMethodId,
      cashRegisterSessionId: cashRegisterSessionId || undefined,
      responsibleUserId: user.id,
      observations: observations || undefined,
    });
  }

  const canSubmit = Boolean(label && categoryId && amount && Number(amount) > 0 && paymentMethodId);

  return (
    <Dialog open onClose={onClose} title="Enregistrer une dépense">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Montant</Label>
            <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>Libellé</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Catégorie</Label>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">—</option>
              {(categoriesQuery.data ?? []).filter((c) => c.isActive).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Fournisseur (optionnel)</Label>
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">—</option>
              {(suppliersQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Mode de paiement</Label>
            <Select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}>
              <option value="">—</option>
              {(methodsQuery.data ?? []).filter((m) => m.isActive).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Caisse (facultatif — si payée en espèces depuis une caisse)</Label>
            <Select value={cashRegisterSessionId} onChange={(e) => setCashRegisterSessionId(e.target.value)}>
              <option value="">—</option>
              {(openSessionsQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.cashRegisterName} — ouverte le {new Date(s.openedAt).toLocaleDateString("fr-FR")}
                </option>
              ))}
            </Select>
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>Observations</Label>
            <Input value={observations} onChange={(e) => setObservations(e.target.value)} />
          </div>
        </div>
        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={!canSubmit || create.isPending} onClick={submit}>
            {create.isPending ? "Enregistrement…" : "Enregistrer en brouillon"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
