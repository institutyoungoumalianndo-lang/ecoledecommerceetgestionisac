import { z } from "zod";
import {
  assetIdInputSchema,
  assetMaintenanceSchema,
  createAssetMaintenanceInputSchema,
  updateAssetMaintenanceInputSchema,
} from "@isac-erp/shared";
import * as assetMaintenanceService from "../services/assetMaintenanceService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const assetMaintenancesRouter = router({
  list: permissionProcedure("INVENTAIRE:LECTURE")
    .input(assetIdInputSchema)
    .output(z.array(assetMaintenanceSchema))
    .query(({ input }) => assetMaintenanceService.listAssetMaintenances(input.id)),

  create: permissionProcedure("INVENTAIRE:MODIFICATION")
    .input(createAssetMaintenanceInputSchema)
    .output(assetMaintenanceSchema)
    .mutation(async ({ input, ctx }) => {
      const maintenance = await assetMaintenanceService.createAssetMaintenance(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "ASSET_MAINTENANCE_CREATE",
        module: "INVENTAIRE",
        entityType: "AssetMaintenance",
        entityId: maintenance.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return maintenance;
    }),

  update: permissionProcedure("INVENTAIRE:MODIFICATION")
    .input(updateAssetMaintenanceInputSchema)
    .output(assetMaintenanceSchema)
    .mutation(async ({ input, ctx }) => {
      const maintenance = await assetMaintenanceService.updateAssetMaintenance(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ASSET_MAINTENANCE_UPDATE",
        module: "INVENTAIRE",
        entityType: "AssetMaintenance",
        entityId: maintenance.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return maintenance;
    }),
});
