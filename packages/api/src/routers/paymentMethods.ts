import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createPaymentMethodInputSchema,
  paymentMethodSchema,
  updatePaymentMethodInputSchema,
} from "@isac-erp/shared";
import * as paymentMethodService from "../services/paymentMethodService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const paymentMethodsRouter = router({
  list: permissionProcedure("PAIEMENTS:LECTURE")
    .output(z.array(paymentMethodSchema))
    .query(() => paymentMethodService.listPaymentMethods()),

  create: permissionProcedure("PAIEMENTS:ADMINISTRATION")
    .input(createPaymentMethodInputSchema)
    .output(paymentMethodSchema)
    .mutation(async ({ input, ctx }) => {
      const method = await paymentMethodService.createPaymentMethod(input);
      await logAction({
        userId: ctx.session.userId,
        action: "PAYMENT_METHOD_CREATE",
        module: "PAIEMENTS",
        entityType: "PaymentMethod",
        entityId: method.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return method;
    }),

  update: permissionProcedure("PAIEMENTS:ADMINISTRATION")
    .input(updatePaymentMethodInputSchema)
    .output(paymentMethodSchema)
    .mutation(async ({ input, ctx }) => {
      const method = await paymentMethodService.updatePaymentMethod(input);
      await logAction({
        userId: ctx.session.userId,
        action: "PAYMENT_METHOD_UPDATE",
        module: "PAIEMENTS",
        entityType: "PaymentMethod",
        entityId: method.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return method;
    }),

  deactivate: permissionProcedure("PAIEMENTS:ADMINISTRATION")
    .input(z.object({ id: z.string().uuid() }))
    .output(paymentMethodSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const method = await paymentMethodService.deactivatePaymentMethod(input.id);
        await logAction({
          userId: ctx.session.userId,
          action: "PAYMENT_METHOD_DEACTIVATE",
          module: "PAIEMENTS",
          entityType: "PaymentMethod",
          entityId: method.id,
          result: "SUCCES",
          ipAddress: ctx.ipAddress,
        });
        return method;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Désactivation impossible.",
        });
      }
    }),

  reactivate: permissionProcedure("PAIEMENTS:ADMINISTRATION")
    .input(z.object({ id: z.string().uuid() }))
    .output(paymentMethodSchema)
    .mutation(async ({ input, ctx }) => {
      const method = await paymentMethodService.reactivatePaymentMethod(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "PAYMENT_METHOD_REACTIVATE",
        module: "PAIEMENTS",
        entityType: "PaymentMethod",
        entityId: method.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return method;
    }),
});
