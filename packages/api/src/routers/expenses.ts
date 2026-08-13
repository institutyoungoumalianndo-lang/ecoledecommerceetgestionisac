import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  addExpenseDocumentInputSchema,
  cancelExpenseInputSchema,
  createExpenseInputSchema,
  expenseIdInputSchema,
  expenseSchema,
  listExpensesInputSchema,
  listExpensesResultSchema,
  rejectExpenseInputSchema,
  updateExpenseInputSchema,
} from "@isac-erp/shared";
import * as expenseService from "../services/expenseService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

function wrapError(error: unknown, fallback: string): TRPCError {
  return new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : fallback });
}

export const expensesRouter = router({
  list: permissionProcedure("DEPENSES:LECTURE")
    .input(listExpensesInputSchema)
    .output(listExpensesResultSchema)
    .query(({ input }) => expenseService.listExpenses(input)),

  getById: permissionProcedure("DEPENSES:LECTURE")
    .input(expenseIdInputSchema)
    .output(expenseSchema)
    .query(({ input }) => expenseService.getExpenseById(input.id)),

  create: permissionProcedure("DEPENSES:CREATION")
    .input(createExpenseInputSchema)
    .output(expenseSchema)
    .mutation(async ({ input, ctx }) => {
      const expense = await expenseService.createExpense(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "EXPENSE_CREATE",
        module: "DEPENSES",
        entityType: "Expense",
        entityId: expense.id,
        result: "SUCCES",
        details: { expenseNumber: expense.expenseNumber, amount: expense.amount },
        ipAddress: ctx.ipAddress,
      });
      return expense;
    }),

  update: permissionProcedure("DEPENSES:MODIFICATION")
    .input(updateExpenseInputSchema)
    .output(expenseSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const expense = await expenseService.updateExpense(input);
        await logAction({
          userId: ctx.session.userId,
          action: "EXPENSE_UPDATE",
          module: "DEPENSES",
          entityType: "Expense",
          entityId: expense.id,
          result: "SUCCES",
          ipAddress: ctx.ipAddress,
        });
        return expense;
      } catch (error) {
        throw wrapError(error, "Modification impossible.");
      }
    }),

  submit: permissionProcedure("DEPENSES:MODIFICATION")
    .input(expenseIdInputSchema)
    .output(expenseSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const expense = await expenseService.submitExpense(input.id);
        await logAction({
          userId: ctx.session.userId,
          action: "EXPENSE_SUBMIT",
          module: "DEPENSES",
          entityType: "Expense",
          entityId: expense.id,
          result: "SUCCES",
          ipAddress: ctx.ipAddress,
        });
        return expense;
      } catch (error) {
        throw wrapError(error, "Soumission impossible.");
      }
    }),

  approve: permissionProcedure("DEPENSES:VALIDATION")
    .input(expenseIdInputSchema)
    .output(expenseSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const expense = await expenseService.approveExpense(input.id, ctx.session.userId);
        await logAction({
          userId: ctx.session.userId,
          action: "EXPENSE_APPROVE",
          module: "DEPENSES",
          entityType: "Expense",
          entityId: expense.id,
          result: "SUCCES",
          details: { journalEntryGenerated: Boolean(expense.journalEntryId) },
          ipAddress: ctx.ipAddress,
        });
        return expense;
      } catch (error) {
        throw wrapError(error, "Approbation impossible.");
      }
    }),

  reject: permissionProcedure("DEPENSES:VALIDATION")
    .input(rejectExpenseInputSchema)
    .output(expenseSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const expense = await expenseService.rejectExpense(input);
        await logAction({
          userId: ctx.session.userId,
          action: "EXPENSE_REJECT",
          module: "DEPENSES",
          entityType: "Expense",
          entityId: expense.id,
          result: "SUCCES",
          details: { reason: input.reason },
          ipAddress: ctx.ipAddress,
        });
        return expense;
      } catch (error) {
        throw wrapError(error, "Rejet impossible.");
      }
    }),

  cancel: permissionProcedure("DEPENSES:SUPPRESSION")
    .input(cancelExpenseInputSchema)
    .output(expenseSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const expense = await expenseService.cancelExpense(input, ctx.session.userId);
        await logAction({
          userId: ctx.session.userId,
          action: "EXPENSE_CANCEL",
          module: "DEPENSES",
          entityType: "Expense",
          entityId: expense.id,
          result: "SUCCES",
          details: { reason: input.reason },
          ipAddress: ctx.ipAddress,
        });
        return expense;
      } catch (error) {
        throw wrapError(error, "Annulation impossible.");
      }
    }),

  addDocument: permissionProcedure("DEPENSES:MODIFICATION")
    .input(addExpenseDocumentInputSchema)
    .output(expenseSchema)
    .mutation(async ({ input, ctx }) => {
      const expense = await expenseService.addExpenseDocument(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "EXPENSE_DOCUMENT_ADD",
        module: "DEPENSES",
        entityType: "Expense",
        entityId: expense.id,
        result: "SUCCES",
        details: { documentType: input.documentType, fileName: input.fileName },
        ipAddress: ctx.ipAddress,
      });
      return expense;
    }),

  removeDocument: permissionProcedure("DEPENSES:MODIFICATION")
    .input(z.object({ documentId: z.string().uuid() }))
    .output(expenseSchema)
    .mutation(async ({ input, ctx }) => {
      const expense = await expenseService.removeExpenseDocument(input.documentId);
      await logAction({
        userId: ctx.session.userId,
        action: "EXPENSE_DOCUMENT_REMOVE",
        module: "DEPENSES",
        entityType: "Expense",
        entityId: expense.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return expense;
    }),
});
