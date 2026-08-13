import {
  executeEnrollmentImportInputSchema,
  executeEnrollmentImportOutputSchema,
  validateEnrollmentImportInputSchema,
  validateEnrollmentImportOutputSchema,
} from "@isac-erp/shared";
import * as enrollmentImportService from "../services/enrollmentImportService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const enrollmentImportRouter = router({
  // Mutation plutôt que query — même raison que ETUDIANTS_IMPORT (Module 4) : charge trop volumineuse pour une requête GET.
  validate: permissionProcedure("INSCRIPTIONS_IMPORT:CREATION")
    .input(validateEnrollmentImportInputSchema)
    .output(validateEnrollmentImportOutputSchema)
    .mutation(({ input }) => enrollmentImportService.validateEnrollmentImport(input)),

  execute: permissionProcedure("INSCRIPTIONS_IMPORT:VALIDATION")
    .input(executeEnrollmentImportInputSchema)
    .output(executeEnrollmentImportOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await enrollmentImportService.executeEnrollmentImport(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ENROLLMENT_IMPORT_EXECUTE",
        module: "INSCRIPTIONS_IMPORT",
        result: "SUCCES",
        details: { importedCount: result.importedCount, failedCount: result.failedRows.length },
        ipAddress: ctx.ipAddress,
      });
      return result;
    }),
});
