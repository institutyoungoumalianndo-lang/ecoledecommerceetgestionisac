import { z } from "zod";

export const gatewayConnectionStatusSchema = z.enum(["CONNECTE", "DECONNECTE", "INCONNU"]);
export type GatewayConnectionStatus = z.infer<typeof gatewayConnectionStatusSchema>;

/**
 * Compte de passerelle SMS (voir MODULE-12 §1.12) — plusieurs comptes possibles ("principal et
 * secours"), un seul `isDefault` à la fois. `hasApiKey` remplace la clé elle-même : jamais renvoyée
 * au client une fois enregistrée (voir MODULE-12 §6.1/§1.12, recommandation de masquage).
 */
export const smsGatewayAccountSchema = z.object({
  id: z.string().uuid(),
  providerName: z.string(),
  label: z.string(),
  apiIdentifier: z.string().nullable(),
  hasApiKey: z.boolean(),
  senderId: z.string().nullable(),
  officialPhoneNumber: z.string().nullable(),
  balance: z.number().nullable(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  connectionStatus: gatewayConnectionStatusSchema,
  lastTestedAt: z.coerce.date().nullable(),
});
export type SmsGatewayAccountDto = z.infer<typeof smsGatewayAccountSchema>;

export const createSmsGatewayAccountInputSchema = z.object({
  providerName: z.string().min(1),
  label: z.string().min(1),
  apiIdentifier: z.string().nullish(),
  apiKey: z.string().nullish(),
  senderId: z.string().nullish(),
  officialPhoneNumber: z.string().nullish(),
  balance: z.number().nullish(),
});
export type CreateSmsGatewayAccountInput = z.infer<typeof createSmsGatewayAccountInputSchema>;

/** `apiKey` omis = ne change pas la clé déjà enregistrée ; chaîne vide = l'efface. */
export const updateSmsGatewayAccountInputSchema = z.object({
  id: z.string().uuid(),
  providerName: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  apiIdentifier: z.string().nullish(),
  apiKey: z.string().nullish(),
  senderId: z.string().nullish(),
  officialPhoneNumber: z.string().nullish(),
  balance: z.number().nullish(),
  isActive: z.boolean().optional(),
});
export type UpdateSmsGatewayAccountInput = z.infer<typeof updateSmsGatewayAccountInputSchema>;

export const smsGatewayAccountIdInputSchema = z.object({ id: z.string().uuid() });

/** WhatsApp Business — un seul compte officiel (voir MODULE-12 §1.12), singleton. Ne sert qu'à
 * générer des liens "cliquer pour envoyer" (wa.me) — jamais un envoi programmatique (§3 règle 7). */
export const whatsAppGatewaySettingsSchema = z.object({
  id: z.string().uuid(),
  businessPhoneNumber: z.string().nullable(),
  connectionStatus: gatewayConnectionStatusSchema,
  lastTestedAt: z.coerce.date().nullable(),
});
export type WhatsAppGatewaySettingsDto = z.infer<typeof whatsAppGatewaySettingsSchema>;

export const updateWhatsAppGatewaySettingsInputSchema = z.object({
  businessPhoneNumber: z.string().nullish(),
});
export type UpdateWhatsAppGatewaySettingsInput = z.infer<typeof updateWhatsAppGatewaySettingsInputSchema>;

export const emailGatewaySettingsSchema = z.object({
  id: z.string().uuid(),
  officialEmail: z.string().nullable(),
  smtpHost: z.string().nullable(),
  smtpPort: z.number().int().nullable(),
  smtpUsername: z.string().nullable(),
  hasSmtpPassword: z.boolean(),
  useTls: z.boolean(),
  connectionStatus: gatewayConnectionStatusSchema,
  lastTestedAt: z.coerce.date().nullable(),
});
export type EmailGatewaySettingsDto = z.infer<typeof emailGatewaySettingsSchema>;

export const updateEmailGatewaySettingsInputSchema = z.object({
  officialEmail: z.string().email().nullish(),
  smtpHost: z.string().nullish(),
  smtpPort: z.number().int().positive().nullish(),
  smtpUsername: z.string().nullish(),
  smtpPassword: z.string().nullish(),
  useTls: z.boolean().optional(),
});
export type UpdateEmailGatewaySettingsInput = z.infer<typeof updateEmailGatewaySettingsInputSchema>;

/** Réglages génériques du module — singleton (voir MODULE-12 §1.12). Logo/nom/coordonnées réutilisés
 * en lecture depuis EstablishmentSettings/CampusSettings (Module 2), jamais dupliqués ici. */
export const communicationSettingsSchema = z.object({
  id: z.string().uuid(),
  emailSignature: z.string().nullable(),
  messageFooter: z.string().nullable(),
});
export type CommunicationSettingsDto = z.infer<typeof communicationSettingsSchema>;

export const updateCommunicationSettingsInputSchema = z.object({
  emailSignature: z.string().nullish(),
  messageFooter: z.string().nullish(),
});
export type UpdateCommunicationSettingsInput = z.infer<typeof updateCommunicationSettingsInputSchema>;

export const testGatewayResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type TestGatewayResult = z.infer<typeof testGatewayResultSchema>;
