import { importSettingsInputSchema, settingsExportSchema } from "@isac-erp/shared";
import * as settingsBackupService from "../services/settingsBackupService.js";
import { logAction } from "../services/auditService.js";
import { createInternalNotification } from "../services/internalNotificationService.js";
import { permissionProcedure, router } from "../trpc.js";

export const settingsBackupRouter = router({
  export: permissionProcedure("PARAMETRES_SAUVEGARDE:LECTURE")
    .output(settingsExportSchema)
    .query(async ({ ctx }) => {
      const data = await settingsBackupService.exportSettings();
      await logAction({
        userId: ctx.session.userId,
        action: "SETTINGS_EXPORT",
        module: "PARAMETRES",
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return data;
    }),

  import: permissionProcedure("PARAMETRES_SAUVEGARDE:VALIDATION")
    .input(importSettingsInputSchema)
    .mutation(async ({ input, ctx }) => {
      await settingsBackupService.importSettings(input.data);
      await logAction({
        userId: ctx.session.userId,
        action: "SETTINGS_IMPORT",
        module: "PARAMETRES",
        result: "SUCCES",
        details: { importedExportDate: input.data.exportedAt },
        ipAddress: ctx.ipAddress,
      });
      // Centre de notifications (refonte UI/UX, phase finale, 2026-07-30) — confirmation interne
      // de restauration, seul événement de sauvegarde/restauration réellement notable (l'export
      // seul, en lecture, est trop fréquent pour justifier une notification).
      void createInternalNotification(
        ctx.session.userId,
        "Paramètres restaurés",
        `Une sauvegarde du ${new Date(input.data.exportedAt).toLocaleDateString("fr-FR")} a été importée avec succès.`,
        { type: "settings-backup", id: ctx.session.userId }
      );
      return { success: true };
    }),
});
