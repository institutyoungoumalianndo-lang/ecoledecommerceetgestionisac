import { establishmentSettingsSchema, updateEstablishmentSettingsInputSchema } from "@isac-erp/shared";
import * as establishmentService from "../services/establishmentService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, publicProcedure, router } from "../trpc.js";

export const establishmentRouter = router({
  // Public : l'écran de connexion affiche le nom/logo avant authentification
  // (voir MODULE-01 §1.3).
  get: publicProcedure.output(establishmentSettingsSchema).query(() => {
    return establishmentService.getEstablishmentSettings();
  }),

  update: permissionProcedure("ETABLISSEMENT:MODIFICATION")
    .input(updateEstablishmentSettingsInputSchema)
    .output(establishmentSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const { before, after } = await establishmentService.updateEstablishmentSettings(input);
      await logAction({
        userId: ctx.session.userId,
        action: "SETTINGS_ESTABLISHMENT_UPDATE",
        module: "PARAMETRES",
        result: "SUCCES",
        details: { before, after },
        ipAddress: ctx.ipAddress,
      });
      return after;
    }),
});
