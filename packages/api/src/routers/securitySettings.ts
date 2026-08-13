import { securitySettingsSchema, updateSecuritySettingsInputSchema } from "@isac-erp/shared";
import * as securitySettingsService from "../services/securitySettingsService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const securitySettingsRouter = router({
  get: permissionProcedure("PARAMETRES_SECURITE:LECTURE")
    .output(securitySettingsSchema)
    .query(() => securitySettingsService.getSecuritySettings()),

  update: permissionProcedure("PARAMETRES_SECURITE:MODIFICATION")
    .input(updateSecuritySettingsInputSchema)
    .output(securitySettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const settings = await securitySettingsService.updateSecuritySettings(input);
      await logAction({
        userId: ctx.session.userId,
        action: "SECURITY_SETTINGS_UPDATE",
        module: "IDENTITE",
        result: "SUCCES",
        details: input,
        ipAddress: ctx.ipAddress,
      });
      return settings;
    }),
});
