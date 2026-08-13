import { z } from "zod";

/** Voir MODULE-10 §2 — moteur d'alertes configurables (Tableau de bord & Rapports décisionnels). */
export const alertComparatorSchema = z.enum(["LT", "LTE", "GT", "GTE"]);
export type AlertComparator = z.infer<typeof alertComparatorSchema>;

/** Canal de diffusion d'une alerte — INTERNE seul en v1 (voir §3 du doc, décision du porteur du projet). */
export const alertChannelSchema = z.enum(["INTERNE"]);
export type AlertChannel = z.infer<typeof alertChannelSchema>;

export const alertRuleSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  label: z.string(),
  metricType: z.string(),
  comparator: alertComparatorSchema,
  threshold: z.number(),
  scope: z.string().nullable(),
  channels: z.array(z.string()),
  isActive: z.boolean(),
});
export type AlertRuleDto = z.infer<typeof alertRuleSchema>;

export const createAlertRuleInputSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  metricType: z.string().min(1),
  comparator: alertComparatorSchema,
  threshold: z.number(),
  scope: z.string().optional(),
  channels: z.array(alertChannelSchema).min(1).default(["INTERNE"]),
});
export type CreateAlertRuleInput = z.infer<typeof createAlertRuleInputSchema>;

export const updateAlertRuleInputSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).optional(),
  comparator: alertComparatorSchema.optional(),
  threshold: z.number().optional(),
  scope: z.string().optional(),
  channels: z.array(alertChannelSchema).min(1).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateAlertRuleInput = z.infer<typeof updateAlertRuleInputSchema>;

export const alertEventSchema = z.object({
  id: z.string().uuid(),
  ruleId: z.string().uuid(),
  ruleLabel: z.string(),
  triggeredAt: z.date(),
  resolvedAt: z.date().nullable(),
  value: z.number(),
});
export type AlertEventDto = z.infer<typeof alertEventSchema>;
