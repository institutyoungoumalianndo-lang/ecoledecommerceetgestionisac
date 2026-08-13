import {
  previewNextMatriculeInputSchema,
  studentNumberingSettingsSchema,
  updateStudentNumberingSettingsInputSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as matriculeService from "../services/matriculeService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

/** Numérotation du matricule (purpose=MATRICULE figé) — voir enrollmentNumbering.ts pour le numéro d'inscription. */
export const studentNumberingRouter = router({
  get: permissionProcedure("ETUDIANTS:ADMINISTRATION")
    .output(studentNumberingSettingsSchema)
    .query(() => matriculeService.getNumberingSettings("MATRICULE")),

  update: permissionProcedure("ETUDIANTS:ADMINISTRATION")
    .input(updateStudentNumberingSettingsInputSchema.omit({ purpose: true }))
    .output(studentNumberingSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const settings = await matriculeService.updateNumberingSettings({ ...input, purpose: "MATRICULE" });
      await logAction({
        userId: ctx.session.userId,
        action: "STUDENT_NUMBERING_SETTINGS_UPDATE",
        module: "ETUDIANTS",
        entityType: "StudentNumberingSettings",
        entityId: settings.id,
        result: "SUCCES",
        details: { template: settings.template, resetPolicy: settings.resetPolicy },
        ipAddress: ctx.ipAddress,
      });
      return settings;
    }),

  previewNext: permissionProcedure("ETUDIANTS:ADMINISTRATION")
    .input(previewNextMatriculeInputSchema.omit({ purpose: true }))
    .output(z.string())
    .query(({ input }) => matriculeService.previewNextNumber({ ...input, purpose: "MATRICULE" })),
});
