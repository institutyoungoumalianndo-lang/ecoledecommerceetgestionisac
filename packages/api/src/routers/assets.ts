import {
  assetIdInputSchema,
  assetMovementSchema,
  assetSchema,
  createAssetInputSchema,
  listAssetsInputSchema,
  reformAssetInputSchema,
  updateAssetInputSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as assetService from "../services/assetService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const assetsRouter = router({
  list: permissionProcedure("INVENTAIRE:LECTURE")
    .input(listAssetsInputSchema)
    .output(z.array(assetSchema))
    .query(({ input }) => assetService.listAssets(input)),

  get: permissionProcedure("INVENTAIRE:LECTURE")
    .input(assetIdInputSchema)
    .output(assetSchema)
    .query(({ input }) => assetService.getAsset(input.id)),

  movements: permissionProcedure("INVENTAIRE:LECTURE")
    .input(assetIdInputSchema)
    .output(z.array(assetMovementSchema))
    .query(({ input }) => assetService.listAssetMovements(input.id)),

  create: permissionProcedure("INVENTAIRE:CREATION")
    .input(createAssetInputSchema)
    .output(assetSchema)
    .mutation(async ({ input, ctx }) => {
      const asset = await assetService.createAsset(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ASSET_CREATE",
        module: "INVENTAIRE",
        entityType: "Asset",
        entityId: asset.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
        details: { inventoryNumber: asset.inventoryNumber },
      });
      return asset;
    }),

  update: permissionProcedure("INVENTAIRE:MODIFICATION")
    .input(updateAssetInputSchema)
    .output(assetSchema)
    .mutation(async ({ input, ctx }) => {
      const asset = await assetService.updateAsset(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "ASSET_UPDATE",
        module: "INVENTAIRE",
        entityType: "Asset",
        entityId: asset.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return asset;
    }),

  reform: permissionProcedure("INVENTAIRE:SUPPRESSION")
    .input(reformAssetInputSchema)
    .output(assetSchema)
    .mutation(async ({ input, ctx }) => {
      const asset = await assetService.reformAsset(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "ASSET_REFORM",
        module: "INVENTAIRE",
        entityType: "Asset",
        entityId: asset.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
        details: { status: asset.status, justification: input.justification },
      });
      return asset;
    }),
});
