import type { CommunicationChannelType } from "@isac-erp/shared";
import { Button, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { ContactPicker } from "./ContactPicker";

const CHANNEL_LABELS: Record<CommunicationChannelType, string> = {
  SMS: "SMS",
  WHATSAPP: "WhatsApp (cliquer pour envoyer)",
  EMAIL: "E-mail",
  INTERNE: "Notification interne",
};

/** Envoi individuel/groupé rapide (voir MODULE-12 §1.3/§1.4). */
export function QuickSendScreen() {
  const [channel, setChannel] = useState<CommunicationChannelType>("SMS");
  const [templateId, setTemplateId] = useState("");
  const [customContent, setCustomContent] = useState("");
  const [recipientIds, setRecipientIds] = useState<string[]>([]);

  const templatesQuery = trpc.messageTemplates.list.useQuery({ activeOnly: true });
  const utils = trpc.useUtils();

  const send = trpc.communicationMessages.sendQuick.useMutation({
    onSuccess: () => {
      setRecipientIds([]);
      void utils.communicationMessages.list.invalidate();
      void utils.communicationDashboard.get.invalidate();
    },
  });

  const canSubmit = recipientIds.length > 0 && (Boolean(templateId) || Boolean(customContent.trim()));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Canal</Label>
            <Select value={channel} onChange={(e) => setChannel(e.target.value as CommunicationChannelType)}>
              {(["SMS", "WHATSAPP", "EMAIL"] as const).map((c) => (
                <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Modèle (optionnel)</Label>
            <Select value={templateId} onChange={(e) => { setTemplateId(e.target.value); if (e.target.value) setCustomContent(""); }}>
              <option value="">— Contenu personnalisé —</option>
              {(templatesQuery.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </Select>
          </div>

          {!templateId && (
            <div className="flex flex-col gap-1.5">
              <Label>Message</Label>
              <textarea
                className="min-h-28 rounded-md border border-white bg-background text-foreground px-3 py-2 text-sm"
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                placeholder="Votre message…"
              />
            </div>
          )}

          {templateId && (
            <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              {templatesQuery.data?.find((t) => t.id === templateId)?.content}
            </p>
          )}

          {send.error && <p className="text-sm text-destructive">{send.error.message}</p>}
          {send.data && (
            <p className="text-sm text-muted-foreground">
              {send.data.sent} envoyé(s) / en attente, {send.data.failed} échoué(s).
            </p>
          )}

          <Button disabled={!canSubmit || send.isPending} onClick={() => send.mutate({ channel, templateId: templateId || undefined, customContent: customContent || undefined, recipientIds })}>
            {send.isPending ? "Envoi…" : `Envoyer à ${recipientIds.length} destinataire(s)`}
          </Button>
        </div>

        <div>
          <Label>Destinataires</Label>
          <div className="mt-1.5">
            <ContactPicker selectedIds={recipientIds} onChange={setRecipientIds} />
          </div>
        </div>
      </div>
    </div>
  );
}
