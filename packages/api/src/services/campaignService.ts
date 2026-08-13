import { prisma, type Prisma } from "@isac-erp/db";
import type { CampaignDto, CreateCampaignInput, ListCampaignsInput, UpdateCampaignInput } from "@isac-erp/shared";
import { resolveCampaignAudience } from "./communicationContactService.js";
import { substituteTemplateVariables } from "./messageTemplateService.js";
import { emailAdapter } from "./communicationChannels/emailAdapter.js";
import { smsAdapter } from "./communicationChannels/smsAdapter.js";
import { createInternalNotification } from "./internalNotificationService.js";

const CAMPAIGN_INCLUDE = {
  template: true,
  createdByUser: true,
  _count: { select: { messages: true } },
} satisfies Prisma.CampaignInclude;

type CampaignWithRelations = Prisma.CampaignGetPayload<{ include: typeof CAMPAIGN_INCLUDE }>;

function toDto(row: CampaignWithRelations): CampaignDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    channel: row.channel,
    templateId: row.templateId,
    templateLabel: row.template?.label ?? null,
    customContent: row.customContent,
    audienceType: row.audienceType,
    audienceFilter: (row.audienceFilter as CampaignDto["audienceFilter"]) ?? null,
    status: row.status,
    scheduleType: row.scheduleType,
    scheduledFor: row.scheduledFor,
    recurrenceEndDate: row.recurrenceEndDate,
    createdByName: row.createdByUser ? `${row.createdByUser.firstName} ${row.createdByUser.lastName}` : null,
    createdAt: row.createdAt,
    recipientCount: row._count.messages,
  };
}

export async function listCampaigns(input: ListCampaignsInput): Promise<CampaignDto[]> {
  const rows = await prisma.campaign.findMany({
    where: { status: input.status },
    include: CAMPAIGN_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toDto);
}

export async function createCampaign(input: CreateCampaignInput, createdByUserId: string): Promise<CampaignDto> {
  const row = await prisma.campaign.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      channel: input.channel,
      templateId: input.templateId ?? null,
      customContent: input.customContent ?? null,
      audienceType: input.audienceType,
      audienceFilter: (input.audienceFilter ?? undefined) as Prisma.InputJsonValue | undefined,
      scheduleType: input.scheduleType,
      scheduledFor: input.scheduledFor ?? null,
      recurrenceEndDate: input.recurrenceEndDate ?? null,
      createdByUserId,
    },
    include: CAMPAIGN_INCLUDE,
  });
  return toDto(row);
}

/** Modifiable uniquement en brouillon — un déroulement déjà planifié/en cours ne se modifie plus. */
export async function updateCampaign(input: UpdateCampaignInput): Promise<CampaignDto> {
  const existing = await prisma.campaign.findUniqueOrThrow({ where: { id: input.id } });
  if (existing.status !== "BROUILLON") {
    throw new Error("Seule une campagne en brouillon peut être modifiée.");
  }
  const row = await prisma.campaign.update({
    where: { id: input.id },
    data: {
      name: input.name,
      description: input.description,
      templateId: input.templateId,
      customContent: input.customContent,
      audienceType: input.audienceType,
      audienceFilter: (input.audienceFilter ?? undefined) as Prisma.InputJsonValue | undefined,
      scheduleType: input.scheduleType,
      scheduledFor: input.scheduledFor,
      recurrenceEndDate: input.recurrenceEndDate,
    },
    include: CAMPAIGN_INCLUDE,
  });
  return toDto(row);
}

export async function duplicateCampaign(id: string, createdByUserId: string): Promise<CampaignDto> {
  const original = await prisma.campaign.findUniqueOrThrow({ where: { id } });
  const row = await prisma.campaign.create({
    data: {
      name: `${original.name} (copie)`,
      description: original.description,
      channel: original.channel,
      templateId: original.templateId,
      customContent: original.customContent,
      audienceType: original.audienceType,
      audienceFilter: original.audienceFilter as Prisma.InputJsonValue | undefined,
      scheduleType: original.scheduleType,
      scheduledFor: null,
      recurrenceEndDate: original.recurrenceEndDate,
      createdByUserId,
      status: "BROUILLON",
    },
    include: CAMPAIGN_INCLUDE,
  });
  return toDto(row);
}

/** Aucune suppression physique si des messages ont déjà été envoyés (historique préservé) — sinon
 * suppression directe (rien à conserver). */
export async function deleteCampaign(id: string): Promise<void> {
  const messageCount = await prisma.communicationMessage.count({ where: { campaignId: id } });
  if (messageCount > 0) {
    await prisma.campaign.update({ where: { id }, data: { status: "ANNULEE" } });
  } else {
    await prisma.campaign.delete({ where: { id } });
  }
}

/** Envoi immédiat : exécute la campagne tout de suite. Différé/récurrent : planifie, la boucle de
 * vérification périodique (voir MODULE-12 §6.1) prend le relais à l'échéance. */
