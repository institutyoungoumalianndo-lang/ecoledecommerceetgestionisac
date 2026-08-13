import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  cashRegisterSessionSchema,
  closeCashRegisterSessionInputSchema,
  listCashRegisterSessionsInputSchema,
  openCashRegisterSessionInputSchema,
} from "@isac-erp/shared";
import * as sessionService from "../services/cashRegisterSessionService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const cashRegisterSessionsRouter = router({
  list: permissionProcedure("CAISSE:LECTURE")
    .input(listCashRegisterSessionsInputSchema)
    .output(z.array(cashRegisterSessionSchema))
    .query(({ input }) => sessionService.listCashRegisterSessions(input)),

  getMyOpenSession: permissionProcedure("CAISSE:LECTURE")
    .output(cashRegisterSessionSchema.nullable())
    .query(({ ctx }) => sessionService.getOpenSessionForUser(ctx.session.userId)),

  open: permissionProcedure("CAISSE:CREATION")
    .input(openCashRegisterSessionInputSchema)
    .output(cashRegisterSessionSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const session = await sessionService.openCashRegisterSession(input, ctx.session.userId);
        await logAction({
          userId: ctx.session.userId,
          action: "CASH_SESSION_OPEN",
          module: "CAISSE",
          entityType: "CashRegisterSession",
          entityId: session.id,
          result: "SUCCES",
          details: { openingBalance: session.openingBalance },
          ipAddress: ctx.ipAddress,
        });
        return session;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Ouverture de caisse impossible.",
        });
      }
    }),

  close: permissionProcedure("CAISSE:VALIDATION")
    .input(closeCashRegisterSessionInputSchema)
    .output(cashRegisterSessionSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { before, after } = await sessionService.closeCashRegisterSession(input, ctx.session.userId);
        await logAction({
          userId: ctx.session.userId,
          action: "CASH_SESSION_CLOSE",
          module: "CAISSE",
          entityType: "CashRegisterSession",
          entityId: after.id,
          result: "SUCCES",
          details: {
            openingBalance: before.openingBalance,
            closingBalanceDeclared: after.closingBalanceDeclared,
            closingBalanceComputed: after.closingBalanceComputed,
            variance: after.variance,
          },
          ipAddress: ctx.ipAddress,
        });
        return after;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Fermeture de caisse impossible.",
        });
      }
    }),
});
