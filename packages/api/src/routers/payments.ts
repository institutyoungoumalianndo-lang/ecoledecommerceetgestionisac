import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  cancelPaymentInputSchema,
  createPaymentInputSchema,
  getPaymentContextInputSchema,
  listPaymentsInputSchema,
  listPaymentsResultSchema,
  paymentContextSchema,
  paymentDashboardSchema,
  paymentIdInputSchema,
  paymentSchema,
} from "@isac-erp/shared";
import * as paymentService from "../services/paymentService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const paymentsRouter = router({
  getContext: permissionProcedure("PAIEMENTS:CREATION")
    .input(getPaymentContextInputSchema)
    .output(paymentContextSchema)
    .query(async ({ input }) => {
      try {
        return await paymentService.getPaymentContext(input.studentId);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Contexte d'encaissement indisponible.",
        });
      }
    }),

  list: permissionProcedure("PAIEMENTS:LECTURE")
    .input(listPaymentsInputSchema)
    .output(listPaymentsResultSchema)
    .query(({ input }) => paymentService.listPayments(input)),

  getById: permissionProcedure("PAIEMENTS:LECTURE")
    .input(paymentIdInputSchema)
    .output(paymentSchema)
    .query(({ input }) => paymentService.getPaymentById(input.id)),

  listForExport: permissionProcedure("PAIEMENTS:EXPORT")
    .input(listPaymentsInputSchema)
    .output(z.array(paymentSchema))
    .query(({ input }) => paymentService.listPaymentsForExport(input)),

  dashboard: permissionProcedure("PAIEMENTS:LECTURE")
    .output(paymentDashboardSchema)
    .query(() => paymentService.getPaymentDashboard()),

  create: permissionProcedure("PAIEMENTS:CREATION")
    .input(createPaymentInputSchema)
    .output(paymentSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const payment = await paymentService.createPayment(input, ctx.session.userId);
        await logAction({
          userId: ctx.session.userId,
          action: "PAYMENT_CREATE",
          module: "PAIEMENTS",
          entityType: "Payment",
          entityId: payment.id,
          result: "SUCCES",
          details: { receiptNumber: payment.receiptNumber, amount: payment.amount, studentId: payment.studentId },
          ipAddress: ctx.ipAddress,
        });
        return payment;
      } catch (error) {
        await logAction({
          userId: ctx.session.userId,
          action: "PAYMENT_CREATE",
          module: "PAIEMENTS",
          result: "ECHEC",
          details: { studentId: input.studentId, error: error instanceof Error ? error.message : String(error) },
          ipAddress: ctx.ipAddress,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Encaissement impossible.",
        });
      }
    }),

  cancel: permissionProcedure("PAIEMENTS:SUPPRESSION")
    .input(cancelPaymentInputSchema)
    .output(paymentSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { before, after } = await paymentService.cancelPayment(input, ctx.session.userId);
        await logAction({
          userId: ctx.session.userId,
          action: "PAYMENT_CANCEL",
          module: "PAIEMENTS",
          entityType: "Payment",
          entityId: after.id,
          result: "SUCCES",
          details: { before: { status: before.status }, after: { status: after.status }, reason: input.reason },
          ipAddress: ctx.ipAddress,
        });
        return after;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Annulation impossible.",
        });
      }
    }),
});
