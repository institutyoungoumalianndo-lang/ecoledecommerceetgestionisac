import { z } from "zod";

export const communicationRecipientTypeSchema = z.enum(["ETUDIANT", "PARENT", "ENSEIGNANT", "PERSONNEL", "AUTRE"]);
export type CommunicationRecipientType = z.infer<typeof communicationRecipientTypeSchema>;

/**
 * Carnet d'adresses transverse (voir MODULE-12 §1.3) — jamais une table de contacts : lecture à la
 * demande sur Student/Guardian/Teacher/Employee. `id` est composite ("type:entityId"), pas l'UUID
 * d'une table dédiée.
 */
export const communicationContactSchema = z.object({
  id: z.string(),
  type: communicationRecipientTypeSchema,
  lastName: z.string(),
  firstName: z.string(),
  phonePrimary: z.string().nullable(),
  phoneSecondary: z.string().nullable(),
  whatsapp: z.string().nullable(),
  email: z.string().nullable(),
  campus: z.string().nullable(),
  className: z.string().nullable(),
  filiereName: z.string().nullable(),
  fonction: z.string().nullable(),
  statut: z.string(),
});
export type CommunicationContactDto = z.infer<typeof communicationContactSchema>;

export const listCommunicationContactsInputSchema = z.object({
  search: z.string().optional(),
  type: communicationRecipientTypeSchema.optional(),
  classId: z.string().uuid().optional(),
  filiereId: z.string().uuid().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(500).default(50),
});
export type ListCommunicationContactsInput = z.infer<typeof listCommunicationContactsInputSchema>;

export const communicationContactPageSchema = z.object({
  rows: z.array(communicationContactSchema),
  total: z.number().int(),
});
export type CommunicationContactPage = z.infer<typeof communicationContactPageSchema>;
