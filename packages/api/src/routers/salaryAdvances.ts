import {
  createSalaryAdvanceInputSchema,
  listSalaryAdvancesInputSchema,
  salaryAdvanceIdInputSchema,
  salaryAdvanceSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as salaryAdvanceService from "../services/salaryAdvanceService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const salaryAdvancesRouter = router({
  list: permissionProcedure("PAIE_AVANCES:LECTURE")
    .input(listSalaryAdvancesInputSchema)
    .output(z.array(salaryAdvanceSchema))
    .query(({ input }) => salaryAdvanceService.listSalaryAdvances(input)),

  create: permissionProcedure("PAIE_AVANCES:CREATION")
    .input(createSalaryAdvanceInputSchema)
    .output(salaryAdvanceSchema)
    .mutation(async ({ input, ctx }) => {
      const advance = await salaryAdvanceService.createSalaryAdvance(input);
      await logAction({
        userId: ctx.session.userId,
        action: "SALARY_ADVANCE_CREATE",
        module: "PAIE_AVANCES",
        entityType: "SalaryAdvance",
        entityId: advance.id,
        result: "SUCCES",
        details: { employeeId: input.employeeId, amount: input.amount },
        ipAddress: ctx.ipAddress,
      });
      return advance;
    }),

  cancel: permissionProcedure("PAIE_AVANCES:SUPPRESSION")
    .input(salaryAdvanceIdInputSchema)
    .output(salaryAdvanceSchema)
    .mutation(async ({ input, ctx }) => {
      const advance = await salaryAdvanceService.cancelSalaryAdvance(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "SALARY_ADVANCE_CANCEL",
        module: "PAIE_AVANCES",
        entityType: "SalaryAdvance",
        entityId: advance.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return advance;
    }),
});
