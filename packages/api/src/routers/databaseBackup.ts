import { z } from "zod";
import { backupSettingsSchema, databaseBackupSchema, restoreBackupInputSchema, updateBackupSettingsInputSchema } from "@isac-erp/shared";
import * as backupService from "../services/backupService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const databaseBackupRouter = router({
  list: permissionProcedure("SAUVEGARDE_BDD:LECTURE")
    .output(z.array(databaseBackupSchema))
    .query(() => backupService.listBackups()),

  getSettings: permissionProcedure("SAUVEGARDE_BDD:LECTURE")
    .output(backupSettingsSchema)
    .query(() => backupService.getBackupSettings()),

  updateSettings: permissionProcedure("SAUVEGARDE_BDD:MODIFICATION")
    .input(updateBackupSettingsInputSchema)
    .output(backupSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const settings = await backupService.updateBackupSettings(input);
      await logAction({
        userId: ctx.session.userId,
        action: "BACKUP_SETTINGS_UPDATE",
        module: "SAUVEGARDE_BDD",
        result: "SUCCES",
        details: input,
        ipAddress: ctx.ipAddress,
      });
      return settings;
    }),

  triggerManual: permissionProcedure("SAUVEGARDE_BDD:CREATION")
    .output(databaseBackupSchema)
    .mutation(({ ctx }) => backupService.triggerManualBackup(ctx.session.userId)),

  /** Restauration réservée au Super Administrateur — double confirmation (voir MODULE-11 §1.1). */
  restore: permissionProcedure("SAUVEGARDE_BDD:ADMINISTRATION")
    .input(restoreBackupInputSchema)
    .mutation(async ({ input, ctx }) => {
      await backupService.restoreBackup(input.id, input.confirmationPhrase, ctx.session.userId);
      return { success: true };
    }),
});
