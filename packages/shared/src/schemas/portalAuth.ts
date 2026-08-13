import { z } from "zod";
import { passwordSchema } from "./password.js";

/**
 * Voir MODULE-15 §2-3 — portail web, identités de connexion externes (étudiant/tuteur/enseignant),
 * indépendantes de `User` (personnel). Portée toujours limitée à ses propres données, jamais un rôle
 * RBAC — vérifié à chaque requête, pas via une table de permissions.
 */
export const portalPrincipalTypeSchema = z.enum(["STUDENT", "GUARDIAN", "TEACHER"]);
export type PortalPrincipalType = z.infer<typeof portalPrincipalTypeSchema>;

export const portalLoginInputSchema = z.object({
  username: z.string().min(1, "Identifiant requis"),
  password: z.string().min(1, "Mot de passe requis"),
});
export type PortalLoginInput = z.infer<typeof portalLoginInputSchema>;

export const portalLoginOutputSchema = z.object({
  sessionToken: z.string(),
  principalType: portalPrincipalTypeSchema,
  displayName: z.string(),
  mustChangePassword: z.boolean(),
});
export type PortalLoginOutput = z.infer<typeof portalLoginOutputSchema>;

export const portalChangePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: passwordSchema,
});
export type PortalChangePasswordInput = z.infer<typeof portalChangePasswordInputSchema>;

export const portalSessionInfoSchema = z.object({
  principalType: portalPrincipalTypeSchema,
  displayName: z.string(),
  mustChangePassword: z.boolean(),
});
export type PortalSessionInfo = z.infer<typeof portalSessionInfoSchema>;

/** Canal de remise du mot de passe temporaire (MODULE-15 §2.2) — mêmes contraintes que le partage de
 * document numérique (MODULE-13 §5) : e-mail envoyé directement, WhatsApp reste un lien "cliquer pour
 * envoyer" (aucune API officielle disponible, voir `whatsAppLink.ts`). */
export const portalCredentialDeliveryChannelSchema = z.enum(["EMAIL", "WHATSAPP"]);
export type PortalCredentialDeliveryChannel = z.infer<typeof portalCredentialDeliveryChannelSchema>;

/**
 * Création d'un compte portail par le personnel (MODULE-15 §2.2) — un seul des trois destinataires
 * renseigné, même convention que `Loan`/`DigitalDocumentShare`. Le mot de passe temporaire généré est
 * transmis via les canaux du Module 12 (e-mail/WhatsApp), pas retourné en clair au client web.
 */
export const createPortalCredentialInputSchema = z
  .object({
    studentId: z.string().uuid().nullish(),
    guardianId: z.string().uuid().nullish(),
    teacherId: z.string().uuid().nullish(),
    channel: portalCredentialDeliveryChannelSchema,
  })
  .refine(
    (input) => [input.studentId, input.guardianId, input.teacherId].filter(Boolean).length === 1,
    {
      message: "Un seul destinataire (étudiant, tuteur ou enseignant) à la fois.",
      path: ["studentId"],
    }
  );
export type CreatePortalCredentialInput = z.infer<typeof createPortalCredentialInputSchema>;

export const portalCredentialSchema = z.object({
  id: z.string().uuid(),
  principalType: portalPrincipalTypeSchema,
  displayName: z.string(),
  username: z.string(),
  isActive: z.boolean(),
  mustChangePassword: z.boolean(),
  createdAt: z.date(),
});
export type PortalCredentialDto = z.infer<typeof portalCredentialSchema>;

export const createPortalCredentialOutputSchema = z.object({
  credential: portalCredentialSchema,
  whatsappLink: z.string().nullable(),
});
export type CreatePortalCredentialOutput = z.infer<typeof createPortalCredentialOutputSchema>;

export const setPortalCredentialActiveInputSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
});
export type SetPortalCredentialActiveInput = z.infer<typeof setPortalCredentialActiveInputSchema>;
