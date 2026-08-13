import { campusSettingsSchema, updateCampusSettingsInputSchema } from "@isac-erp/shared";
import * as campusService from "../services/campusService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, publicProcedure, router } from "../trpc.js";

export const campusRouter = router({
  // Public : l'écran de connexion affiche le nom du campus (voir MODULE-01 §1.3).
  get: publicProcedure.output(campusSettingsSchema).query(() => {
    return campusService.getCampusSettings();
  }),

  update: permissionProcedure("CAMPUS:MODIFICATION")
    .input(updateCampusSettingsInputSchema)
    .output(campusSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const { before, after } = await campusService.updateCampusSettings(input);
      await logAction({
        userId: ctx.session.userId,
        action: "SETTINGS_CAMPUS_UPDATE",
        module: "PARAMETRES",
        result: "SUCCES",
        details: { before, after },
        ipAddress: ctx.ipAddress,
      });
      return after;
    }),
});
