import { payrollSettingsSchema, updatePayrollSettingsInputSchema } from "@isac-erp/shared";
import * as payrollSettingsService from "../services/payrollSettingsService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const payrollSettingsRouter = router({
  get: permissionProcedure("PAIE:LECTURE")
    .output(payrollSettingsSchema)
    .query(() => payrollSettingsService.getPayrollSettings()),

  update: permissionProcedure("PAIE:ADMINISTRATION")
    .input(updatePayrollSettingsInputSchema)
    .output(payrollSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const settings = await payrollSettingsService.updatePayrollSettings(input);
      await logAction({
        userId: ctx.session.userId,
        action: "PAYROLL_SETTINGS_UPDATE",
        module: "PAIE",
        entityType: "PayrollSettings",
        entityId: settings.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return settings;
    }),
});
