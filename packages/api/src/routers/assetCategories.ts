import { z } from "zod";
import {
  assetCategorySchema,
  createAssetCategoryInputSchema,
  updateAssetCategoryInputSchema,
} from "@isac-erp/shared";
import * as assetCategoryService from "../services/assetCategoryService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const assetCategoriesRouter = router({
  list: permissionProcedure("INVENTAIRE:LECTURE")
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .output(z.array(assetCategorySchema))
    .query(({ input }) => assetCategoryService.listAssetCategories(input?.activeOnly)),

  create: permissionProcedure("INVENTAIRE:ADMINISTRATION")
    .input(createAssetCategoryInputSchema)
    .output(assetCategorySchema)
    .mutation(async ({ input, ctx }) => {
      const category = await assetCategoryService.createAssetCategory(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ASSET_CATEGORY_CREATE",
        module: "INVENTAIRE",
        entityType: "AssetCategory",
        entityId: category.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return category;
    }),

  update: permissionProcedure("INVENTAIRE:ADMINISTRATION")
    .input(updateAssetCategoryInputSchema)
    .output(assetCategorySchema)
    .mutation(async ({ input, ctx }) => {
      const category = await assetCategoryService.updateAssetCategory(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ASSET_CATEGORY_UPDATE",
        module: "INVENTAIRE",
        entityType: "AssetCategory",
        entityId: category.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return category;
    }),
});
