import { prisma, type Prisma } from "@isac-erp/db";
import type {
  CommunicationContactDto,
  CommunicationMessageDto,
  ListCommunicationMessagesInput,
  NotificationEventType,
  SendQuickMessageInput,
  SendQuickMessageResult,
} from "@isac-erp/shared";
import { emailAdapter } from "./communicationChannels/emailAdapter.js";
import { smsAdapter } from "./communicationChannels/smsAdapter.js";
import { buildWhatsAppLink } from "./communicationChannels/whatsAppLink.js";
import { resolveCommunicationContacts } from "./communicationContactService.js";
import { substituteTemplateVariables } from "./messageTemplateService.js";

const MESSAGE_INCLUDE = {
  campaign: true,
  sentByUser: true,
} satisfies Prisma.CommunicationMessageInclude;

type MessageWithRelations = Prisma.CommunicationMessageGetPayload<{ include: typeof MESSAGE_INCLUDE }>;

function toDto(row: MessageWithRelations): CommunicationMessageDto {
  return {
    id: row.id,
    channel: row.channel,
    recipientType: row.recipientType,
    recipientId: row.recipientId,
    recipientName: row.recipientName,
    recipientPhone: row.recipientPhone,
    recipientEmail: row.recipientEmail,
    content: row.content,
    campaignId: row.campaignId,
    campaignName: row.campaign?.name ?? null,
    status: row.status,
    errorMessage: row.errorMessage,
    sentByName: row.sentByUser ? `${row.sentByUser.firstName} ${row.sentByUser.lastName}` : null,
    scheduledFor: row.scheduledFor,
    sentAt: row.sentAt,
    createdAt: row.createdAt,
    whatsappLink:
      row.channel === "WHATSAPP" && row.status === "EN_ATTENTE" && row.recipientPhone
        ? buildWhatsAppLink(row.recipientPhone, row.content)
        : null,
  };
}

/**
 * Envoie effectivement un message SMS/E-mail via l'adaptateur du canal — jamais WhatsApp, qui reste
 * toujours "cliquer pour envoyer" (voir MODULE-12 §3 règle 7). Ne lève jamais d'exception : le
 * résultat est toujours reflété dans le statut du message, jamais dans le flux appelant (règle §3
 * point 1 — un envoi échoué ne bloque jamais l'événement déclencheur).
 */
async function attemptSend(channel: "SMS" | "EMAIL", to: string, content: string) {
  const adapter = channel === "SMS" ? smsAdapter : emailAdapter;
  return adapter.send({ to, content });
}

interface CreateMessageInput {
  channel: "SMS" | "WHATSAPP" | "EMAIL";
  recipient: CommunicationContactDto;
  content: string;
  templateId?: string | null;
  campaignId?: string | null;
  sentByUserId?: string | null;
}

/** Crée un message et tente l'envoi immédiat pour SMS/E-mail (WhatsApp reste `EN_ATTENTE`). */
async function createAndSendMessage(input: CreateMessageInput): Promise<CommunicationMessageDto> {
  const recipientPhone =
    input.channel === "WHATSAPP"
      ? (input.recipient.whatsapp ?? input.recipient.phonePrimary)
      : input.recipient.phonePrimary;

  const created = await prisma.communicationMessage.create({
    data: {
      channel: input.channel,
      recipientType: input.recipient.type,
      recipientId: input.recipient.id.split(":")[1] ?? null,
      recipientName: `${input.recipient.lastName} ${input.recipient.firstName}`,
      recipientPhone: recipientPhone ?? null,
      recipientEmail: input.recipient.email,
      content: input.content,
      templateId: input.templateId ?? null,
      campaignId: input.campaignId ?? null,
      sentByUserId: input.sentByUserId ?? null,
    },
    include: MESSAGE_INCLUDE,
  });

  if (input.channel === "WHATSAPP") {
    return toDto(created); // reste EN_ATTENTE — clic humain requis (règle §3 point 7)
  }

  const to = input.channel === "SMS" ? recipientPhone : input.recipient.email;
  if (!to) {
    const updated = await prisma.communicationMessage.update({
      where: { id: created.id },
      data: { status: "ECHOUE", errorMessage: "Aucun contact valide pour ce canal" },
      include: MESSAGE_INCLUDE,
    });
    return toDto(updated);
  }

  const result = await attemptSend(input.channel, to, input.content);
  const updated = await prisma.communicationMessage.update({
    where: { id: created.id },
    data: result.success
      ? { status: "ENVOYE", sentAt: new Date(), errorMessage: null }
      : { status: "ECHOUE", errorMessage: result.error ?? "Échec d'envoi" },
    include: MESSAGE_INCLUDE,
  });
  return toDto(updated);
}

