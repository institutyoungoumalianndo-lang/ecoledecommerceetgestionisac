import { z } from "zod";
import {
  createFeeReductionInputSchema,
  feeReductionIdInputSchema,
  feeReductionSchema,
  listFeeReductionsInputSchema,
  updateFeeReductionInputSchema,
} from "@isac-erp/shared";
import * as feeReductionService from "../services/feeReductionService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const feeReductionsRouter = router({
  list: permissionProcedure("FRAIS_REDUCTIONS:LECTURE")
    .input(listFeeReductionsInputSchema)
    .output(z.array(feeReductionSchema))
    .query(({ input }) => feeReductionService.listFeeReductions(input)),

  create: permissionProcedure("FRAIS_REDUCTIONS:CREATION")
    .input(createFeeReductionInputSchema)
    .output(feeReductionSchema)
    .mutation(async ({ input, ctx }) => {
      const reduction = await feeReductionService.createFeeReduction(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "FEE_REDUCTION_CREATE",
        module: "FRAIS_REDUCTIONS",
        entityType: "FeeReduction",
        entityId: reduction.id,
        result: "SUCCES",
        details: { studentId: input.studentId, type: input.type, value: input.value, reason: input.reason },
        ipAddress: ctx.ipAddress,
      });
      return reduction;
    }),

  update: permissionProcedure("FRAIS_REDUCTIONS:MODIFICATION")
    .input(updateFeeReductionInputSchema)
    .output(feeReductionSchema)
    .mutation(async ({ input, ctx }) => {
      const reduction = await feeReductionService.updateFeeReduction(input);
      await logAction({
        userId: ctx.session.userId,
        action: "FEE_REDUCTION_UPDATE",
        module: "FRAIS_REDUCTIONS",
        entityType: "FeeReduction",
        entityId: reduction.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return reduction;
    }),

  end: permissionProcedure("FRAIS_REDUCTIONS:SUPPRESSION")
    .input(feeReductionIdInputSchema)
    .output(feeReductionSchema)
    .mutation(async ({ input, ctx }) => {
      const reduction = await feeReductionService.endFeeReduction(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "FEE_REDUCTION_END",
        module: "FRAIS_REDUCTIONS",
        entityType: "FeeReduction",
        entityId: reduction.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return reduction;
    }),
});
