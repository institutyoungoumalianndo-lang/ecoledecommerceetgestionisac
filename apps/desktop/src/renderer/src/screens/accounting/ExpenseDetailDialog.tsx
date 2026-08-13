import type { ExpenseDocumentType } from "@isac-erp/shared";
import { Badge, Button, Dialog, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { formatTimestamp } from "../../lib/formatTimestamp";
import { uploadDocument } from "../../lib/upload";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const DOCUMENT_TYPE_LABELS: Record<ExpenseDocumentType, string> = {
  FACTURE: "Facture",
  DEVIS: "Devis",
  RECU: "Reçu",
  CONTRAT: "Contrat",
  AUTRE: "Autre",
};

/** Fiche dépense (MODULE-07 §1.3/§1.10) — workflow d'approbation, pièces justificatives. */
export function ExpenseDetailDialog({ expenseId, onClose }: { expenseId: string; onClose: () => void }) {
  const [rejectReason, setRejectReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [documentType, setDocumentType] = useState<ExpenseDocumentType>("FACTURE");
  const [isUploading, setIsUploading] = useState(false);

  const canModify = useHasPermission("DEPENSES:MODIFICATION");
  const canValidate = useHasPermission("DEPENSES:VALIDATION");
  const canCancel = useHasPermission("DEPENSES:SUPPRESSION");

  const utils = trpc.useUtils();
  const query = trpc.expenses.getById.useQuery({ id: expenseId });

  function invalidate() {
    void utils.expenses.getById.invalidate({ id: expenseId });
    void utils.expenses.list.invalidate();
  }

  const submit = trpc.expenses.submit.useMutation({ onSuccess: invalidate });
  const approve = trpc.expenses.approve.useMutation({ onSuccess: invalidate });
  const reject = trpc.expenses.reject.useMutation({ onSuccess: () => { invalidate(); setShowReject(false); } });
  const cancel = trpc.expenses.cancel.useMutation({ onSuccess: () => { invalidate(); setShowCancel(false); } });
  const addDocument = trpc.expenses.addDocument.useMutation({ onSuccess: invalidate });

  async function handleUpload(file: File) {
    setIsUploading(true);
    try {
      const uploaded = await uploadDocument(file);
      addDocument.mutate({
        expenseId,
        documentType,
        filePath: uploaded.path,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        fileSizeBytes: uploaded.fileSizeBytes,
      });
    } finally {
      setIsUploading(false);
    }
  }

  const expense = query.data;
  if (!expense) return null;

  return (
    <Dialog open onClose={onClose} title={`Dépense ${expense.expenseNumber}`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Badge
            variant={
              expense.status === "APPROUVEE" ? "success" : expense.status === "REJETEE" || expense.status === "ANNULEE" ? "destructive" : "muted"
            }
          >
            {expense.status.replaceAll("_", " ")}
          </Badge>
          <p className="text-lg font-semibold">{expense.amount.toLocaleString("fr-FR")}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p>{formatTimestamp(expense.date)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Catégorie</p>
            <p>{expense.categoryName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fournisseur</p>
            <p>{expense.supplierName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mode de paiement</p>
            <p>{expense.paymentMethodLabel}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Responsable</p>
            <p>{expense.responsibleUserName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Créée par</p>
            <p>{expense.createdByName}</p>
          </div>
        </div>
        {expense.observations && (
          <div>
            <p className="text-xs text-muted-foreground">Observations</p>
            <p className="text-sm">{expense.observations}</p>
          </div>
        )}
        {expense.rejectedReason && <p className="text-sm text-destructive">Motif de rejet : {expense.rejectedReason}</p>}
        {expense.journalEntryId && <Badge variant="success">Écriture comptable générée</Badge>}

        <div className="flex flex-col gap-2">
          <Label>Pièces justificatives</Label>
          {expense.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun document.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {expense.documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between rounded-md border border-border px-2 py-1 even:bg-primary/5">
                  <span>
                    {DOCUMENT_TYPE_LABELS[d.documentType]} — {d.fileName}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {(expense.status === "BROUILLON" || expense.status === "EN_ATTENTE_APPROBATION") && canModify && (
            <div className="flex items-center gap-2">
              <Select value={documentType} onChange={(e) => setDocumentType(e.target.value as ExpenseDocumentType)} className="w-40">
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, l]) => (
                  <option key={value} value={value}>
                    {l}
                  </option>
                ))}
              </Select>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                disabled={isUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                }}
              />
            </div>
          )}
        </div>

        {showReject && (
          <div className="flex flex-col gap-2 rounded-md border border-border p-3">
            <Label>Motif du rejet</Label>
            <textarea className="min-h-16 rounded-md border border-white bg-background text-foreground px-3 py-2 text-sm" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowReject(false)}>Annuler</Button>
              <Button variant="destructive" disabled={!rejectReason.trim()} onClick={() => reject.mutate({ id: expenseId, reason: rejectReason })}>
                Confirmer le rejet
              </Button>
            </div>
          </div>
        )}
        {showCancel && (
          <div className="flex flex-col gap-2 rounded-md border border-border p-3">
            <Label>Motif de l'annulation</Label>
            <textarea className="min-h-16 rounded-md border border-white bg-background text-foreground px-3 py-2 text-sm" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCancel(false)}>Annuler</Button>
              <Button variant="destructive" disabled={!cancelReason.trim()} onClick={() => cancel.mutate({ id: expenseId, reason: cancelReason })}>
                Confirmer l'annulation
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          {expense.status === "BROUILLON" && canModify && (
            <Button onClick={() => submit.mutate({ id: expenseId })} disabled={submit.isPending}>
              Soumettre à approbation
            </Button>
          )}
          {expense.status === "EN_ATTENTE_APPROBATION" && canValidate && (
            <>
              <Button variant="destructive" onClick={() => setShowReject(true)}>Rejeter</Button>
              <Button onClick={() => approve.mutate({ id: expenseId })} disabled={approve.isPending}>
                Approuver
              </Button>
            </>
          )}
          {expense.status === "APPROUVEE" && canCancel && (
            <Button variant="destructive" onClick={() => setShowCancel(true)}>Annuler</Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
