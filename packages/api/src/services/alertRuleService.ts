import { prisma, type Prisma } from "@isac-erp/db";
import type { AlertEventDto, AlertRuleDto, CreateAlertRuleInput, UpdateAlertRuleInput } from "@isac-erp/shared";

function toDto(row: Prisma.AlertRuleGetPayload<Record<string, never>>): AlertRuleDto {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    metricType: row.metricType,
    comparator: row.comparator,
    threshold: Number(row.threshold),
    scope: row.scope,
    channels: row.channels,
    isActive: row.isActive,
  };
}

/** Règles d'alerte configurables (MODULE-10 §1.3/§2) — jamais de seuil codé en dur. */
export async function listAlertRules(): Promise<AlertRuleDto[]> {
  const rows = await prisma.alertRule.findMany({ orderBy: { label: "asc" } });
  return rows.map(toDto);
}

export async function createAlertRule(input: CreateAlertRuleInput): Promise<AlertRuleDto> {
  const row = await prisma.alertRule.create({
    data: {
      code: input.code,
      label: input.label,
      metricType: input.metricType,
      comparator: input.comparator,
      threshold: input.threshold,
      scope: input.scope ?? null,
      channels: input.channels,
    },
  });
  return toDto(row);
}

export async function updateAlertRule(input: UpdateAlertRuleInput): Promise<AlertRuleDto> {
  const { id, ...fields } = input;
  const row = await prisma.alertRule.update({ where: { id }, data: fields });
  return toDto(row);
}

/** Historique des franchissements — `ruleId` optionnel pour un journal transverse. */
export async function listAlertEvents(ruleId?: string): Promise<AlertEventDto[]> {
  const rows = await prisma.alertEvent.findMany({
    where: ruleId ? { ruleId } : undefined,
    include: { rule: true },
    orderBy: { triggeredAt: "desc" },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    ruleId: r.ruleId,
    ruleLabel: r.rule.label,
    triggeredAt: r.triggeredAt,
    resolvedAt: r.resolvedAt,
    value: Number(r.value),
  }));
}
