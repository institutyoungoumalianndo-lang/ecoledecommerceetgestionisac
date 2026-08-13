import { Badge, Button, Dialog, Input, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { PayslipView } from "./PayslipView";

const COMPONENT_KIND_LABELS: Record<string, string> = {
  PRIME: "Prime",
  INDEMNITE: "Indemnité",
  RETENUE: "Retenue",
  COTISATION: "Cotisation",
};

const HOURS_SOURCE_LABELS: Record<string, string> = {
  POINTAGE: "Pointage",
  PLANIFIE: "Planifié",
  MANUEL: "Saisie manuelle",
};

/** Détail d'un bulletin (MODULE-08 §1.9/§1.10) — composants, recalcul, validation. */
export function PayrollLineDetailDialog({ lineId, onClose }: { lineId: string; onClose: () => void }) {
  const [showPayslip, setShowPayslip] = useState(false);
  const utils = trpc.useUtils();
  const canModify = useHasPermission("PAIE_BULLETINS:MODIFICATION");
  const canValidate = useHasPermission("PAIE_BULLETINS:VALIDATION");

  const query = trpc.payrollLines.getById.useQuery({ id: lineId });
  const componentTypesQuery = trpc.payrollComponentTypes.list.useQuery();
  const paymentMethodsQuery = trpc.paymentMethods.list.useQuery();

  function invalidate() {
    void utils.payrollLines.getById.invalidate({ id: lineId });
    void utils.payrollLines.list.invalidate();
  }

  const recalculate = trpc.payrollLines.calculate.useMutation({ onSuccess: invalidate });
  const addComponent = trpc.payrollLines.addComponent.useMutation({ onSuccess: invalidate });
  const removeComponent = trpc.payrollLines.removeComponent.useMutation({ onSuccess: invalidate });
  const updateHours = trpc.payrollLines.updateHours.useMutation({ onSuccess: invalidate });
  const validate = trpc.payrollLines.validate.useMutation({ onSuccess: invalidate });
  const unvalidate = trpc.payrollLines.unvalidate.useMutation({ onSuccess: invalidate });

  const [componentTypeId, setComponentTypeId] = useState("");
  const [componentAmount, setComponentAmount] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [hoursWorkedInput, setHoursWorkedInput] = useState<string | null>(null);

  const line = query.data;
  if (!line) return null;

  const isLocked = line.status === "VALIDEE";
  // Saisie des heures disponible pour tout employé lié à un enseignant, quel que soit le mode de
  // rémunération (2026-08-08, retour du porteur du projet) — plus jamais conditionnée à
  // `employeeSalaryMode`/`employeeTeachingHoursPaid`, qui ne pilotent que l'effet sur le calcul du
  // salaire (voir `computeBaseSalary`), pas la possibilité même de saisir/consulter les heures.
  const isHourlyLine = line.employeeIsLinkedToTeacher;

  return (
    <>
      <Dialog open onClose={onClose} title={`Bulletin — ${line.employeeName} — ${line.payPeriodLabel}`}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Badge variant={line.status === "VALIDEE" ? "success" : "muted"}>
              {line.status === "BROUILLON" ? "Brouillon" : line.status === "CALCULEE" ? "Calculée" : "Validée"}
            </Badge>
            {!isLocked && canModify && (
              <Button
                variant="outline"
                disabled={recalculate.isPending}
                onClick={() => recalculate.mutate({ payPeriodId: line.payPeriodId, employeeId: line.employeeId })}
              >
                {recalculate.isPending ? "Recalcul…" : "Recalculer"}
              </Button>
            )}
            {isLocked && canValidate && (
              <Button
                variant="destructive"
                disabled={unvalidate.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      "Dévalider ce bulletin ? Il redeviendra modifiable (heures, primes/indemnités, mode de paiement) et devra être revalidé."
                    )
                  ) {
                    unvalidate.mutate({ id: lineId });
                  }
                }}
              >
                {unvalidate.isPending ? "Dévalidation…" : "Dévalider"}
              </Button>
            )}
          </div>
          {unvalidate.error && <p className="text-sm text-destructive">{unvalidate.error.message}</p>}

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Salaire de base</p>
              <p className="font-medium">{line.baseSalary.toLocaleString("fr-FR")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Heures travaillées
                {line.hoursSource && ` (${HOURS_SOURCE_LABELS[line.hoursSource] ?? line.hoursSource})`}
              </p>
              {!isLocked && canModify && isHourlyLine && hoursWorkedInput !== null ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    className="h-8 w-24"
                    value={hoursWorkedInput}
                    onChange={(e) => setHoursWorkedInput(e.target.value)}
                  />
                  <Button
                    className="h-8"
                    disabled={!hoursWorkedInput || updateHours.isPending}
                    onClick={() => {
                      updateHours.mutate({ id: lineId, hoursWorked: Number(hoursWorkedInput) });
                      setHoursWorkedInput(null);
                    }}
                  >
                    OK
                  </Button>
                  <Button variant="outline" className="h-8" onClick={() => setHoursWorkedInput(null)}>
                    Annuler
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="font-medium">{line.hoursWorked ?? "—"}</p>
                  {!isLocked && canModify && isHourlyLine && (
                    <Button
                      variant="outline"
                      className="h-6 px-2 text-xs"
                      onClick={() => setHoursWorkedInput(String(line.hoursWorked ?? ""))}
                    >
                      Saisir depuis la fiche d'émargement
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Salaire brut</p>
              <p className="font-medium">{line.grossSalary.toLocaleString("fr-FR")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net à payer</p>
              <p className="font-semibold">{line.netSalary.toLocaleString("fr-FR")}</p>
            </div>
          </div>

          {isHourlyLine && line.employeeSalaryMode === "FIXE" && !line.employeeTeachingHoursPaid && (
            <p className="text-xs text-muted-foreground">
              Cet employé est en salaire fixe sans rémunération complémentaire aux heures — les heures saisies ici
              sont conservées pour information mais n'affectent pas le salaire de base. Pour qu'elles comptent,
              coche "Les heures d'enseignement donnent droit à une rémunération complémentaire" sur sa fiche, ou
              passe-le en mode "Selon les heures".
            </p>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Primes / indemnités / retenues / cotisations</p>
            {line.components.length === 0 && <p className="text-sm text-muted-foreground">Aucun élément ajouté.</p>}
            {line.components.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
                <span>{COMPONENT_KIND_LABELS[c.componentKind]} — {c.componentTypeLabel} : {c.amount.toLocaleString("fr-FR")}</span>
                {!isLocked && canModify && (
                  <Button variant="destructive" onClick={() => removeComponent.mutate({ id: c.id })}>
                    Retirer
                  </Button>
                )}
              </div>
            ))}
            {!isLocked && canModify && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Composant</Label>
                  <Select value={componentTypeId} onChange={(e) => setComponentTypeId(e.target.value)}>
                    <option value="">—</option>
                    {(componentTypesQuery.data ?? []).filter((t) => t.isActive).map((t) => (
                      <option key={t.id} value={t.id}>{COMPONENT_KIND_LABELS[t.kind]} — {t.label}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Montant</Label>
                  <Input type="number" min="0" step="0.01" value={componentAmount} onChange={(e) => setComponentAmount(e.target.value)} />
                </div>
                <Button
                  disabled={!componentTypeId || !componentAmount || addComponent.isPending}
                  onClick={() => {
                    addComponent.mutate({ payrollLineId: lineId, componentTypeId, amount: Number(componentAmount) });
                    setComponentTypeId("");
                    setComponentAmount("");
                  }}
                >
                  Ajouter
                </Button>
              </div>
            )}
          </div>

          {!isLocked && canValidate && (
            <div className="flex flex-col gap-1.5">
              <Label>Mode de paiement</Label>
              <Select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}>
                <option value="">—</option>
                {(paymentMethodsQuery.data ?? []).filter((m) => m.isActive).map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </Select>
            </div>
          )}

          {validate.error && <p className="text-sm text-destructive">{validate.error.message}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            {isLocked && <Button onClick={() => setShowPayslip(true)}>Voir le bulletin</Button>}
            {!isLocked && line.status === "CALCULEE" && canValidate && (
              <Button
                disabled={validate.isPending}
                onClick={() => validate.mutate({ id: lineId, paymentMethodId: paymentMethodId || undefined })}
              >
                {validate.isPending ? "Validation…" : "Valider le bulletin"}
              </Button>
            )}
          </div>
        </div>
      </Dialog>

      {showPayslip && <PayslipView line={line} onClose={() => setShowPayslip(false)} />}
    </>
  );
}
