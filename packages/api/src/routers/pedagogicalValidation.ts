import { pedagogicalDiagnosticResultSchema, validateClassPedagogyInputSchema } from "@isac-erp/shared";
import * as pedagogicalValidationService from "../services/pedagogicalValidationService.js";
import { permissionProcedure, router } from "../trpc.js";

export const pedagogicalValidationRouter = router({
  validateClass: permissionProcedure("MATIERES:LECTURE")
    .input(validateClassPedagogyInputSchema)
    .output(pedagogicalDiagnosticResultSchema)
    .query(({ input }) => pedagogicalValidationService.validateClassPedagogy(input.classId)),
});
