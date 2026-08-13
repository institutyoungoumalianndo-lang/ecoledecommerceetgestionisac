"use client";

import type {
  CommunicationChannelType,
  CommunicationContactDto,
  CommunicationMessageDto,
  CommunicationMessageStatus,
  CommunicationRecipientType,
  MessageTemplateDto,
} from "@isac-erp/shared";
import { Badge, Button, Card, DataTable, type DataTableColumn, Input, Label, Select, Tabs } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { trpcClient } from "../../../../lib/trpc";

type TabKey = "envoi" | "historique";

const CHANNEL_LABELS: Record<CommunicationChannelType, string> = {
  SMS: "SMS",
  WHATSAPP: "WhatsApp (cliquer pour envoyer)",
  EMAIL: "E-mail",
  INTERNE: "Notification interne",
};

const CONTACT_TYPE_LABELS: Record<CommunicationRecipientType, string> = {
  ETUDIANT: "Étudiant",
  PARENT: "Parent/tuteur",
  ENSEIGNANT: "Enseignant",
  PERSONNEL: "Personnel",
  AUTRE: "Autre",
};

const STATUS_BADGE: Record<CommunicationMessageStatus, { label: string; variant: "success" | "destructive" | "default" | "muted" }> = {
  EN_ATTENTE: { label: "En attente", variant: "muted" },
  ENVOYE: { label: "Envoyé", variant: "success" },
  LIVRE: { label: "Livré", variant: "success" },
  LU: { label: "Lu", variant: "success" },
  ECHOUE: { label: "Échoué", variant: "destructive" },
};

/**
 * Centre de communication (MODULE-12 §1.3-1.5/§1.13), porté au portail Super Administrateur —
 * réutilise directement `communicationMessages.sendQuick`/`list`/`markWhatsAppSent` et
 * `communicationContacts.list` (déjà `permissionProcedure`, contournés par le rôle Super Admin) et le
 * même modèle que `QuickSendScreen.tsx`/`CommunicationHistoryScreen.tsx` (desktop).
 */
export default function AdminCommunicationPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("envoi");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <h1 className="text-lg font-semibold text-window-foreground">Communication</h1>

      <Card variant="static" className="p-4">
        <Tabs
          items={[
            { key: "envoi", label: "Envoi rapide" },
            { key: "historique", label: "Historique" },
          ]}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
        />
        <div className="pt-4">
          {activeTab === "envoi" && <QuickSendTab />}
          {activeTab === "historique" && <HistoryTab />}
        </div>
      </Card>
    </div>
  );
}

