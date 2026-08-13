import { z } from "zod";

export const securitySettingsSchema = z.object({
  maxFailedLoginAttempts: z.number().int().min(1).max(20),
  accountLockoutMinutes: z.number().int().min(1).max(1440),
  sessionInactivityTimeoutMin: z.number().int().min(1).max(480),
  passwordExpirationEnabled: z.boolean(),
  passwordExpirationDays: z.number().int().min(1).max(365).nullable(),
  /** Politique de mot de passe renforcée (Module 11, 2026-08-06) — remplace la règle fixe (8/1
   * majuscule/1 chiffre) par des seuils configurables, appliqués côté serveur à la création et au
   * changement de mot de passe. */
  passwordMinLength: z.number().int().min(6).max(64),
  passwordRequireUppercase: z.boolean(),
  passwordRequireNumber: z.boolean(),
  passwordRequireSymbol: z.boolean(),
});
export type SecuritySettingsDto = z.infer<typeof securitySettingsSchema>;

export const updateSecuritySettingsInputSchema = securitySettingsSchema.partial();
export type UpdateSecuritySettingsInput = z.infer<typeof updateSecuritySettingsInputSchema>;
