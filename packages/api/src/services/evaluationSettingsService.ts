import { prisma } from "@isac-erp/db";
import type { EvaluationSettingsDto, UpdateEvaluationSettingsInput } from "@isac-erp/shared";

async function getOrCreateSettings() {
  const existing = await prisma.evaluationSettings.findFirst();
  if (existing) return existing;
  return prisma.evaluationSettings.create({ data: {} });
}

function toDto(row: Awaited<ReturnType<typeof getOrCreateSettings>>): EvaluationSettingsDto {
  return {
    id: row.id,
    poidsOrale: Number(row.poidsOrale),
    poidsEcrite: Number(row.poidsEcrite),
    poidsComposition: Number(row.poidsComposition),
    seuilAdmission: Number(row.seuilAdmission),
    seuilPassable: Number(row.seuilPassable),
    seuilAssezBien: Number(row.seuilAssezBien),
    seuilBien: Number(row.seuilBien),
    seuilTresBien: Number(row.seuilTresBien),
    seuilAbsencesIrregulier: row.seuilAbsencesIrregulier,
  };
}

export async function getEvaluationSettings(): Promise<EvaluationSettingsDto> {
  return toDto(await getOrCreateSettings());
}

export async function updateEvaluationSettings(input: UpdateEvaluationSettingsInput): Promise<EvaluationSettingsDto> {
  const existing = await getOrCreateSettings();
  const row = await prisma.evaluationSettings.update({ where: { id: existing.id }, data: input });
  return toDto(row);
}
