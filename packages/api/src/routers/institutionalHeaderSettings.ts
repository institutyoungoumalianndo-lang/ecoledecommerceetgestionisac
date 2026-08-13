import { institutionalHeaderSettingsSchema, updateInstitutionalHeaderSettingsInputSchema } from "@isac-erp/shared";
import * as institutionalHeaderSettingsService from "../services/documents/institutionalHeaderSettingsService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, publicProcedure, router } from "../trpc.js";

export const institutionalHeaderSettingsRouter = router({
  // Public en lecture : le moteur de documents doit pouvoir la lire sans session dédiée, comme le cachet (branding.ts).
  get: publicProcedure
    .output(institutionalHeaderSettingsSchema)
    .query(() => institutionalHeaderSettingsService.getInstitutionalHeaderSettings()),

  update: permissionProcedure("PARAMETRES_DOCUMENTS:MODIFICATION")
    .input(updateInstitutionalHeaderSettingsInputSchema)
    .output(institutionalHeaderSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const { before, after } = await institutionalHeaderSettingsService.updateInstitutionalHeaderSettings(input);
      await logAction({
        userId: ctx.session.userId,
        action: "SETTINGS_INSTITUTIONAL_HEADER_UPDATE",
        module: "PARAMETRES",
        result: "SUCCES",
        details: { before, after },
        ipAddress: ctx.ipAddress,
      });
      return after;
    }),
});
