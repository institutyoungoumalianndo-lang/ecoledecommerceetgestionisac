import { z } from "zod";
import { alertEventSchema, alertRuleSchema, createAlertRuleInputSchema, updateAlertRuleInputSchema } from "@isac-erp/shared";
import * as alertRuleService from "../services/alertRuleService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const alertRulesRouter = router({
  list: permissionProcedure("ALERTES:LECTURE")
    .output(z.array(alertRuleSchema))
    .query(() => alertRuleService.listAlertRules()),

  listEvents: permissionProcedure("ALERTES:LECTURE")
    .input(z.object({ ruleId: z.string().uuid().optional() }))
    .output(z.array(alertEventSchema))
    .query(({ input }) => alertRuleService.listAlertEvents(input.ruleId)),

  create: permissionProcedure("ALERTES:MODIFICATION")
    .input(createAlertRuleInputSchema)
    .output(alertRuleSchema)
    .mutation(async ({ input, ctx }) => {
      const rule = await alertRuleService.createAlertRule(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ALERT_RULE_CREATE",
        module: "ALERTES",
        entityType: "AlertRule",
        entityId: rule.id,
        result: "SUCCES",
        details: { code: rule.code, metricType: rule.metricType },
        ipAddress: ctx.ipAddress,
      });
      return rule;
    }),

  update: permissionProcedure("ALERTES:MODIFICATION")
    .input(updateAlertRuleInputSchema)
    .output(alertRuleSchema)
    .mutation(async ({ input, ctx }) => {
      const rule = await alertRuleService.updateAlertRule(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ALERT_RULE_UPDATE",
        module: "ALERTES",
        entityType: "AlertRule",
        entityId: rule.id,
        result: "SUCCES",
        details: { isActive: rule.isActive },
        ipAddress: ctx.ipAddress,
      });
      return rule;
    }),
});
