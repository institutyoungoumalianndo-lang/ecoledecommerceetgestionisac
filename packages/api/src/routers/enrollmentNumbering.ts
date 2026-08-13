import {
  previewNextMatriculeInputSchema,
  studentNumberingSettingsSchema,
  updateStudentNumberingSettingsInputSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as matriculeService from "../services/matriculeService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

/** Numérotation du numéro d'inscription (purpose=INSCRIPTION figé) — voir studentNumbering.ts pour le matricule. */
export const enrollmentNumberingRouter = router({
  get: permissionProcedure("INSCRIPTIONS:ADMINISTRATION")
    .output(studentNumberingSettingsSchema)
    .query(() => matriculeService.getNumberingSettings("INSCRIPTION")),

  update: permissionProcedure("INSCRIPTIONS:ADMINISTRATION")
    .input(updateStudentNumberingSettingsInputSchema.omit({ purpose: true }))
    .output(studentNumberingSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const settings = await matriculeService.updateNumberingSettings({ ...input, purpose: "INSCRIPTION" });
      await logAction({
        userId: ctx.session.userId,
        action: "ENROLLMENT_NUMBERING_SETTINGS_UPDATE",
        module: "INSCRIPTIONS",
        entityType: "StudentNumberingSettings",
        entityId: settings.id,
        result: "SUCCES",
        details: { template: settings.template, resetPolicy: settings.resetPolicy },
        ipAddress: ctx.ipAddress,
      });
      return settings;
    }),

  previewNext: permissionProcedure("INSCRIPTIONS:ADMINISTRATION")
    .input(previewNextMatriculeInputSchema.omit({ purpose: true }))
    .output(z.string())
    .query(({ input }) => matriculeService.previewNextNumber({ ...input, purpose: "INSCRIPTION" })),
});
