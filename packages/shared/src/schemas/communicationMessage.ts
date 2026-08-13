import { z } from "zod";
import { communicationChannelSchema } from "./campaign.js";
import { communicationRecipientTypeSchema } from "./communicationContact.js";

export const communicationMessageStatusSchema = z.enum(["EN_ATTENTE", "ENVOYE", "LIVRE", "LU", "ECHOUE"]);
export type CommunicationMessageStatus = z.infer<typeof communicationMessageStatusSchema>;

/** Historique — un enregistrement par envoi individuel réel (voir MODULE-12 §1.13). Destinataire et
 * contenu dénormalisés au moment de l'envoi, jamais recalculés après coup (règle §3 point 6). */
export const communicationMessageSchema = z.object({
  id: z.string().uuid(),
  channel: communicationChannelSchema,
  recipientType: communicationRecipientTypeSchema,
  recipientId: z.string().nullable(),
  recipientName: z.string(),
  recipientPhone: z.string().nullable(),
  recipientEmail: z.string().nullable(),
  content: z.string(),
  campaignId: z.string().uuid().nullable(),
  campaignName: z.string().nullable(),
  status: communicationMessageStatusSchema,
  errorMessage: z.string().nullable(),
  sentByName: z.string().nullable(),
  scheduledFor: z.coerce.date().nullable(),
  sentAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  whatsappLink: z.string().nullable(),
});
export type CommunicationMessageDto = z.infer<typeof communicationMessageSchema>;

export const listCommunicationMessagesInputSchema = z.object({
  channel: communicationChannelSchema.optional(),
  status: communicationMessageStatusSchema.optional(),
  campaignId: z.string().uuid().optional(),
  // Filtre par destinataire précis (ex. l'onglet Communications de la fiche étudiant) — recoupé avec
  // `recipientType` pour éviter une collision d'identifiant entre types de destinataires différents
  // (2026-08-03, retour du porteur du projet).
  recipientType: communicationRecipientTypeSchema.optional(),
  recipientId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type ListCommunicationMessagesInput = z.infer<typeof listCommunicationMessagesInputSchema>;

/** Envoi individuel/groupé rapide (voir MODULE-12 §1.4/§1.5) — résolu immédiatement, hors campagne. */
export const sendQuickMessageInputSchema = z
  .object({
    channel: communicationChannelSchema,
    templateId: z.string().uuid().nullish(),
    customContent: z.string().nullish(),
    recipientIds: z.array(z.string()).min(1, "Au moins un destinataire est requis."),
  })
  .refine((v) => Boolean(v.templateId) || Boolean(v.customContent), {
    message: "Un modèle ou un contenu personnalisé est requis.",
    path: ["customContent"],
  });
export type SendQuickMessageInput = z.infer<typeof sendQuickMessageInputSchema>;

export const sendQuickMessageResultSchema = z.object({
  sent: z.number().int(),
  failed: z.number().int(),
  messages: z.array(communicationMessageSchema),
});
export type SendQuickMessageResult = z.infer<typeof sendQuickMessageResultSchema>;

/** Confirmation manuelle après un clic "Ouvrir WhatsApp" (voir MODULE-12 §3 règle 7). */
export const markWhatsAppMessageSentInputSchema = z.object({ id: z.string().uuid() });
