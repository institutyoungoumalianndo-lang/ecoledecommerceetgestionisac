import {
  executeStudentImportInputSchema,
  executeStudentImportOutputSchema,
  validateStudentImportInputSchema,
  validateStudentImportOutputSchema,
} from "@isac-erp/shared";
import * as studentImportService from "../services/studentImportService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const studentImportRouter = router({
  // Mutation plutôt que query : la charge (jusqu'à 2000 lignes) dépasserait
  // la limite pratique d'une requête GET (httpBatchLink sérialise les query
  // en paramètres d'URL) — aucune écriture n'a lieu ici pour autant.
  validate: permissionProcedure("ETUDIANTS_IMPORT:CREATION")
    .input(validateStudentImportInputSchema)
    .output(validateStudentImportOutputSchema)
    .mutation(({ input }) => studentImportService.validateStudentImport(input)),

  execute: permissionProcedure("ETUDIANTS_IMPORT:VALIDATION")
    .input(executeStudentImportInputSchema)
    .output(executeStudentImportOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await studentImportService.executeStudentImport(input);
      await logAction({
        userId: ctx.session.userId,
        action: "STUDENT_IMPORT_EXECUTE",
        module: "ETUDIANTS_IMPORT",
        result: "SUCCES",
        details: { importedCount: result.importedCount, failedCount: result.failedRows.length },
        ipAddress: ctx.ipAddress,
      });
      return result;
    }),
});
