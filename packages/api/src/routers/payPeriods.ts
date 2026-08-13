import {
  closePayPeriodInputSchema,
  createPayPeriodInputSchema,
  listPayPeriodsInputSchema,
  payPeriodIdInputSchema,
  payPeriodSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as payPeriodService from "../services/payPeriodService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const payPeriodsRouter = router({
  list: permissionProcedure("PAIE_BULLETINS:LECTURE")
    .input(listPayPeriodsInputSchema)
    .output(z.array(payPeriodSchema))
    .query(({ input }) => payPeriodService.listPayPeriods(input)),

  getById: permissionProcedure("PAIE_BULLETINS:LECTURE")
    .input(payPeriodIdInputSchema)
    .output(payPeriodSchema)
    .query(({ input }) => payPeriodService.getPayPeriodById(input.id)),

  create: permissionProcedure("PAIE_BULLETINS:CREATION")
    .input(createPayPeriodInputSchema)
    .output(payPeriodSchema)
    .mutation(async ({ input, ctx }) => {
      const period = await payPeriodService.createPayPeriod(input);
      await logAction({
        userId: ctx.session.userId,
        action: "PAY_PERIOD_OPEN",
        module: "PAIE_BULLETINS",
        entityType: "PayPeriod",
        entityId: period.id,
        result: "SUCCES",
        details: { year: input.year, month: input.month },
        ipAddress: ctx.ipAddress,
      });
      return period;
    }),

  close: permissionProcedure("PAIE_BULLETINS:VALIDATION")
    .input(closePayPeriodInputSchema)
    .output(payPeriodSchema)
    .mutation(async ({ input, ctx }) => {
      const period = await payPeriodService.closePayPeriod(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "PAY_PERIOD_CLOSE",
        module: "PAIE_BULLETINS",
        entityType: "PayPeriod",
        entityId: period.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return period;
    }),

  reopen: permissionProcedure("PAIE:ADMINISTRATION")
    .input(payPeriodIdInputSchema)
    .output(payPeriodSchema)
    .mutation(async ({ input, ctx }) => {
      const period = await payPeriodService.reopenPayPeriod(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "PAY_PERIOD_REOPEN",
        module: "PAIE",
        entityType: "PayPeriod",
        entityId: period.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return period;
    }),
});
