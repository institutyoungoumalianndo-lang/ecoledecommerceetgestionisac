import { z } from "zod";

/** Gabarit de message — référentiel configurable, jamais codé en dur (voir MODULE-12 §1.8/§1.9). */
export const messageTemplateSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  label: z.string(),
  content: z.string(),
  isSystem: z.boolean(),
  isActive: z.boolean(),
});
export type MessageTemplateDto = z.infer<typeof messageTemplateSchema>;

export const createMessageTemplateInputSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  content: z.string().min(1),
});
export type CreateMessageTemplateInput = z.infer<typeof createMessageTemplateInputSchema>;

export const updateMessageTemplateInputSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateMessageTemplateInput = z.infer<typeof updateMessageTemplateInputSchema>;

export const messageTemplateIdInputSchema = z.object({ id: z.string().uuid() });

export const listMessageTemplatesInputSchema = z.object({ activeOnly: z.boolean().optional() });
export type ListMessageTemplatesInput = z.infer<typeof listMessageTemplatesInputSchema>;

/** Variables acceptées par le moteur de substitution (voir MODULE-12 §1.9). */
export const TEMPLATE_VARIABLES = [
  "Nom",
  "Prénom",
  "Classe",
  "Filière",
  "Campus",
  "Montant",
  "Date",
  "Heure",
  "NuméroReçu",
  "MontantTotal",
  "MontantPayé",
  "ResteÀPayer",
  "AnnéeUniversitaire",
  "ModePaiement",
  "SoldeMessage",
] as const;
