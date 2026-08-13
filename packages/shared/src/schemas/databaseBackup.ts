import { z } from "zod";

/** Voir MODULE-11 §1.1/§2 — sauvegarde/restauration réelle de la base PostgreSQL. */
export const backupTriggerTypeSchema = z.enum(["PLANIFIEE", "MANUELLE"]);
export type BackupTriggerType = z.infer<typeof backupTriggerTypeSchema>;

export const backupStatusSchema = z.enum(["EN_COURS", "REUSSIE", "ECHOUEE"]);
export type BackupStatus = z.infer<typeof backupStatusSchema>;

export const databaseBackupSchema = z.object({
  id: z.string().uuid(),
  fileName: z.string(),
  fileSizeBytes: z.number().int(),
  triggerType: backupTriggerTypeSchema,
  status: backupStatusSchema,
  errorMessage: z.string().nullable(),
  createdByName: z.string().nullable(),
  createdAt: z.date(),
});
export type DatabaseBackupDto = z.infer<typeof databaseBackupSchema>;

export const backupSettingsSchema = z.object({
  isScheduleEnabled: z.boolean(),
  scheduleHour: z.number().int().min(0).max(23),
  retentionCount: z.number().int().min(1).max(365),
  storageDirectory: z.string().nullable(),
});
export type BackupSettingsDto = z.infer<typeof backupSettingsSchema>;

export const updateBackupSettingsInputSchema = backupSettingsSchema.partial();
export type UpdateBackupSettingsInput = z.infer<typeof updateBackupSettingsInputSchema>;

/**
 * Restauration — double confirmation (MODULE-11 §1.1, reprend explicitement la recommandation du
 * rapport d'analyse de l'ancien système) : `id` de la sauvegarde à restaurer + une phrase de
 * confirmation tapée par l'utilisateur, comparée exactement au texte imposé côté écran.
 */
export const restoreBackupInputSchema = z.object({
  id: z.string().uuid(),
  confirmationPhrase: z.string(),
});
export type RestoreBackupInput = z.infer<typeof restoreBackupInputSchema>;
