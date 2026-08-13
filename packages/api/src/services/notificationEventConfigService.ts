import { prisma, type Prisma } from "@isac-erp/db";
import type { NotificationEventConfigDto, UpdateNotificationEventConfigInput } from "@isac-erp/shared";

const CONFIG_INCLUDE = { template: true } satisfies Prisma.NotificationEventConfigInclude;
type ConfigWithRelations = Prisma.NotificationEventConfigGetPayload<{ include: typeof CONFIG_INCLUDE }>;

function toDto(row: ConfigWithRelations): NotificationEventConfigDto {
  return {
    id: row.id,
    eventType: row.eventType,
    templateId: row.templateId,
    templateLabel: row.template.label,
    channels: row.channels.filter((c): c is "SMS" | "EMAIL" => c === "SMS" || c === "EMAIL"),
    isActive: row.isActive,
  };
}

/** Configuration des notifications automatiques (voir MODULE-12 §1.10) — seuls les événements avec
 * un déclencheur réel dans le code ont une ligne (INSCRIPTION_VALIDEE/PAIEMENT_SCOLARITE/
 * BULLETIN_DISPONIBLE/CHANGEMENT_EMPLOI_DU_TEMPS, voir seed). */
export async function listNotificationEventConfigs(): Promise<NotificationEventConfigDto[]> {
  const rows = await prisma.notificationEventConfig.findMany({ include: CONFIG_INCLUDE, orderBy: { eventType: "asc" } });
  return rows.map(toDto);
}

export async function updateNotificationEventConfig(
  input: UpdateNotificationEventConfigInput
): Promise<NotificationEventConfigDto> {
  const row = await prisma.notificationEventConfig.update({
    where: { id: input.id },
    data: { templateId: input.templateId, channels: input.channels, isActive: input.isActive },
    include: CONFIG_INCLUDE,
  });
  return toDto(row);
}
