import { z } from "zod";
import {
  createEmployeeCategoryInputSchema,
  employeeCategoryIdInputSchema,
  employeeCategorySchema,
  updateEmployeeCategoryInputSchema,
} from "@isac-erp/shared";
import * as employeeCategoryService from "../services/employeeCategoryService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const employeeCategoriesRouter = router({
  list: permissionProcedure("PAIE_EMPLOYES:LECTURE")
    .output(z.array(employeeCategorySchema))
    .query(() => employeeCategoryService.listEmployeeCategories()),

  create: permissionProcedure("PAIE_EMPLOYES:CREATION")
    .input(createEmployeeCategoryInputSchema)
    .output(employeeCategorySchema)
    .mutation(async ({ input, ctx }) => {
      const category = await employeeCategoryService.createEmployeeCategory(input);
      await logAction({
        userId: ctx.session.userId,
        action: "EMPLOYEE_CATEGORY_CREATE",
        module: "PAIE_EMPLOYES",
        entityType: "EmployeeCategory",
        entityId: category.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return category;
    }),

  update: permissionProcedure("PAIE_EMPLOYES:MODIFICATION")
    .input(updateEmployeeCategoryInputSchema)
    .output(employeeCategorySchema)
    .mutation(async ({ input, ctx }) => {
      const category = await employeeCategoryService.updateEmployeeCategory(input);
      await logAction({
        userId: ctx.session.userId,
        action: "EMPLOYEE_CATEGORY_UPDATE",
        module: "PAIE_EMPLOYES",
        entityType: "EmployeeCategory",
        entityId: category.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return category;
    }),

  deactivate: permissionProcedure("PAIE_EMPLOYES:SUPPRESSION")
    .input(employeeCategoryIdInputSchema)
    .output(employeeCategorySchema)
    .mutation(async ({ input, ctx }) => {
      const category = await employeeCategoryService.deactivateEmployeeCategory(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "EMPLOYEE_CATEGORY_DEACTIVATE",
        module: "PAIE_EMPLOYES",
        entityType: "EmployeeCategory",
        entityId: category.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return category;
    }),

  reactivate: permissionProcedure("PAIE_EMPLOYES:MODIFICATION")
    .input(employeeCategoryIdInputSchema)
    .output(employeeCategorySchema)
    .mutation(async ({ input, ctx }) => {
      const category = await employeeCategoryService.reactivateEmployeeCategory(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "EMPLOYEE_CATEGORY_REACTIVATE",
        module: "PAIE_EMPLOYES",
        entityType: "EmployeeCategory",
        entityId: category.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return category;
    }),
});
