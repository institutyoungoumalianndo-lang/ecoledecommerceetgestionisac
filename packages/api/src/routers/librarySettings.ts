import { librarySettingsSchema, updateLibrarySettingsInputSchema } from "@isac-erp/shared";
import * as librarySettingsService from "../services/librarySettingsService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const librarySettingsRouter = router({
  get: permissionProcedure("BIBLIOTHEQUE:LECTURE")
    .output(librarySettingsSchema)
    .query(() => librarySettingsService.getLibrarySettings()),

  update: permissionProcedure("BIBLIOTHEQUE:ADMINISTRATION")
    .input(updateLibrarySettingsInputSchema)
    .output(librarySettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const settings = await librarySettingsService.updateLibrarySettings(input);
      await logAction({
        userId: ctx.session.userId,
        action: "LIBRARY_SETTINGS_UPDATE",
        module: "BIBLIOTHEQUE",
        entityType: "LibrarySettings",
        entityId: "singleton",
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return settings;
    }),
});
