import { z } from "zod";
import {
  assetLocationSchema,
  createAssetLocationInputSchema,
  updateAssetLocationInputSchema,
} from "@isac-erp/shared";
import * as assetLocationService from "../services/assetLocationService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const assetLocationsRouter = router({
  list: permissionProcedure("INVENTAIRE:LECTURE")
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .output(z.array(assetLocationSchema))
    .query(({ input }) => assetLocationService.listAssetLocations(input?.activeOnly)),

  create: permissionProcedure("INVENTAIRE:ADMINISTRATION")
    .input(createAssetLocationInputSchema)
    .output(assetLocationSchema)
    .mutation(async ({ input, ctx }) => {
      const location = await assetLocationService.createAssetLocation(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ASSET_LOCATION_CREATE",
        module: "INVENTAIRE",
        entityType: "AssetLocation",
        entityId: location.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return location;
    }),

  update: permissionProcedure("INVENTAIRE:ADMINISTRATION")
    .input(updateAssetLocationInputSchema)
    .output(assetLocationSchema)
    .mutation(async ({ input, ctx }) => {
      const location = await assetLocationService.updateAssetLocation(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ASSET_LOCATION_UPDATE",
        module: "INVENTAIRE",
        entityType: "AssetLocation",
        entityId: location.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return location;
    }),
});
