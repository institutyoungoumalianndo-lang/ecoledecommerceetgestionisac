import type { PaymentDto } from "@isac-erp/shared";
import {
  Badge,
  Button,
  Label,
  Select,
  ServerDataTable,
  type ServerDataTableColumn,
  exportRowsToCsv,
  exportRowsToXlsx,
} from "@isac-erp/ui";
import { useState } from "react";
import { formatTimestamp } from "../../lib/formatTimestamp";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { CancelPaymentDialog } from "./CancelPaymentDialog";
import { ReceiptView } from "./ReceiptView";

const EXPORT_COLUMNS = [
  { header: "Reçu", value: (p: PaymentDto) => p.receiptNumber },
  { header: "Date", value: (p: PaymentDto) => formatTimestamp(p.createdAt) },
  { header: "Étudiant", value: (p: PaymentDto) => p.studentName },
  { header: "Matricule", value: (p: PaymentDto) => p.studentMatricule },
  { header: "Montant", value: (p: PaymentDto) => p.amount },
  { header: "Mode", value: (p: PaymentDto) => p.paymentMethodLabel },
  { header: "Caissier", value: (p: PaymentDto) => p.recordedByName },
  { header: "Statut", value: (p: PaymentDto) => p.status },
];

/** Historique transverse des paiements (MODULE-04.3 §1.6/§4/§7.10). */
export function PaymentHistoryScreen() {
  const [search, setSearch] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [feeTypeId, setFeeTypeId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [receiptFor, setReceiptFor] = useState<PaymentDto | null>(null);
  const [cancelFor, setCancelFor] = useState<PaymentDto | null>(null);

  const canCancel = useHasPermission("PAIEMENTS:SUPPRESSION");
  const canExport = useHasPermission("PAIEMENTS:EXPORT");

  const methodsQuery = trpc.paymentMethods.list.useQuery();
  const feeTypesQuery = trpc.feeTypes.list.useQuery();

  const filter = {
    search: search || undefined,
    paymentMethodId: paymentMethodId || undefined,
    feeTypeId: feeTypeId || undefined,
    status: (status || undefined) as "VALIDE" | "ANNULE" | undefined,
  };
  const query = trpc.payments.list.useQuery({ ...filter, page, pageSize: 50 });
  const exportQuery = trpc.payments.listForExport.useQuery(filter, { enabled: false });

  async function handleExport(format: "csv" | "xlsx") {
    const result = await exportQuery.refetch();
    const rows = result.data ?? [];
    if (format === "csv") exportRowsToCsv(rows, EXPORT_COLUMNS, "paiements");
    else exportRowsToXlsx(rows, EXPORT_COLUMNS, "paiements");
  }

  const columns: ServerDataTableColumn<PaymentDto>[] = [
    { key: "receiptNumber", header: "Reçu", value: (p) => p.receiptNumber, sortKey: "receiptNumber" },
    { key: "createdAt", header: "Date", value: (p) => formatTimestamp(p.createdAt), sortKey: "createdAt" },
    { key: "student", header: "Étudiant", value: (p) => `${p.studentName} (${p.studentMatricule})` },
    { key: "amount", header: "Montant", value: (p) => p.amount, render: (p) => p.amount.toLocaleString("fr-FR"), sortKey: "amount" },
    { key: "paymentMethodLabel", header: "Mode", value: (p) => p.paymentMethodLabel },
    { key: "recordedByName", header: "Caissier", value: (p) => p.recordedByName },
    {
      key: "status",
      header: "Statut",
      value: (p) => p.status,
      render: (p) => (p.status === "VALIDE" ? <Badge variant="success">Validé</Badge> : <Badge variant="destructive">Annulé</Badge>),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <ServerDataTable
        columns={columns}
        rows={query.data?.items ?? []}
        getRowId={(p) => p.id}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={50}
        onPageChange={setPage}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Étudiant, matricule, numéro de reçu..."
        isLoading={query.isLoading}
        emptyMessage="Aucun paiement."
        columnStorageKey="payments-table-columns"
        onExportCsv={canExport ? () => void handleExport("csv") : undefined}
        onExportExcel={canExport ? () => void handleExport("xlsx") : undefined}
        filters={
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Mode</Label>
              <Select value={paymentMethodId} onChange={(e) => { setPaymentMethodId(e.target.value); setPage(1); }}>
                <option value="">Tous</option>
                {(methodsQuery.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Type de frais</Label>
              <Select value={feeTypeId} onChange={(e) => { setFeeTypeId(e.target.value); setPage(1); }}>
                <option value="">Tous</option>
                {(feeTypesQuery.data ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Statut</Label>
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                <option value="">Tous</option>
                <option value="VALIDE">Validé</option>
                <option value="ANNULE">Annulé</option>
              </Select>
            </div>
          </div>
        }
        rowActions={(p) => (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReceiptFor(p)}>
              Reçu
            </Button>
            {canCancel && p.status === "VALIDE" && (
              <Button variant="destructive" onClick={() => setCancelFor(p)}>
                Annuler
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
