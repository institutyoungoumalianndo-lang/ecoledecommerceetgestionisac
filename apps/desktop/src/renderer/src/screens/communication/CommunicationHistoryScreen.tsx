import type { CommunicationChannelType, CommunicationMessageDto, CommunicationMessageStatus } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

const STATUS_BADGE: Record<CommunicationMessageStatus, { label: string; variant: "success" | "destructive" | "default" | "muted" }> = {
  EN_ATTENTE: { label: "En attente", variant: "muted" },
  ENVOYE: { label: "Envoyé", variant: "success" },
  LIVRE: { label: "Livré", variant: "success" },
  LU: { label: "Lu", variant: "success" },
  ECHOUE: { label: "Échoué", variant: "destructive" },
};

/**
 * Historique (voir MODULE-12 §1.13) — inclut la file "cliquer pour envoyer" WhatsApp : un message
 * WhatsApp reste `EN_ATTENTE` avec un lien wa.me tant qu'un membre du personnel n'a pas cliqué
 * "Ouvrir WhatsApp" puis confirmé l'envoi (voir MODULE-12 §3 règle 7).
 */
export function CommunicationHistoryScreen() {
  const [channel, setChannel] = useState<CommunicationChannelType | "">("");
  const [status, setStatus] = useState<CommunicationMessageStatus | "">("");

  const utils = trpc.useUtils();
  const query = trpc.communicationMessages.list.useQuery({
    channel: channel || undefined,
    status: status || undefined,
  });

  const markSent = trpc.communicationMessages.markWhatsAppSent.useMutation({
    onSuccess: () => void utils.communicationMessages.list.invalidate(),
  });

  const columns: DataTableColumn<CommunicationMessageDto>[] = [
    { key: "date", header: "Date", value: (r) => r.createdAt.toLocaleString("fr-FR") },
    { key: "canal", header: "Canal", value: (r) => r.channel },
    { key: "destinataire", header: "Destinataire", value: (r) => r.recipientName },
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Canal</label>
          <Select value={channel} onChange={(e) => setChannel(e.target.value as CommunicationChannelType | "")}>
            <option value="">Tous</option>
            <option value="SMS">SMS</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="EMAIL">E-mail</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Statut</label>
          <Select value={status} onChange={(e) => setStatus(e.target.value as CommunicationMessageStatus | "")}>
            <option value="">Tous</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="ENVOYE">Envoyé</option>
            <option value="ECHOUE">Échoué</option>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(r) => r.id}
        exportFilename="historique-communication"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun message."}
        rowActions={(r) =>
          r.channel === "WHATSAPP" && r.status === "EN_ATTENTE" && r.whatsappLink ? (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => window.open(r.whatsappLink!, "_blank")}>
                Ouvrir WhatsApp
              </Button>
              <Button variant="success" onClick={() => markSent.mutate({ id: r.id })}>
                Marquer comme envoyé
              </Button>
            </div>
          ) : undefined
        }
      />
    </div>
  );
}
