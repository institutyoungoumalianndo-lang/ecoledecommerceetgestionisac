import { auditLogFilterInputSchema, auditLogPageSchema } from "@isac-erp/shared";
import * as auditService from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const auditLogRouter = router({
  list: permissionProcedure("AUDIT:LECTURE")
    .input(auditLogFilterInputSchema)
    .output(auditLogPageSchema)
    .query(({ input }) => auditService.listAuditLog(input)),
});
