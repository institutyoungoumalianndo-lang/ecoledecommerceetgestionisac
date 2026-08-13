import { printThemeSettingsSchema, updatePrintThemeSettingsInputSchema } from "@isac-erp/shared";
import * as printThemeSettingsService from "../services/printThemeSettingsService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, publicProcedure, router } from "../trpc.js";

export const printThemeSettingsRouter = router({
  // Public : tout écran imprimable (bulletin, reçu...) doit pouvoir lire le thème sans permission dédiée.
  get: publicProcedure.output(printThemeSettingsSchema).query(() => printThemeSettingsService.getPrintThemeSettings()),

  update: permissionProcedure("THEME:MODIFICATION")
    .input(updatePrintThemeSettingsInputSchema)
    .output(printThemeSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const settings = await printThemeSettingsService.updatePrintThemeSettings(input);
      await logAction({
        userId: ctx.session.userId,
        action: "PRINT_THEME_UPDATE",
        module: "PARAMETRES",
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return settings;
    }),
});
