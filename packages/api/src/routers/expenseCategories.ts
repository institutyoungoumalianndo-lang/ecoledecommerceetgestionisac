import { z } from "zod";
import {
  createExpenseCategoryInputSchema,
  expenseCategorySchema,
  updateExpenseCategoryInputSchema,
} from "@isac-erp/shared";
import * as expenseCategoryService from "../services/expenseCategoryService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const expenseCategoriesRouter = router({
  list: permissionProcedure("DEPENSES:LECTURE")
    .output(z.array(expenseCategorySchema))
    .query(() => expenseCategoryService.listExpenseCategories()),

  create: permissionProcedure("DEPENSES:CREATION")
    .input(createExpenseCategoryInputSchema)
    .output(expenseCategorySchema)
    .mutation(async ({ input, ctx }) => {
      const category = await expenseCategoryService.createExpenseCategory(input);
      await logAction({
        userId: ctx.session.userId,
        action: "EXPENSE_CATEGORY_CREATE",
        module: "DEPENSES",
        entityType: "ExpenseCategory",
        entityId: category.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return category;
    }),

  update: permissionProcedure("DEPENSES:MODIFICATION")
    .input(updateExpenseCategoryInputSchema)
    .output(expenseCategorySchema)
    .mutation(async ({ input, ctx }) => {
      const category = await expenseCategoryService.updateExpenseCategory(input);
      await logAction({
        userId: ctx.session.userId,
        action: "EXPENSE_CATEGORY_UPDATE",
        module: "DEPENSES",
        entityType: "ExpenseCategory",
        entityId: category.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return category;
    }),

  deactivate: permissionProcedure("DEPENSES:SUPPRESSION")
    .input(z.object({ id: z.string().uuid() }))
    .output(expenseCategorySchema)
    .mutation(async ({ input, ctx }) => {
      const category = await expenseCategoryService.deactivateExpenseCategory(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "EXPENSE_CATEGORY_DEACTIVATE",
        module: "DEPENSES",
        entityType: "ExpenseCategory",
        entityId: category.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return category;
    }),
});
