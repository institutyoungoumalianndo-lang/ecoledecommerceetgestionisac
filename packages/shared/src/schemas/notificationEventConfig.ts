import { z } from "zod";

/**
 * Type d'événement automatique (voir MODULE-12 §1.10). NOUVELLES_NOTES fusionné dans
 * BULLETIN_DISPONIBLE. ABSENCE/CERTIFICAT_DISPONIBLE/ATTESTATION_DISPONIBLE définis mais sans
 * déclencheur actif tant que leurs modules sources n'existent pas (voir MODULE-12 §6 point 5).
 */
export const notificationEventTypeSchema = z.enum([
  "INSCRIPTION_VALIDEE",
  "PAIEMENT_SCOLARITE",
  "BULLETIN_DISPONIBLE",
  "CHANGEMENT_EMPLOI_DU_TEMPS",
  "ABSENCE",
  "CERTIFICAT_DISPONIBLE",
  "ATTESTATION_DISPONIBLE",
  "SANCTION_ENREGISTREE",
  "AFFECTATION_ENSEIGNANT_CREEE",
]);
export type NotificationEventType = z.infer<typeof notificationEventTypeSchema>;

/** WhatsApp exclu : jamais un canal de notification automatique (voir MODULE-12 §3 règle 7). */
export const automaticCommunicationChannelSchema = z.enum(["SMS", "EMAIL"]);
export type AutomaticCommunicationChannel = z.infer<typeof automaticCommunicationChannelSchema>;

export const notificationEventConfigSchema = z.object({
  id: z.string().uuid(),
  eventType: notificationEventTypeSchema,
  templateId: z.string().uuid(),
  templateLabel: z.string(),
  channels: z.array(automaticCommunicationChannelSchema),
  isActive: z.boolean(),
});
export type NotificationEventConfigDto = z.infer<typeof notificationEventConfigSchema>;

export const updateNotificationEventConfigInputSchema = z.object({
  id: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  channels: z.array(automaticCommunicationChannelSchema).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateNotificationEventConfigInput = z.infer<typeof updateNotificationEventConfigInputSchema>;
