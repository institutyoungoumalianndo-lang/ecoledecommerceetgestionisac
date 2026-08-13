import { z } from "zod";

/** Statut 2FA de l'utilisateur connecté (Module 11 §1.2). */
export const twoFactorStatusSchema = z.object({
  isEnabled: z.boolean(),
});
export type TwoFactorStatusDto = z.infer<typeof twoFactorStatusSchema>;

/**
 * Démarrage de l'activation — génère un secret TOTP non encore actif (`totpEnabled` reste `false`
 * tant que `confirmTwoFactorSetup` n'a pas vérifié un premier code, pour éviter qu'un utilisateur se
 * verrouille lui-même en scannant mal le QR code).
 */
export const twoFactorSetupSchema = z.object({
  secret: z.string(),
  otpauthUrl: z.string(),
  /** Image PNG encodée en data URL, générée côté serveur (réutilise `qrcode`, déjà une dépendance du
   * moteur de documents) — évite d'ajouter une dépendance de rendu QR côté client. */
  qrCodeDataUrl: z.string(),
});
export type TwoFactorSetupDto = z.infer<typeof twoFactorSetupSchema>;

export const confirmTwoFactorSetupInputSchema = z.object({
  code: z.string().min(6).max(6),
});
export type ConfirmTwoFactorSetupInput = z.infer<typeof confirmTwoFactorSetupInputSchema>;

/** Codes de récupération à usage unique — affichés une seule fois à la génération, jamais relisibles ensuite. */
export const twoFactorBackupCodesSchema = z.object({
  codes: z.array(z.string()),
});
export type TwoFactorBackupCodesDto = z.infer<typeof twoFactorBackupCodesSchema>;

export const disableTwoFactorInputSchema = z.object({
  password: z.string().min(1, "Mot de passe requis"),
});
export type DisableTwoFactorInput = z.infer<typeof disableTwoFactorInputSchema>;
