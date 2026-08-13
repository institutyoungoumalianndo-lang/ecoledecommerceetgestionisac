import {
  currencySettingsSchema,
  regionalSettingsSchema,
  updateCurrencySettingsInputSchema,
  updateRegionalSettingsInputSchema,
} from "@isac-erp/shared";
import * as localizationService from "../services/localizationService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, publicProcedure, router } from "../trpc.js";

export const localizationRouter = router({
  currency: router({
    // Public : le formatage monétaire (principe non négociable n°6) doit
    // pouvoir être lu par tout écran affichant un montant, dès le login.
    get: publicProcedure.output(currencySettingsSchema).query(() => localizationService.getCurrencySettings()),

    update: permissionProcedure("DEVISE:MODIFICATION")
      .input(updateCurrencySettingsInputSchema)
      .output(currencySettingsSchema)
      .mutation(async ({ input, ctx }) => {
        const { before, after } = await localizationService.updateCurrencySettings(input);
        await logAction({
          userId: ctx.session.userId,
          action: "SETTINGS_CURRENCY_UPDATE",
          module: "PARAMETRES",
          result: "SUCCES",
          details: { before, after },
          ipAddress: ctx.ipAddress,
        });
        return after;
      }),
  }),

  regional: router({
    get: publicProcedure.output(regionalSettingsSchema).query(() => localizationService.getRegionalSettings()),

    update: permissionProcedure("REGIONAL:MODIFICATION")
      .input(updateRegionalSettingsInputSchema)
      .output(regionalSettingsSchema)
      .mutation(async ({ input, ctx }) => {
        const { before, after } = await localizationService.updateRegionalSettings(input);
        await logAction({
          userId: ctx.session.userId,
          action: "SETTINGS_REGIONAL_UPDATE",
          module: "PARAMETRES",
          result: "SUCCES",
          details: { before, after },
          ipAddress: ctx.ipAddress,
        });
        return after;
      }),
  }),
});
