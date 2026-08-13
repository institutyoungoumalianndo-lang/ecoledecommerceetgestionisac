import { z } from "zod";
import { passwordSchema } from "./password";
import { publicUserSchema } from "./user";

export const loginInputSchema = z.object({
  username: z.string().min(1, "Nom d'utilisateur requis"),
  password: z.string().min(1, "Mot de passe requis"),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const loginOutputSchema = z.object({
  sessionToken: z.string(),
  user: publicUserSchema,
  /** Codes de permission du rôle de l'utilisateur, pour adapter l'UI (l'application
   * serveur reste la seule source de vérité — voir MODULE-01 §3.3). Vide si
   * SUPER_ADMIN (qui possède tout implicitement, voir role.code côté client). */
  permissionCodes: z.array(z.string()),
});
export type LoginOutput = z.infer<typeof loginOutputSchema>;

/**
 * Résultat de connexion (Module 11 §1.2) — `TWO_FACTOR_REQUIRED` quand l'utilisateur a activé la
 * double authentification : identifiants déjà vérifiés (mot de passe correct), mais aucune session
 * n'est créée tant que le code TOTP n'est pas validé via `auth.verifyTwoFactor`. `pendingToken` est un
 * jeton temporaire (5 min) sans droits applicatifs, distinct d'un jeton de session.
 */
export const loginResultSchema = z.discriminatedUnion("status", [
  loginOutputSchema.extend({ status: z.literal("OK") }),
  z.object({ status: z.literal("TWO_FACTOR_REQUIRED"), pendingToken: z.string() }),
]);
export type LoginResult = z.infer<typeof loginResultSchema>;

export const verifyTwoFactorInputSchema = z.object({
  pendingToken: z.string().min(1),
  code: z.string().min(6, "Code à 6 chiffres ou code de récupération"),
});
export type VerifyTwoFactorInput = z.infer<typeof verifyTwoFactorInputSchema>;

/**
 * Ouverture directe du portail Super Administrateur depuis l'application desktop (2026-08-10, retour
 * du porteur du projet) — jeton à usage unique et très courte durée de vie, jamais un `PortalCredential`
 * (voir MODULE-15 §1 décision 1 : le portail Super Admin réutilise le compte `User` du personnel).
 */
export const createPortalSsoTokenOutputSchema = z.object({ token: z.string() });
export type CreatePortalSsoTokenOutput = z.infer<typeof createPortalSsoTokenOutputSchema>;

export const exchangePortalSsoTokenInputSchema = z.object({ token: z.string().min(1) });
export type ExchangePortalSsoTokenInput = z.infer<typeof exchangePortalSsoTokenInputSchema>;

export const bootstrapStatusSchema = z.object({
  hasAdmin: z.boolean(),
});
export type BootstrapStatus = z.infer<typeof bootstrapStatusSchema>;

export const createFirstAdminInputSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  username: z.string().min(3),
  password: passwordSchema,
});
export type CreateFirstAdminInput = z.infer<typeof createFirstAdminInputSchema>;
