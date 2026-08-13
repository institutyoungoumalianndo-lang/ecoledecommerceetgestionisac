import {
  addPayrollLineComponentInputSchema,
  calculatePayPeriodInputSchema,
  calculatePayrollLineInputSchema,
  listPayrollLinesInputSchema,
  payrollLineComponentIdInputSchema,
  payrollLineIdInputSchema,
  payrollLineSchema,
  unvalidatePayrollLineInputSchema,
  updatePayrollLineHoursInputSchema,
  validatePayrollLineInputSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as payrollLineService from "../services/payrollLineService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const payrollLinesRouter = router({
  list: permissionProcedure("PAIE_BULLETINS:LECTURE")
    .input(listPayrollLinesInputSchema)
    .output(z.array(payrollLineSchema))
    .query(({ input }) => payrollLineService.listPayrollLines(input)),

  getById: permissionProcedure("PAIE_BULLETINS:LECTURE")
    .input(payrollLineIdInputSchema)
    .output(payrollLineSchema)
    .query(({ input }) => payrollLineService.getPayrollLineById(input.id)),

  calculate: permissionProcedure("PAIE_BULLETINS:CREATION")
    .input(calculatePayrollLineInputSchema)
    .output(payrollLineSchema)
    .mutation(async ({ input, ctx }) => {
      const line = await payrollLineService.calculatePayrollLine(input);
      await logAction({
        userId: ctx.session.userId,
        action: "PAYROLL_LINE_CALCULATE",
        module: "PAIE_BULLETINS",
        entityType: "PayrollLine",
        entityId: line.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return line;
    }),

  calculatePeriod: permissionProcedure("PAIE_BULLETINS:CREATION")
    .input(calculatePayPeriodInputSchema)
    .output(z.array(payrollLineSchema))
    .mutation(async ({ input, ctx }) => {
      const lines = await payrollLineService.calculatePayPeriodLines(input.payPeriodId);
      await logAction({
        userId: ctx.session.userId,
        action: "PAYROLL_PERIOD_CALCULATE",
        module: "PAIE_BULLETINS",
        entityType: "PayPeriod",
        entityId: input.payPeriodId,
        result: "SUCCES",
        details: { count: lines.length },
        ipAddress: ctx.ipAddress,
      });
      return lines;
    }),

  addComponent: permissionProcedure("PAIE_BULLETINS:MODIFICATION")
    .input(addPayrollLineComponentInputSchema)
    .output(payrollLineSchema)
    .mutation(async ({ input, ctx }) => {
      const line = await payrollLineService.addPayrollLineComponent(input);
      await logAction({
        userId: ctx.session.userId,
        action: "PAYROLL_LINE_COMPONENT_ADD",
        module: "PAIE_BULLETINS",
        entityType: "PayrollLine",
        entityId: line.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return line;
    }),

  removeComponent: permissionProcedure("PAIE_BULLETINS:MODIFICATION")
    .input(payrollLineComponentIdInputSchema)
    .output(payrollLineSchema)
    .mutation(async ({ input, ctx }) => {
      const line = await payrollLineService.removePayrollLineComponent(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "PAYROLL_LINE_COMPONENT_REMOVE",
        module: "PAIE_BULLETINS",
        entityType: "PayrollLine",
        entityId: line.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return line;
    }),

  updateHours: permissionProcedure("PAIE_BULLETINS:MODIFICATION")
    .input(updatePayrollLineHoursInputSchema)
    .output(payrollLineSchema)
    .mutation(async ({ input, ctx }) => {
      const line = await payrollLineService.updatePayrollLineHours(input);
      await logAction({
        userId: ctx.session.userId,
        action: "PAYROLL_LINE_HOURS_UPDATE",
        module: "PAIE_BULLETINS",
        entityType: "PayrollLine",
        entityId: line.id,
        result: "SUCCES",
        details: { hoursWorked: input.hoursWorked },
        ipAddress: ctx.ipAddress,
      });
      return line;
    }),

  validate: permissionProcedure("PAIE_BULLETINS:VALIDATION")
    .input(validatePayrollLineInputSchema)
    .output(payrollLineSchema)
    .mutation(async ({ input, ctx }) => {
      const line = await payrollLineService.validatePayrollLine(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "PAYROLL_LINE_VALIDATE",
        module: "PAIE_BULLETINS",
        entityType: "PayrollLine",
        entityId: line.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return line;
    }),

  unvalidate: permissionProcedure("PAIE_BULLETINS:VALIDATION")
    .input(unvalidatePayrollLineInputSchema)
    .output(payrollLineSchema)
    .mutation(async ({ input, ctx }) => {
      const line = await payrollLineService.unvalidatePayrollLine(input.id, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "PAYROLL_LINE_UNVALIDATE",
        module: "PAIE_BULLETINS",
        entityType: "PayrollLine",
        entityId: line.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return line;
    }),
});
