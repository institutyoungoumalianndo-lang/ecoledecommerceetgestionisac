import { Badge, Button, Dialog, Input, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const STATUS_LABELS: Record<string, string> = { EN_ATTENTE: "En attente", DEDUITE: "Déduite", ANNULEE: "Annulée" };

/** Avances sur salaire de l'employé (MODULE-08 §1.8) — jamais supprimées, seulement annulées. */
export function EmployeeAdvancesTab({ employeeId }: { employeeId: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const canView = useHasPermission("PAIE_AVANCES:LECTURE");
  const canCreate = useHasPermission("PAIE_AVANCES:CREATION");
  const canCancel = useHasPermission("PAIE_AVANCES:SUPPRESSION");
  const utils = trpc.useUtils();

  const query = trpc.salaryAdvances.list.useQuery({ employeeId });
  const cancel = trpc.salaryAdvances.cancel.useMutation({
    onSuccess: () => void utils.salaryAdvances.list.invalidate({ employeeId }),
  });

  if (!canView) return <p className="text-sm text-muted-foreground">Accès non autorisé.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        {canCreate && <Button onClick={() => setCreateOpen(true)}>Accorder une avance</Button>}
      </div>

      {(query.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucune avance.</p>}

      <div className="flex flex-col gap-2">
        {(query.data ?? []).map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">{a.amount.toLocaleString("fr-FR")} — accordée sur {a.grantedPayPeriodLabel}</p>
              <p className="text-xs text-muted-foreground">
                {a.deductionPayPeriodLabel ? `À déduire sur ${a.deductionPayPeriodLabel}` : "Déduite dès que possible"}
                {a.reason ? ` — ${a.reason}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={a.status === "EN_ATTENTE" ? "muted" : a.status === "DEDUITE" ? "success" : "destructive"}>
                {STATUS_LABELS[a.status] ?? a.status}
              </Badge>
              {canCancel && a.status === "EN_ATTENTE" && (
                <Button variant="destructive" onClick={() => cancel.mutate({ id: a.id })}>
                  Annuler
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {createOpen && <CreateAdvanceDialog employeeId={employeeId} onClose={() => setCreateOpen(false)} />}
    </div>
  );
}

function CreateAdvanceDialog({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
  const utils = trpc.useUtils();
  const periodsQuery = trpc.payPeriods.list.useQuery({});
  const [amount, setAmount] = useState("");
  const [grantedPayPeriodId, setGrantedPayPeriodId] = useState("");
  const [deductionPayPeriodId, setDeductionPayPeriodId] = useState("");
  const [reason, setReason] = useState("");

  const create = trpc.salaryAdvances.create.useMutation({
    onSuccess: () => {
      void utils.salaryAdvances.list.invalidate({ employeeId });
      onClose();
    },
  });

  const openPeriods = (periodsQuery.data ?? []).filter((p) => p.status !== "CLOTURE");

  return (
    <Dialog open onClose={onClose} title="Accorder une avance sur salaire">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Montant</Label>
          <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Période d'octroi</Label>
          <Select value={grantedPayPeriodId} onChange={(e) => setGrantedPayPeriodId(e.target.value)}>
            <option value="">—</option>
            {openPeriods.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Période de déduction prévue (optionnel)</Label>
          <Select value={deductionPayPeriodId} onChange={(e) => setDeductionPayPeriodId(e.target.value)}>
            <option value="">— À déduire dès que possible —</option>
            {openPeriods.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Motif</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={!amount || Number(amount) <= 0 || !grantedPayPeriodId || create.isPending}
            onClick={() =>
              create.mutate({
                employeeId,
                amount: Number(amount),
                grantedPayPeriodId,
                deductionPayPeriodId: deductionPayPeriodId || undefined,
                reason: reason || undefined,
              })
            }
          >
            {create.isPending ? "Enregistrement…" : "Accorder"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
