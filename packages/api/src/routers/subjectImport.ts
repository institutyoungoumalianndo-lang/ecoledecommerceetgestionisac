import {
  executeSubjectImportInputSchema,
  executeSubjectImportOutputSchema,
  validateSubjectImportInputSchema,
  validateSubjectImportOutputSchema,
} from "@isac-erp/shared";
import * as subjectImportService from "../services/subjectImportService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const subjectImportRouter = router({
  validate: permissionProcedure("MATIERES_IMPORT:CREATION")
    .input(validateSubjectImportInputSchema)
    .output(validateSubjectImportOutputSchema)
    .mutation(({ input }) => subjectImportService.validateSubjectImport(input)),

  execute: permissionProcedure("MATIERES_IMPORT:VALIDATION")
    .input(executeSubjectImportInputSchema)
    .output(executeSubjectImportOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await subjectImportService.executeSubjectImport(input);
      await logAction({
        userId: ctx.session.userId,
        action: "SUBJECT_IMPORT_EXECUTE",
        module: "MATIERES_IMPORT",
        result: "SUCCES",
        details: { importedCount: result.importedCount, failedCount: result.failedRows.length },
        ipAddress: ctx.ipAddress,
      });
      return result;
    }),
});
