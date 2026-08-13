import type { PaymentStatus } from "@isac-erp/shared";
import { Badge, Button, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { CancelEnrollmentDialog } from "../enrollments/CancelEnrollmentDialog";
import { ChangeClassDialog } from "./ChangeClassDialog";

const STATUS_LABELS: Record<string, string> = {
  NOUVEAU: "Nouveau",
  ANCIEN: "Ancien",
  REDOUBLANT: "Redoublant",
  TRANSFERT: "Transfert",
  REPRISE: "Reprise",
};

const DECISION_LABELS: Record<string, string> = {
  EN_COURS: "En cours",
  ADMIS: "Admis",
  REDOUBLANT: "Redoublant",
  AJOURNE: "Ajourné",
  ABANDON: "Abandon",
};

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  NON_PAYE: "Non payé",
  PARTIELLEMENT_PAYE: "Partiellement payé",
  TOTALEMENT_PAYE: "Totalement payé",
};

/** Historique académique (MODULE-04 §4.5, enrichi MODULE-04.1) — une ligne = une année universitaire, jamais supprimée. */
export function StudentHistoryTab({ studentId }: { studentId: string }) {
  const [changeClassOpen, setChangeClassOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const query = trpc.studentEnrollments.listByStudent.useQuery({ studentId });
  const canModify = useHasPermission("ETUDIANTS:MODIFICATION");
  const canModifyPayment = useHasPermission("INSCRIPTIONS:MODIFICATION");
  const canCancel = useHasPermission("INSCRIPTIONS:SUPPRESSION");

  const updatePayment = trpc.studentEnrollments.updatePayment.useMutation({
    onSuccess: () => void utils.studentEnrollments.listByStudent.invalidate({ studentId }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Année</th>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Filière</th>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Niveau</th>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Classe</th>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Régime</th>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">N° inscription</th>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Statut</th>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Décision</th>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Paiement</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">
                  Aucune inscription.
                </td>
              </tr>
            ) : (
              (query.data ?? []).map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    {e.academicYearLabel}
                    {e.isCurrentYear && <Badge variant="success" className="ml-2">Année active</Badge>}
                    {e.cancelledAt && <Badge variant="destructive" className="ml-2">Annulée</Badge>}
                  </td>
                  <td className="px-3 py-2">{e.filiereName}</td>
                  <td className="px-3 py-2">{e.levelLabel}</td>
                  <td className="px-3 py-2">{e.className}</td>
                  <td className="px-3 py-2">{e.regimeLabel ?? "—"}</td>
                  <td className="px-3 py-2">{e.registrationNumber ?? "—"}</td>
                  <td className="px-3 py-2">{STATUS_LABELS[e.status]}</td>
                  <td className="px-3 py-2">{DECISION_LABELS[e.decision]}</td>
                  <td className="px-3 py-2">
                    {canModifyPayment && !e.cancelledAt ? (
                      <Select
                        value={e.paymentStatus ?? ""}
                        onChange={(ev) =>
                          updatePayment.mutate({
                            enrollmentId: e.id,
                            paymentStatus: (ev.target.value || null) as PaymentStatus | null,
                            feeAmountExpected: e.feeAmountExpected,
                          })
                        }
                      >
                        <option value="">—</option>
                        {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </Select>
                    ) : (
                      (e.paymentStatus && PAYMENT_LABELS[e.paymentStatus]) ?? "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      {canModify && e.isCurrentYear && e.isEditable && !e.cancelledAt && (
                        <Button variant="outline" onClick={() => setChangeClassOpen(true)}>
                          Changer de classe
                        </Button>
                      )}
                      {canCancel && !e.cancelledAt && (
                        <Button variant="destructive" onClick={() => setCancelTargetId(e.id)}>
                          Annuler
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {changeClassOpen && (
        <ChangeClassDialog studentId={studentId} onClose={() => setChangeClassOpen(false)} />
      )}
      {cancelTargetId && (
        <CancelEnrollmentDialog
          enrollmentId={cancelTargetId}
          onClose={() => setCancelTargetId(null)}
          onCancelled={() => void utils.studentEnrollments.listByStudent.invalidate({ studentId })}
        />
      )}
    </div>
  );
}
