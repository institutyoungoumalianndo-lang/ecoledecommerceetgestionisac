import {
  annulerSanctionInputSchema,
  createSanctionInputSchema,
  listSanctionsByStudentInputSchema,
  sanctionSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as sanctionService from "../services/sanctionService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const sanctionsRouter = router({
  listByStudent: permissionProcedure("SANCTIONS:LECTURE")
    .input(listSanctionsByStudentInputSchema)
    .output(z.array(sanctionSchema))
    .query(({ input }) => sanctionService.listSanctionsByStudent(input.studentId)),

  create: permissionProcedure("SANCTIONS:CREATION")
    .input(createSanctionInputSchema)
    .output(sanctionSchema)
    .mutation(async ({ input, ctx }) => {
      const sanction = await sanctionService.createSanction(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "SANCTION_CREATION",
        module: "SANCTIONS",
        entityType: "Sanction",
        entityId: sanction.id,
        result: "SUCCES",
        details: { studentId: sanction.studentId, type: sanction.type },
        ipAddress: ctx.ipAddress,
      });
      return sanction;
    }),

  annuler: permissionProcedure("SANCTIONS:ADMINISTRATION")
    .input(annulerSanctionInputSchema)
    .output(sanctionSchema)
    .mutation(async ({ input, ctx }) => {
      const sanction = await sanctionService.annulerSanction(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "SANCTION_ANNULATION",
        module: "SANCTIONS",
        entityType: "Sanction",
        entityId: sanction.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return sanction;
    }),
});
