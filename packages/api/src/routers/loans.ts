import { z } from "zod";
import {
  createLoanInputSchema,
  listLoansInputSchema,
  loanSchema,
  returnLoanInputSchema,
} from "@isac-erp/shared";
import * as loanService from "../services/loanService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const loansRouter = router({
  list: permissionProcedure("BIBLIOTHEQUE:LECTURE")
    .input(listLoansInputSchema)
    .output(z.array(loanSchema))
    .query(({ input }) => loanService.listLoans(input)),

  create: permissionProcedure("BIBLIOTHEQUE:CREATION")
    .input(createLoanInputSchema)
    .output(loanSchema)
    .mutation(async ({ input, ctx }) => {
      const loan = await loanService.createLoan(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "LOAN_CREATE",
        module: "BIBLIOTHEQUE",
        entityType: "Loan",
        entityId: loan.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
        details: { bookTitle: loan.bookTitle, dueDate: loan.dueDate },
      });
      return loan;
    }),

  return: permissionProcedure("BIBLIOTHEQUE:CREATION")
    .input(returnLoanInputSchema)
    .output(loanSchema)
    .mutation(async ({ input, ctx }) => {
      const loan = await loanService.returnLoan(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "LOAN_RETURN",
        module: "BIBLIOTHEQUE",
        entityType: "Loan",
        entityId: loan.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return loan;
    }),
});
