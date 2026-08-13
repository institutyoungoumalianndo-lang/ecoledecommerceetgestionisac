import { z } from "zod";

export const communicationChannelSchema = z.enum(["SMS", "WHATSAPP", "EMAIL", "INTERNE"]);
export type CommunicationChannelType = z.infer<typeof communicationChannelSchema>;

export const campaignAudienceTypeSchema = z.enum([
  "INDIVIDUEL",
  "CLASSE",
  "CLASSES",
  "FILIERE",
  "FILIERES",
  "CAMPUS",
  "TOUS_ETUDIANTS",
  "TOUS_ENSEIGNANTS",
  "TOUS_PARENTS",
  "TOUT_PERSONNEL",
]);
export type CampaignAudienceType = z.infer<typeof campaignAudienceTypeSchema>;

export const campaignScheduleTypeSchema = z.enum(["IMMEDIAT", "DIFFERE", "QUOTIDIEN", "HEBDOMADAIRE", "MENSUEL"]);
export type CampaignScheduleType = z.infer<typeof campaignScheduleTypeSchema>;

export const campaignStatusSchema = z.enum(["BROUILLON", "PLANIFIEE", "EN_COURS", "SUSPENDUE", "TERMINEE", "ANNULEE"]);
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;

/** Filtre d'audience — champs pertinents selon `audienceType` (voir MODULE-12 §1.6). Résolu en
 * liste de destinataires à chaque envoi, jamais figé à la création (règle §3 point 5). */
export const campaignAudienceFilterSchema = z.object({
  classIds: z.array(z.string().uuid()).optional(),
  filiereIds: z.array(z.string().uuid()).optional(),
  recipientIds: z.array(z.string()).optional(),
});
export type CampaignAudienceFilter = z.infer<typeof campaignAudienceFilterSchema>;

export const campaignSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  channel: communicationChannelSchema,
  templateId: z.string().uuid().nullable(),
  templateLabel: z.string().nullable(),
  customContent: z.string().nullable(),
  audienceType: campaignAudienceTypeSchema,
  audienceFilter: campaignAudienceFilterSchema.nullable(),
  status: campaignStatusSchema,
  scheduleType: campaignScheduleTypeSchema,
  scheduledFor: z.coerce.date().nullable(),
  recurrenceEndDate: z.coerce.date().nullable(),
  createdByName: z.string().nullable(),
  createdAt: z.coerce.date(),
  recipientCount: z.number().int(),
});
export type CampaignDto = z.infer<typeof campaignSchema>;

export const createCampaignInputSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().nullish(),
    channel: communicationChannelSchema,
    templateId: z.string().uuid().nullish(),
    customContent: z.string().nullish(),
    audienceType: campaignAudienceTypeSchema,
    audienceFilter: campaignAudienceFilterSchema.nullish(),
    scheduleType: campaignScheduleTypeSchema.default("IMMEDIAT"),
    scheduledFor: z.coerce.date().nullish(),
    recurrenceEndDate: z.coerce.date().nullish(),
  })
  .refine((v) => Boolean(v.templateId) || Boolean(v.customContent), {
    message: "Un modèle ou un contenu personnalisé est requis.",
    path: ["customContent"],
  });
export type CreateCampaignInput = z.infer<typeof createCampaignInputSchema>;

export const updateCampaignInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().nullish(),
  templateId: z.string().uuid().nullish(),
  customContent: z.string().nullish(),
  audienceType: campaignAudienceTypeSchema.optional(),
  audienceFilter: campaignAudienceFilterSchema.nullish(),
  scheduleType: campaignScheduleTypeSchema.optional(),
  scheduledFor: z.coerce.date().nullish(),
  recurrenceEndDate: z.coerce.date().nullish(),
});
export type UpdateCampaignInput = z.infer<typeof updateCampaignInputSchema>;

export const campaignIdInputSchema = z.object({ id: z.string().uuid() });

export const listCampaignsInputSchema = z.object({ status: campaignStatusSchema.optional() });
export type ListCampaignsInput = z.infer<typeof listCampaignsInputSchema>;
