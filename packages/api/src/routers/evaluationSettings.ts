import { evaluationSettingsSchema, updateEvaluationSettingsInputSchema } from "@isac-erp/shared";
import * as evaluationSettingsService from "../services/evaluationSettingsService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const evaluationSettingsRouter = router({
  get: permissionProcedure("NOTES:LECTURE")
    .output(evaluationSettingsSchema)
    .query(() => evaluationSettingsService.getEvaluationSettings()),

  update: permissionProcedure("EVALUATION:ADMINISTRATION")
    .input(updateEvaluationSettingsInputSchema)
    .output(evaluationSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const settings = await evaluationSettingsService.updateEvaluationSettings(input);
      await logAction({
        userId: ctx.session.userId,
        action: "EVALUATION_SETTINGS_UPDATE",
        module: "EVALUATION",
        entityType: "EvaluationSettings",
        entityId: settings.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return settings;
    }),
});
