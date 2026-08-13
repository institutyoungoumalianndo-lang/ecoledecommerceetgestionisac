import { z } from "zod";
import {
  documentSignatorySchema,
  documentTemplateSchema,
  officialStampSchema,
  themeSettingsSchema,
  updateDocumentSignatoryInputSchema,
  updateDocumentTemplateInputSchema,
  updateOfficialStampInputSchema,
  updateThemeSettingsInputSchema,
} from "@isac-erp/shared";
import * as brandingService from "../services/brandingService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, publicProcedure, router } from "../trpc.js";

export const brandingRouter = router({
  signatories: router({
    list: permissionProcedure("SIGNATURES:LECTURE")
      .output(z.array(documentSignatorySchema))
      .query(() => brandingService.listDocumentSignatories()),

    update: permissionProcedure("SIGNATURES:MODIFICATION")
      .input(updateDocumentSignatoryInputSchema)
      .output(documentSignatorySchema)
      .mutation(async ({ input, ctx }) => {
        const { before, after } = await brandingService.updateDocumentSignatory(input);
        await logAction({
          userId: ctx.session.userId,
          action: "SETTINGS_SIGNATORY_UPDATE",
          module: "PARAMETRES",
          entityType: "DocumentSignatory",
          entityId: input.roleCode,
          result: "SUCCES",
          details: { before, after },
          ipAddress: ctx.ipAddress,
        });
        return after;
      }),
  }),

  stamp: router({
    // Public en lecture : le Module 9 (génération de documents) aura besoin
    // d'y accéder ; sans session utilisateur dans ce contexte serveur-à-serveur
    // futur, ce choix évite un blocage prématuré. La modification reste protégée.
    get: publicProcedure.output(officialStampSchema).query(() => brandingService.getOfficialStamp()),

    update: permissionProcedure("CACHET:MODIFICATION")
      .input(updateOfficialStampInputSchema)
      .output(officialStampSchema)
      .mutation(async ({ input, ctx }) => {
        const { before, after } = await brandingService.updateOfficialStamp(input);
        await logAction({
          userId: ctx.session.userId,
          action: "SETTINGS_STAMP_UPDATE",
          module: "PARAMETRES",
          result: "SUCCES",
          details: { before, after },
          ipAddress: ctx.ipAddress,
        });
        return after;
      }),
  }),

  theme: router({
    // Public : l'écran de connexion applique déjà l'image/couleurs (voir §3.15).
    get: publicProcedure.output(themeSettingsSchema).query(() => brandingService.getThemeSettings()),

    update: permissionProcedure("THEME:MODIFICATION")
      .input(updateThemeSettingsInputSchema)
      .output(themeSettingsSchema)
      .mutation(async ({ input, ctx }) => {
        const { before, after } = await brandingService.updateThemeSettings(input);
        await logAction({
          userId: ctx.session.userId,
          action: "SETTINGS_THEME_UPDATE",
          module: "PARAMETRES",
          result: "SUCCES",
          details: { before, after },
          ipAddress: ctx.ipAddress,
        });
        return after;
      }),
  }),

  documentTemplates: router({
    list: permissionProcedure("MODELES_DOCUMENTS:LECTURE")
      .output(z.array(documentTemplateSchema))
      .query(() => brandingService.listDocumentTemplates()),

    update: permissionProcedure("MODELES_DOCUMENTS:MODIFICATION")
      .input(updateDocumentTemplateInputSchema)
      .output(documentTemplateSchema)
      .mutation(async ({ input, ctx }) => {
        const { before, after } = await brandingService.updateDocumentTemplate(input);
        await logAction({
          userId: ctx.session.userId,
          action: "SETTINGS_DOCUMENT_TEMPLATE_UPDATE",
          module: "PARAMETRES",
          entityType: "DocumentTemplate",
          entityId: input.documentType,
          result: "SUCCES",
          details: { before, after },
          ipAddress: ctx.ipAddress,
        });
        return after;
      }),
  }),
});