export async function scheduleCampaign(id: string): Promise<CampaignDto> {
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id } });
  if (campaign.scheduleType === "IMMEDIAT") {
    await executeCampaign(id);
    const row = await prisma.campaign.findUniqueOrThrow({ where: { id }, include: CAMPAIGN_INCLUDE });
    return toDto(row);
  }
  const row = await prisma.campaign.update({
    where: { id },
    data: { status: "PLANIFIEE", scheduledFor: campaign.scheduledFor ?? new Date() },
    include: CAMPAIGN_INCLUDE,
  });
  return toDto(row);
}

export async function suspendCampaign(id: string): Promise<CampaignDto> {
  const row = await prisma.campaign.update({ where: { id }, data: { status: "SUSPENDUE" }, include: CAMPAIGN_INCLUDE });
  return toDto(row);
}

export async function resumeCampaign(id: string): Promise<CampaignDto> {
  const row = await prisma.campaign.update({ where: { id }, data: { status: "PLANIFIEE" }, include: CAMPAIGN_INCLUDE });
  return toDto(row);
}

/**
 * Exécute une campagne : résout l'audience à cet instant (jamais figée, voir §3 règle 5), envoie un
 * message par destinataire. WhatsApp reste "cliquer pour envoyer" (règle §3 point 7).
 */
export async function executeCampaign(id: string): Promise<{ sent: number; failed: number }> {
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id }, include: { template: true } });
  const filter = campaign.audienceFilter as { classIds?: string[]; filiereIds?: string[]; recipientIds?: string[] } | null;
  const recipients = await resolveCampaignAudience(campaign.audienceType, filter);

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const variables = {
      Nom: recipient.lastName,
      Prénom: recipient.firstName,
      Classe: recipient.className ?? "",
      Filière: recipient.filiereName ?? "",
      Campus: recipient.campus ?? "",
    };
    const content = campaign.template
      ? substituteTemplateVariables(campaign.template.content, variables)
      : (campaign.customContent ?? "");

    const recipientPhone =
      campaign.channel === "WHATSAPP" ? (recipient.whatsapp ?? recipient.phonePrimary) : recipient.phonePrimary;

    const created = await prisma.communicationMessage.create({
      data: {
        channel: campaign.channel,
        recipientType: recipient.type,
        recipientId: recipient.id.split(":")[1] ?? null,
        recipientName: `${recipient.lastName} ${recipient.firstName}`,
        recipientPhone: recipientPhone ?? null,
        recipientEmail: recipient.email,
        content,
        templateId: campaign.templateId,
        campaignId: campaign.id,
      },
    });

    if (campaign.channel === "WHATSAPP") {
      sent += 1; // en attente d'un clic humain, comptée comme "traitée" pour la campagne
      continue;
    }

    const to = campaign.channel === "SMS" ? recipientPhone : recipient.email;
    if (!to) {
      await prisma.communicationMessage.update({
        where: { id: created.id },
        data: { status: "ECHOUE", errorMessage: "Aucun contact valide pour ce canal" },
      });
      failed += 1;
      continue;
    }

    const adapter = campaign.channel === "SMS" ? smsAdapter : emailAdapter;
    const result = await adapter.send({ to, content });
    await prisma.communicationMessage.update({
      where: { id: created.id },
      data: result.success
        ? { status: "ENVOYE", sentAt: new Date() }
        : { status: "ECHOUE", errorMessage: result.error ?? "Échec d'envoi" },
    });
    if (result.success) sent += 1;
    else failed += 1;
  }

  await advanceOrCompleteCampaign(campaign.id);

  if (campaign.createdByUserId) {
    await createInternalNotification(
      campaign.createdByUserId,
      "Campagne exécutée",
      `La campagne "${campaign.name}" a été traitée : ${sent} envoyé(s), ${failed} échoué(s).`
    );
  }

  return { sent, failed };
}

/** Détermine si une campagne récurrente doit se reprogrammer ou se terminer (voir MODULE-12 §1.7). */
async function advanceOrCompleteCampaign(id: string): Promise<void> {
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id } });
  if (campaign.scheduleType === "IMMEDIAT" || campaign.scheduleType === "DIFFERE") {
    await prisma.campaign.update({ where: { id }, data: { status: "TERMINEE" } });
    return;
  }

  const base = campaign.scheduledFor ?? new Date();
  const next = new Date(base);
  if (campaign.scheduleType === "QUOTIDIEN") next.setDate(next.getDate() + 1);
  else if (campaign.scheduleType === "HEBDOMADAIRE") next.setDate(next.getDate() + 7);
  else if (campaign.scheduleType === "MENSUEL") next.setMonth(next.getMonth() + 1);

  if (campaign.recurrenceEndDate && next > campaign.recurrenceEndDate) {
    await prisma.campaign.update({ where: { id }, data: { status: "TERMINEE" } });
    return;
  }

  await prisma.campaign.update({ where: { id }, data: { status: "PLANIFIEE", scheduledFor: next } });
}

/** Appelée par la boucle de vérification périodique (voir MODULE-12 §6.1) — campagnes à échéance. */
export async function executeDueCampaigns(): Promise<void> {
  const due = await prisma.campaign.findMany({
    where: { status: "PLANIFIEE", scheduledFor: { lte: new Date() } },
  });
  for (const campaign of due) {
    await executeCampaign(campaign.id);
  }
}