function QuickSendTab() {
  const [channel, setChannel] = useState<CommunicationChannelType>("SMS");
  const [templates, setTemplates] = useState<MessageTemplateDto[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [customContent, setCustomContent] = useState("");
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);

  const [contacts, setContacts] = useState<CommunicationContactDto[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [contactType, setContactType] = useState<CommunicationRecipientType | "">("");

  useEffect(() => {
    trpcClient.messageTemplates.list.query({ activeOnly: true }).then(setTemplates).catch(() => setTemplates([]));
  }, []);

  useEffect(() => {
    trpcClient.communicationContacts.list
      .query({ search: contactSearch || undefined, type: contactType || undefined, page: 1, pageSize: 200 })
      .then((r) => setContacts(r.rows))
      .catch(() => setContacts([]));
  }, [contactSearch, contactType]);

  function toggleRecipient(id: string) {
    setRecipientIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  const canSubmit = recipientIds.length > 0 && (Boolean(templateId) || Boolean(customContent.trim()));

  async function handleSend() {
    setIsSending(true);
    setSendError(null);
    setSendResult(null);
    try {
      const result = await trpcClient.communicationMessages.sendQuick.mutate({
        channel,
        templateId: templateId || undefined,
        customContent: customContent || undefined,
        recipientIds,
      });
      setSendResult({ sent: result.sent, failed: result.failed });
      setRecipientIds([]);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Échec de l'envoi.");
    } finally {
      setIsSending(false);
    }
  }

  return (
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
            {templates.map((t) => (
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
            {templates.find((t) => t.id === templateId)?.content}
          </p>
        )}

        {sendError && <p className="text-sm text-destructive">{sendError}</p>}
        {sendResult && (
          <p className="text-sm text-window-foreground/70">
            {sendResult.sent} envoyé(s) / en attente, {sendResult.failed} échoué(s).
          </p>
        )}

        <Button disabled={!canSubmit || isSending} onClick={() => void handleSend()}>
          {isSending ? "Envoi…" : `Envoyer à ${recipientIds.length} destinataire(s)`}
        </Button>
      </div>

      <div>
        <Label>Destinataires</Label>
        <div className="mt-1.5 flex flex-col gap-2">
          <div className="flex gap-2">
            <Input placeholder="Rechercher un nom, téléphone…" value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} />
            <Select value={contactType} onChange={(e) => setContactType(e.target.value as CommunicationRecipientType | "")}>
              <option value="">Tous les types</option>
              {Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
          <div className="flex max-h-72 flex-col gap-1 overflow-auto rounded-lg border border-border p-2">
            {contacts.length === 0 && <p className="text-sm text-muted-foreground">Aucun contact.</p>}
            {contacts.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
                <input
                  type="checkbox"
                  checked={recipientIds.includes(c.id)}
                  onChange={() => toggleRecipient(c.id)}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                <span className="flex-1">
                  {c.lastName} {c.firstName}
                  <span className="text-muted-foreground"> — {CONTACT_TYPE_LABELS[c.type]}{c.className ? ` — ${c.className}` : ""}</span>
                </span>
                <span className="text-xs text-muted-foreground">{c.phonePrimary ?? c.email ?? "—"}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-window-foreground/70">{recipientIds.length} destinataire(s) sélectionné(s).</p>
        </div>
      </div>
    </div>
  );
}

function HistoryTab() {
  const [messages, setMessages] = useState<CommunicationMessageDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [channel, setChannel] = useState<CommunicationChannelType | "">("");
  const [status, setStatus] = useState<CommunicationMessageStatus | "">("");
  const [markingId, setMarkingId] = useState<string | null>(null);

  function loadMessages() {
    setIsLoading(true);
    setLoadError(null);
    trpcClient.communicationMessages.list
      .query({ channel: channel || undefined, status: status || undefined })
      .then(setMessages)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement de l'historique."))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadMessages, [channel, status]);

  async function handleMarkSent(id: string) {
    setMarkingId(id);
    try {
      await trpcClient.communicationMessages.markWhatsAppSent.mutate({ id });
      loadMessages();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Échec de la confirmation.");
    } finally {
      setMarkingId(null);
    }
  }

  const columns: DataTableColumn<CommunicationMessageDto>[] = [
    { key: "date", header: "Date", value: (r) => new Date(r.createdAt).getTime(), render: (r) => new Date(r.createdAt).toLocaleString("fr-FR") },
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
      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-window-foreground/70">Canal</label>
          <Select value={channel} onChange={(e) => setChannel(e.target.value as CommunicationChannelType | "")}>
            <option value="">Tous</option>
            <option value="SMS">SMS</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="EMAIL">E-mail</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-window-foreground/70">Statut</label>
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
        rows={messages}
        getRowId={(r) => r.id}
        exportFilename="historique-communication"
        emptyMessage={isLoading ? "Chargement…" : "Aucun message."}
        rowActions={(r) =>
          r.channel === "WHATSAPP" && r.status === "EN_ATTENTE" && r.whatsappLink ? (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => window.open(r.whatsappLink!, "_blank")}>
                Ouvrir WhatsApp
              </Button>
              <Button variant="success" disabled={markingId === r.id} onClick={() => void handleMarkSent(r.id)}>
                Marquer comme envoyé
              </Button>
            </div>
          ) : undefined
        }
      />
    </div>
  );
}
