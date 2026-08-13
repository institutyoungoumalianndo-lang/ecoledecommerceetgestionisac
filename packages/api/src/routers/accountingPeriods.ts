import { z } from "zod";
import { accountingPeriodSchema, listAccountingPeriodsInputSchema, periodInputSchema } from "@isac-erp/shared";
import * as accountingPeriodService from "../services/accountingPeriodService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const accountingPeriodsRouter = router({
  list: permissionProcedure("ECRITURES:LECTURE")
    .input(listAccountingPeriodsInputSchema)
    .output(z.array(accountingPeriodSchema))
    .query(({ input }) => accountingPeriodService.listAccountingPeriods(input)),

  lock: permissionProcedure("ECRITURES:VALIDATION")
    .input(periodInputSchema)
    .output(accountingPeriodSchema)
    .mutation(async ({ input, ctx }) => {
      const period = await accountingPeriodService.lockPeriod(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "ACCOUNTING_PERIOD_LOCK",
        module: "ECRITURES",
        entityType: "AccountingPeriod",
        entityId: period.id,
        result: "SUCCES",
        details: { year: input.year, month: input.month },
        ipAddress: ctx.ipAddress,
      });
      return period;
    }),

  unlock: permissionProcedure("ECRITURES:VALIDATION")
    .input(periodInputSchema)
    .output(accountingPeriodSchema)
    .mutation(async ({ input, ctx }) => {
      const period = await accountingPeriodService.unlockPeriod(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ACCOUNTING_PERIOD_UNLOCK",
        module: "ECRITURES",
        entityType: "AccountingPeriod",
        entityId: period.id,
        result: "SUCCES",
        details: { year: input.year, month: input.month },
        ipAddress: ctx.ipAddress,
      });
      return period;
    }),
});
