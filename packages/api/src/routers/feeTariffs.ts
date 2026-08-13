import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createFeeTariffInputSchema,
  feeTariffIdInputSchema,
  feeTariffListFilterInputSchema,
  feeTariffSchema,
  setFeeInstallmentPlanInputSchema,
  updateFeeTariffInputSchema,
} from "@isac-erp/shared";
import * as feeTariffService from "../services/feeTariffService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const feeTariffsRouter = router({
  list: permissionProcedure("FRAIS:LECTURE")
    .input(feeTariffListFilterInputSchema)
    .output(z.array(feeTariffSchema))
    .query(({ input }) => feeTariffService.listFeeTariffs(input)),

  getById: permissionProcedure("FRAIS:LECTURE")
    .input(feeTariffIdInputSchema)
    .output(feeTariffSchema)
    .query(({ input }) => feeTariffService.getFeeTariffById(input.id)),

  create: permissionProcedure("FRAIS:CREATION")
    .input(createFeeTariffInputSchema)
    .output(feeTariffSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const tariff = await feeTariffService.createFeeTariff(input);
        await logAction({
          userId: ctx.session.userId,
          action: "FEE_TARIFF_CREATE",
          module: "FRAIS",
          entityType: "FeeTariff",
          entityId: tariff.id,
          result: "SUCCES",
          details: { feeTypeId: tariff.feeTypeId, amount: tariff.amount },
          ipAddress: ctx.ipAddress,
        });
        return tariff;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Création du tarif impossible.",
        });
      }
    }),

  updateAmount: permissionProcedure("FRAIS:MODIFICATION")
    .input(updateFeeTariffInputSchema)
    .output(feeTariffSchema)
    .mutation(async ({ input, ctx }) => {
      const { before, after } = await feeTariffService.updateFeeTariffAmount(input);
      await logAction({
        userId: ctx.session.userId,
        action: "FEE_TARIFF_UPDATE",
        module: "FRAIS",
        entityType: "FeeTariff",
        entityId: after.id,
        result: "SUCCES",
        details: { before: { amount: before.amount }, after: { amount: after.amount }, justification: input.justification },
        ipAddress: ctx.ipAddress,
      });
      return after;
    }),

  deactivate: permissionProcedure("FRAIS:SUPPRESSION")
    .input(feeTariffIdInputSchema)
    .output(feeTariffSchema)
    .mutation(async ({ input, ctx }) => {
      const tariff = await feeTariffService.deactivateFeeTariff(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "FEE_TARIFF_DEACTIVATE",
        module: "FRAIS",
        entityType: "FeeTariff",
        entityId: tariff.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return tariff;
    }),

  reactivate: permissionProcedure("FRAIS:MODIFICATION")
    .input(feeTariffIdInputSchema)
    .output(feeTariffSchema)
    .mutation(async ({ input, ctx }) => {
      const tariff = await feeTariffService.reactivateFeeTariff(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "FEE_TARIFF_REACTIVATE",
        module: "FRAIS",
        entityType: "FeeTariff",
        entityId: tariff.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return tariff;
    }),

  setInstallmentPlan: permissionProcedure("FRAIS:MODIFICATION")
    .input(setFeeInstallmentPlanInputSchema)
    .output(feeTariffSchema)
    .mutation(async ({ input, ctx }) => {
      const tariff = await feeTariffService.setFeeInstallmentPlan(input);
      await logAction({
        userId: ctx.session.userId,
        action: "FEE_INSTALLMENT_PLAN_SET",
        module: "FRAIS",
        entityType: "FeeTariff",
        entityId: tariff.id,
        result: "SUCCES",
        details: { installmentCount: input.installments.length },
        ipAddress: ctx.ipAddress,
      });
      return tariff;
    }),

  removeInstallmentPlan: permissionProcedure("FRAIS:MODIFICATION")
    .input(feeTariffIdInputSchema)
    .output(feeTariffSchema)
    .mutation(async ({ input, ctx }) => {
      await feeTariffService.removeFeeInstallmentPlan(input.id);
      const tariff = await feeTariffService.getFeeTariffById(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "FEE_INSTALLMENT_PLAN_REMOVE",
        module: "FRAIS",
        entityType: "FeeTariff",
        entityId: tariff.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return tariff;
    }),
});