/** Envoi individuel/groupé rapide (voir MODULE-12 §1.4/§1.5). */
export async function sendQuickMessage(
  input: SendQuickMessageInput,
  sentByUserId: string
): Promise<SendQuickMessageResult> {
  // INTERNE cible des comptes User, jamais un contact du carnet d'adresses (voir MODULE-12 §1.10) —
  // hors périmètre de l'envoi individuel/groupé, qui opère toujours sur le carnet transverse.
  if (input.channel === "INTERNE") {
    throw new Error("Le canal Notifications internes n'est pas disponible pour l'envoi individuel/groupé.");
  }
  const channel = input.channel;

  const recipients = await resolveCommunicationContacts(input.recipientIds);
  const messages: CommunicationMessageDto[] = [];

  for (const recipient of recipients) {
    const content = input.templateId
      ? substituteTemplateVariables(
          (await prisma.messageTemplate.findUniqueOrThrow({ where: { id: input.templateId } })).content,
          buildContactVariables(recipient)
        )
      : (input.customContent ?? "");
    messages.push(
      await createAndSendMessage({
        channel,
        recipient,
        content,
        templateId: input.templateId,
        sentByUserId,
      })
    );
  }

  return {
    sent: messages.filter((m) => m.status === "ENVOYE" || m.status === "EN_ATTENTE").length,
    failed: messages.filter((m) => m.status === "ECHOUE").length,
    messages,
  };
}

function buildContactVariables(contact: CommunicationContactDto): Record<string, string> {
  return {
    Nom: contact.lastName,
    Prénom: contact.firstName,
    Classe: contact.className ?? "",
    Filière: contact.filiereName ?? "",
    Campus: contact.campus ?? "",
  };
}

export async function markWhatsAppMessageSent(id: string, userId: string): Promise<CommunicationMessageDto> {
  const row = await prisma.communicationMessage.update({
    where: { id },
    data: { status: "ENVOYE", sentAt: new Date(), sentByUserId: userId },
    include: MESSAGE_INCLUDE,
  });
  return toDto(row);
}

export async function listCommunicationMessages(
  input: ListCommunicationMessagesInput
): Promise<CommunicationMessageDto[]> {
  const rows = await prisma.communicationMessage.findMany({
    where: {
      channel: input.channel,
      status: input.status,
      campaignId: input.campaignId,
      recipientType: input.recipientType,
      recipientId: input.recipientId,
      createdAt: input.startDate || input.endDate ? { gte: input.startDate, lte: input.endDate } : undefined,
    },
    include: MESSAGE_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return rows.map(toDto);
}

/**
 * Notification automatique (voir MODULE-12 §1.10) — appelée par les autres modules à chaque
 * événement (paiement, inscription, bulletin, emploi du temps). Jamais WhatsApp (règle §3 point 7).
 * N'échoue jamais bruyamment : un événement source reste valide même si aucune passerelle n'est
 * configurée (règle §3 point 1).
 */
export async function dispatchAutomaticNotification(
  eventType: NotificationEventType,
  variables: Record<string, string>,
  recipients: CommunicationContactDto[]
): Promise<void> {
  try {
    const config = await prisma.notificationEventConfig.findUnique({
      where: { eventType },
      include: { template: true },
    });
    if (!config || !config.isActive || recipients.length === 0) return;

    const content = substituteTemplateVariables(config.template.content, variables);
    for (const channel of config.channels) {
      // Garde de type : le catalogue Zod (automaticCommunicationChannelSchema) restreint déjà les
      // canaux acceptés à SMS/EMAIL en écriture — WHATSAPP/INTERNE ne devraient jamais apparaître
      // ici, mais le type Prisma brut reste le CommunicationChannel complet (voir MODULE-12 §3 règle 7).
      if (channel !== "SMS" && channel !== "EMAIL") continue;
      for (const recipient of recipients) {
        await createAndSendMessage({ channel, recipient, content, templateId: config.templateId });
      }
    }
  } catch (err) {
    console.error(`Notification automatique ${eventType} en échec (non bloquant) :`, err);
  }
}
