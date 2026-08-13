import { z } from "zod";
import { budgetSchema, createBudgetInputSchema, getBudgetInputSchema, updateBudgetLinesInputSchema } from "@isac-erp/shared";
import * as budgetService from "../services/budgetService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const budgetsRouter = router({
  list: permissionProcedure("BUDGET:LECTURE")
    .output(z.array(z.object({ id: z.string().uuid(), year: z.number().int(), label: z.string().nullable() })))
    .query(() => budgetService.listBudgets()),

  getByYear: permissionProcedure("BUDGET:LECTURE")
    .input(getBudgetInputSchema)
    .output(budgetSchema.nullable())
    .query(({ input }) => budgetService.getBudget(input)),

  create: permissionProcedure("BUDGET:CREATION")
    .input(createBudgetInputSchema)
    .output(budgetSchema)
    .mutation(async ({ input, ctx }) => {
      const budget = await budgetService.createBudget(input);
      await logAction({
        userId: ctx.session.userId,
        action: "BUDGET_CREATE",
        module: "BUDGET",
        entityType: "Budget",
        entityId: budget.id,
        result: "SUCCES",
        details: { year: budget.year, totalAllocated: budget.totalAllocated },
        ipAddress: ctx.ipAddress,
      });
      return budget;
    }),

  updateLines: permissionProcedure("BUDGET:MODIFICATION")
    .input(updateBudgetLinesInputSchema)
    .output(budgetSchema)
    .mutation(async ({ input, ctx }) => {
      const budget = await budgetService.updateBudgetLines(input);
      await logAction({
        userId: ctx.session.userId,
        action: "BUDGET_UPDATE_LINES",
        module: "BUDGET",
        entityType: "Budget",
        entityId: budget.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return budget;
    }),
});
