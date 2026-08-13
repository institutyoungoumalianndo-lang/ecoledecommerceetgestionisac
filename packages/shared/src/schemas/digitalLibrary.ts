import { z } from "zod";

/** Voir MODULE-13 §5-6 — bibliothèque numérique (PDF/Word), classification et partage e-mail/WhatsApp. */

export const digitalDocumentFormatSchema = z.enum(["PDF", "DOCX"]);
export type DigitalDocumentFormat = z.infer<typeof digitalDocumentFormatSchema>;

export const digitalDocumentShareChannelSchema = z.enum(["EMAIL", "WHATSAPP"]);
export type DigitalDocumentShareChannel = z.infer<typeof digitalDocumentShareChannelSchema>;

/** Référentiel de catégories de documents numériques — distinct de `BookCategory` (ouvrages physiques). */
export const digitalDocumentCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isActive: z.boolean(),
});
export type DigitalDocumentCategoryDto = z.infer<typeof digitalDocumentCategorySchema>;

export const createDigitalDocumentCategoryInputSchema = z.object({ name: z.string().min(1) });
export type CreateDigitalDocumentCategoryInput = z.infer<typeof createDigitalDocumentCategoryInputSchema>;

export const updateDigitalDocumentCategoryInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateDigitalDocumentCategoryInput = z.infer<typeof updateDigitalDocumentCategoryInputSchema>;

/** Fichier numérique (PDF/Word) — voir MODULE-13 §5.1. Jamais "emprunté" : reste disponible pour tout
 * le monde après consultation/partage. */
export const digitalDocumentSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  categoryId: z.string().uuid(),
  categoryName: z.string(),
  filePath: z.string(),
  fileFormat: digitalDocumentFormatSchema,
  fileSizeBytes: z.number().int(),
  description: z.string().nullable(),
  uploadedByName: z.string().nullable(),
  createdAt: z.date(),
});
export type DigitalDocumentDto = z.infer<typeof digitalDocumentSchema>;

/** Le fichier est d'abord envoyé via `POST /uploads/documents` (REST, hors tRPC — ADR-012) ; cette
 * mutation ne persiste que les métadonnées et le chemin déjà renvoyé par l'upload. */
export const createDigitalDocumentInputSchema = z.object({
  title: z.string().min(1),
  categoryId: z.string().uuid(),
  filePath: z.string().min(1),
  fileFormat: digitalDocumentFormatSchema,
  fileSizeBytes: z.number().int().nonnegative(),
  description: z.string().nullish(),
});
export type CreateDigitalDocumentInput = z.infer<typeof createDigitalDocumentInputSchema>;

export const digitalDocumentIdInputSchema = z.object({ id: z.string().uuid() });

export const listDigitalDocumentsInputSchema = z.object({
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
});
export type ListDigitalDocumentsInput = z.infer<typeof listDigitalDocumentsInputSchema>;

/** Historique de partage — voir MODULE-13 §5.2. Destinataire étudiant/enseignant/employé, un seul
 * renseigné à la fois (même convention que `Loan`). */
export const digitalDocumentShareSchema = z.object({
  id: z.string().uuid(),
  channel: digitalDocumentShareChannelSchema,
  recipientName: z.string().nullable(),
  sharedByName: z.string().nullable(),
  sharedAt: z.date(),
});
export type DigitalDocumentShareDto = z.infer<typeof digitalDocumentShareSchema>;

/**
 * Partage — voir MODULE-13 §5.2/§5.3. E-mail = pièce jointe réelle envoyée immédiatement. WhatsApp =
 * jamais de pièce jointe (pas d'API officielle) : la réponse renvoie un `whatsappLink` (wa.me,
 * message pré-rempli avec un lien de téléchargement) qu'un membre du personnel doit ouvrir et envoyer
 * lui-même — même contrainte que le canal WhatsApp du Module 12.
 */
export const shareDigitalDocumentInputSchema = z
  .object({
    documentId: z.string().uuid(),
    channel: digitalDocumentShareChannelSchema,
    recipientStudentId: z.string().uuid().nullish(),
    recipientTeacherId: z.string().uuid().nullish(),
    recipientEmployeeId: z.string().uuid().nullish(),
  })
  .refine(
    (input) => [input.recipientStudentId, input.recipientTeacherId, input.recipientEmployeeId].filter(Boolean).length === 1,
    {
      message: "Un destinataire (étudiant, enseignant ou employé) est requis — un seul à la fois.",
      path: ["recipientStudentId"],
    }
  );
export type ShareDigitalDocumentInput = z.infer<typeof shareDigitalDocumentInputSchema>;

export const shareDigitalDocumentOutputSchema = z.object({
  share: digitalDocumentShareSchema,
  whatsappLink: z.string().nullable(),
});
export type ShareDigitalDocumentOutput = z.infer<typeof shareDigitalDocumentOutputSchema>;
