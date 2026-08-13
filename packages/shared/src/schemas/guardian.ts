import { z } from "zod";

export const guardianRelationshipSchema = z.enum([
  "PERE",
  "MERE",
  "TUTEUR_LEGAL",
  "FRERE",
  "SOEUR",
  "ONCLE",
  "TANTE",
  "GRAND_PARENT",
  "AUTRE",
]);
export type GuardianRelationship = z.infer<typeof guardianRelationshipSchema>;

export const guardianSchema = z.object({
  id: z.string().uuid(),
  lastName: z.string(),
  firstName: z.string(),
  profession: z.string().nullable(),
  employer: z.string().nullable(),
  phonePrimary: z.string().nullable(),
  phoneSecondary: z.string().nullable(),
  whatsapp: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
});
export type GuardianDto = z.infer<typeof guardianSchema>;

export const createGuardianInputSchema = z.object({
  lastName: z.string().min(1),
  firstName: z.string().min(1),
  profession: z.string().nullish(),
  employer: z.string().nullish(),
  phonePrimary: z.string().nullish(),
  phoneSecondary: z.string().nullish(),
  whatsapp: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  address: z.string().nullish(),
});
export type CreateGuardianInput = z.infer<typeof createGuardianInputSchema>;

export const updateGuardianInputSchema = createGuardianInputSchema
  .partial()
  .extend({ id: z.string().uuid() });
export type UpdateGuardianInput = z.infer<typeof updateGuardianInputSchema>;

export const guardianSearchInputSchema = z.object({ search: z.string().trim().min(1) });
export const listStudentGuardiansInputSchema = z.object({ studentId: z.string().uuid() });

/** Lien étudiant ↔ responsable, avec le responsable inclus pour affichage direct. */
export const studentGuardianSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  guardianId: z.string().uuid(),
  relationship: guardianRelationshipSchema,
  relationshipOther: z.string().nullable(),
  isPrimaryContact: z.boolean(),
  guardian: guardianSchema,
});
export type StudentGuardianDto = z.infer<typeof studentGuardianSchema>;

export const linkGuardianInputSchema = z
  .object({
    studentId: z.string().uuid(),
    // Soit un responsable existant (fratrie), soit création à la volée.
    guardianId: z.string().uuid().optional(),
    newGuardian: createGuardianInputSchema.optional(),
    relationship: guardianRelationshipSchema,
    relationshipOther: z.string().nullish(),
    isPrimaryContact: z.boolean().default(false),
  })
  .refine((v) => Boolean(v.guardianId) !== Boolean(v.newGuardian), {
    message: "Précisez soit un responsable existant, soit les informations d'un nouveau responsable.",
  });
export type LinkGuardianInput = z.infer<typeof linkGuardianInputSchema>;

export const studentGuardianIdInputSchema = z.object({ id: z.string().uuid() });

export const setPrimaryContactInputSchema = z.object({
  studentId: z.string().uuid(),
  studentGuardianId: z.string().uuid(),
});
export type SetPrimaryContactInput = z.infer<typeof setPrimaryContactInputSchema>;
