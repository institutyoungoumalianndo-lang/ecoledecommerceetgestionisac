import type { PaymentDto } from "@isac-erp/shared";
import { Badge, Button, Card, DataTable, type DataTableColumn } from "@isac-erp/ui";
import { Ban, Coins, Receipt, Wallet } from "lucide-react";
import { useState } from "react";
import { formatTimestamp } from "../../lib/formatTimestamp";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { CancelPaymentDialog } from "../payments/CancelPaymentDialog";
import { ReceiptView } from "../payments/ReceiptView";
import { CountUpAmount } from "./CountUpAmount";

/** Historique des paiements de l'étudiant (MODULE-04.3 §4) — actif depuis le Module 4.3. */
export function StudentPaymentsTab({ studentId }: { studentId: string }) {
  const [receiptFor, setReceiptFor] = useState<PaymentDto | null>(null);
  const [cancelFor, setCancelFor] = useState<PaymentDto | null>(null);
  const canCancel = useHasPermission("PAIEMENTS:SUPPRESSION");

  const query = trpc.payments.list.useQuery({ studentId, page: 1, pageSize: 100 });
  const rows = query.data?.items ?? [];
  // Même clé de requête que StudentFeesTab.tsx : mise en cache partagée par React Query, pas de
  // second aller-retour réseau si l'onglet Frais a déjà été ouvert.
  const summaryQuery = trpc.feeSummary.getForStudent.useQuery({ studentId });
  const summary = summaryQuery.data;

  const columns: DataTableColumn<PaymentDto>[] = [
    { key: "createdAt", header: "Date", value: (p) => formatTimestamp(p.createdAt) },
    { key: "receiptNumber", header: "Reçu", value: (p) => p.receiptNumber },
    { key: "amount", header: "Montant", value: (p) => p.amount, render: (p) => p.amount.toLocaleString("fr-FR") },
    { key: "paymentMethodLabel", header: "Mode", value: (p) => p.paymentMethodLabel },
    { key: "recordedByName", header: "Caissier", value: (p) => p.recordedByName },
    {
      key: "status",
      header: "Statut",
      value: (p) => p.status,
      render: (p) =>
        p.status === "VALIDE" ? (
          <Badge variant="success">Validé</Badge>
        ) : (
          <Badge variant="destructive">Annulé{p.cancelledReason ? ` — ${p.cancelledReason}` : ""}</Badge>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {summary && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card
            variant="static"
            className={
              "border-l-4 p-4 transition-transform hover:-translate-y-0.5 " +
              (summary.totalRemaining > 0 ? "border-l-destructive" : "border-l-success")
            }
          >
            <p className="mb-3 inline-block rounded-full bg-primary/8 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
              Suivi
            </p>
            <div className="flex items-center gap-2.5 border-b border-dashed border-border py-1.5">
              <span className="text-xs text-muted-foreground">Statut global</span>
              <span className="ml-auto">
                {summary.totalRemaining > 0 ? (
                  <Badge variant="destructive">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                    En retard
                  </Badge>
                ) : (
                  <Badge variant="success">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />À jour
                  </Badge>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2.5 py-1.5">
              <Coins className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Reste à payer</span>
              <span className="ml-auto text-base font-bold">
                <CountUpAmount value={summary.totalRemaining} />
              </span>
            </div>
          </Card>

          <Card variant="static" className="border-l-4 border-l-success p-4 transition-transform hover:-translate-y-0.5">
            <p className="mb-3 inline-block rounded-full bg-primary/8 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
              Situation financière
            </p>
            <div className="flex items-center gap-2.5 border-b border-dashed border-border py-1.5">
              <Wallet className="h-4 w-4 shrink-0 text-success" />
              <span className="text-xs text-muted-foreground">Total payé</span>
              <span className="ml-auto text-base font-bold text-success">
                <CountUpAmount value={summary.totalPaid} />
              </span>
            </div>
            <div className="flex items-center gap-2.5 py-1.5">
              <Coins className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Net à payer</span>
              <span className="ml-auto text-base font-bold">
                <CountUpAmount value={summary.totalNet} />
              </span>
            </div>
          </Card>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(p) => p.id}
        exportFilename="paiements-etudiant"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun paiement enregistré."}
        rowActions={(p) => (
          <div className="flex justify-end gap-1.5">
            <Button variant="outline" className="px-2" onClick={() => setReceiptFor(p)} title="Voir le reçu">
              <Receipt className="h-3.5 w-3.5" />
            </Button>
            {canCancel && p.status === "VALIDE" && (
              <Button variant="destructive" className="px-2" onClick={() => setCancelFor(p)} title="Annuler ce paiement">
                <Ban className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      />

      {receiptFor && <ReceiptView payment={receiptFor} onClose={() => setReceiptFor(null)} />}
      {cancelFor && (
        <CancelPaymentDialog paymentId={cancelFor.id} receiptNumber={cancelFor.receiptNumber} onClose={() => setCancelFor(null)} />
      )}
    </div>
  );
}
