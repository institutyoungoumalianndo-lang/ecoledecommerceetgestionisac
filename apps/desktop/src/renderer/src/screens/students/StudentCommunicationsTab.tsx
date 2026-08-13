import type { CommunicationMessageDto, CommunicationMessageStatus } from "@isac-erp/shared";
import { Badge, DataTable, type DataTableColumn } from "@isac-erp/ui";
import { trpc } from "../../lib/trpc";

const STATUS_BADGE: Record<CommunicationMessageStatus, { label: string; variant: "success" | "destructive" | "default" | "muted" }> = {
  EN_ATTENTE: { label: "En attente", variant: "muted" },
  ENVOYE: { label: "Envoyé", variant: "success" },
  LIVRE: { label: "Livré", variant: "success" },
  LU: { label: "Lu", variant: "success" },
  ECHOUE: { label: "Échoué", variant: "destructive" },
};

/**
 * Communications de l'étudiant (MODULE-12 §1.13) — remplace le placeholder "à venir" de l'onglet
 * dédié (2026-08-03, retour du porteur du projet). Réutilise `communicationMessages.list` (déjà
 * utilisé par `CommunicationHistoryScreen.tsx`), filtré par destinataire — `recipientType`/`recipientId`
 * ajoutés à `listCommunicationMessagesInputSchema` pour cet usage, aucune autre logique dupliquée.
 * Lecture seule : l'envoi d'un nouveau message se fait depuis le Centre de Communication, hors de la
 * fiche étudiant.
 */
export function StudentCommunicationsTab({ studentId }: { studentId: string }) {
  const query = trpc.communicationMessages.list.useQuery({ recipientType: "ETUDIANT", recipientId: studentId });

  const columns: DataTableColumn<CommunicationMessageDto>[] = [
    { key: "date", header: "Date", value: (r) => r.createdAt.toLocaleString("fr-FR") },
    { key: "canal", header: "Canal", value: (r) => r.channel },
    { key: "contact", header: "Contact", value: (r) => r.recipientPhone ?? r.recipientEmail ?? "—" },
    { key: "contenu", header: "Contenu", value: (r) => r.content },
    { key: "campagne", header: "Campagne", value: (r) => r.campaignName ?? "—" },
    {
      key: "statut",
      header: "Statut",
      value: (r) => STATUS_BADGE[r.status].label,
      render: (r) => (
        <div className="flex flex-col gap-1">
          <Badge variant={STATUS_BADGE[r.status].variant}>{STATUS_BADGE[r.status].label}</Badge>
          {r.errorMessage && <span className="text-xs text-destructive">{r.errorMessage}</span>}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={query.data ?? []}
      getRowId={(r) => r.id}
      exportFilename="communications-etudiant"
      emptyMessage={query.isLoading ? "Chargement…" : "Aucune communication enregistrée pour cet étudiant."}
    />
  );
}
