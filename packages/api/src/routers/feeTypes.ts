import { z } from "zod";
import {
  createFeeTypeInputSchema,
  feeTypeIdInputSchema,
  feeTypeSchema,
  updateFeeTypeInputSchema,
} from "@isac-erp/shared";
import * as feeTypeService from "../services/feeTypeService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const feeTypesRouter = router({
  list: permissionProcedure("FRAIS:LECTURE")
    .output(z.array(feeTypeSchema))
    .query(() => feeTypeService.listFeeTypes()),

  create: permissionProcedure("FRAIS:ADMINISTRATION")
    .input(createFeeTypeInputSchema)
    .output(feeTypeSchema)
    .mutation(async ({ input, ctx }) => {
      const feeType = await feeTypeService.createFeeType(input);
      await logAction({
        userId: ctx.session.userId,
        action: "FEE_TYPE_CREATE",
        module: "FRAIS",
        entityType: "FeeType",
        entityId: feeType.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return feeType;
    }),

  update: permissionProcedure("FRAIS:ADMINISTRATION")
    .input(updateFeeTypeInputSchema)
    .output(feeTypeSchema)
    .mutation(async ({ input, ctx }) => {
      const feeType = await feeTypeService.updateFeeType(input);
      await logAction({
        userId: ctx.session.userId,
        action: "FEE_TYPE_UPDATE",
        module: "FRAIS",
        entityType: "FeeType",
        entityId: feeType.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return feeType;
    }),

  deactivate: permissionProcedure("FRAIS:SUPPRESSION")
    .input(feeTypeIdInputSchema)
    .output(feeTypeSchema)
    .mutation(async ({ input, ctx }) => {
      const feeType = await feeTypeService.deactivateFeeType(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "FEE_TYPE_DEACTIVATE",
        module: "FRAIS",
        entityType: "FeeType",
        entityId: feeType.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return feeType;
    }),

  reactivate: permissionProcedure("FRAIS:ADMINISTRATION")
    .input(feeTypeIdInputSchema)
    .output(feeTypeSchema)
    .mutation(async ({ input, ctx }) => {
      const feeType = await feeTypeService.reactivateFeeType(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "FEE_TYPE_REACTIVATE",
        module: "FRAIS",
        entityType: "FeeType",
        entityId: feeType.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return feeType;
    }),
});
