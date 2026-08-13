import { z } from "zod";
import {
  createPayrollComponentTypeInputSchema,
  payrollComponentTypeIdInputSchema,
  payrollComponentTypeSchema,
  updatePayrollComponentTypeInputSchema,
} from "@isac-erp/shared";
import * as payrollComponentTypeService from "../services/payrollComponentTypeService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const payrollComponentTypesRouter = router({
  list: permissionProcedure("PAIE_BULLETINS:LECTURE")
    .output(z.array(payrollComponentTypeSchema))
    .query(() => payrollComponentTypeService.listPayrollComponentTypes()),

  create: permissionProcedure("PAIE:ADMINISTRATION")
    .input(createPayrollComponentTypeInputSchema)
    .output(payrollComponentTypeSchema)
    .mutation(async ({ input, ctx }) => {
      const type = await payrollComponentTypeService.createPayrollComponentType(input);
      await logAction({
        userId: ctx.session.userId,
        action: "PAYROLL_COMPONENT_TYPE_CREATE",
        module: "PAIE",
        entityType: "PayrollComponentType",
        entityId: type.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return type;
    }),

  update: permissionProcedure("PAIE:ADMINISTRATION")
    .input(updatePayrollComponentTypeInputSchema)
    .output(payrollComponentTypeSchema)
    .mutation(async ({ input, ctx }) => {
      const type = await payrollComponentTypeService.updatePayrollComponentType(input);
      await logAction({
        userId: ctx.session.userId,
        action: "PAYROLL_COMPONENT_TYPE_UPDATE",
        module: "PAIE",
        entityType: "PayrollComponentType",
        entityId: type.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return type;
    }),

  deactivate: permissionProcedure("PAIE:ADMINISTRATION")
    .input(payrollComponentTypeIdInputSchema)
    .output(payrollComponentTypeSchema)
    .mutation(async ({ input, ctx }) => {
      const type = await payrollComponentTypeService.deactivatePayrollComponentType(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "PAYROLL_COMPONENT_TYPE_DEACTIVATE",
        module: "PAIE",
        entityType: "PayrollComponentType",
        entityId: type.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return type;
    }),

  reactivate: permissionProcedure("PAIE:ADMINISTRATION")
    .input(payrollComponentTypeIdInputSchema)
    .output(payrollComponentTypeSchema)
    .mutation(async ({ input, ctx }) => {
      const type = await payrollComponentTypeService.reactivatePayrollComponentType(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "PAYROLL_COMPONENT_TYPE_REACTIVATE",
        module: "PAIE",
        entityType: "PayrollComponentType",
        entityId: type.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return type;
    }),
});
