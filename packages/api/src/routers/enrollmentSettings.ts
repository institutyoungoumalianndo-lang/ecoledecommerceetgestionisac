import { z } from "zod";
import {
  enrollmentDocumentRequirementSchema,
  enrollmentSettingsSchema,
  setEnrollmentDocumentRequirementInputSchema,
  updateEnrollmentSettingsInputSchema,
} from "@isac-erp/shared";
import * as enrollmentSettingsService from "../services/enrollmentSettingsService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const enrollmentSettingsRouter = router({
  get: permissionProcedure("INSCRIPTIONS:ADMINISTRATION")
    .output(enrollmentSettingsSchema)
    .query(() => enrollmentSettingsService.getEnrollmentSettings()),

  update: permissionProcedure("INSCRIPTIONS:ADMINISTRATION")
    .input(updateEnrollmentSettingsInputSchema)
    .output(enrollmentSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const settings = await enrollmentSettingsService.updateEnrollmentSettings(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ENROLLMENT_SETTINGS_UPDATE",
        module: "INSCRIPTIONS",
        entityType: "EnrollmentSettings",
        entityId: settings.id,
        result: "SUCCES",
        details: { enforceClassCapacity: settings.enforceClassCapacity },
        ipAddress: ctx.ipAddress,
      });
      return settings;
    }),

  listDocumentRequirements: permissionProcedure("INSCRIPTIONS:ADMINISTRATION")
    .output(z.array(enrollmentDocumentRequirementSchema))
    .query(() => enrollmentSettingsService.listEnrollmentDocumentRequirements()),

  setDocumentRequirement: permissionProcedure("INSCRIPTIONS:ADMINISTRATION")
    .input(setEnrollmentDocumentRequirementInputSchema)
    .output(enrollmentDocumentRequirementSchema)
    .mutation(async ({ input, ctx }) => {
      const requirement = await enrollmentSettingsService.setEnrollmentDocumentRequirement(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ENROLLMENT_DOCUMENT_REQUIREMENT_UPDATE",
        module: "INSCRIPTIONS",
        entityType: "EnrollmentDocumentRequirement",
        entityId: requirement.id,
        result: "SUCCES",
        details: { documentType: requirement.documentType, isRequired: requirement.isRequired },
        ipAddress: ctx.ipAddress,
      });
      return requirement;
    }),
});
