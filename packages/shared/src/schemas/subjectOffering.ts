import { z } from "zod";

/** Affectation d'une matière à un contexte (année/semestre/niveau/filière optionnelle) — MODULE-02.1 §1.2/§2. */
export const subjectOfferingSchema = z.object({
  id: z.string().uuid(),
  subjectId: z.string().uuid(),
  subjectCode: z.string(),
  subjectName: z.string(),
  subjectCredits: z.number().nullable(),
  academicYearId: z.string().uuid(),
  academicYearLabel: z.string(),
  periodId: z.string().uuid(),
  periodLabel: z.string(),
  levelId: z.string().uuid(),
  levelLabel: z.string(),
  filiereId: z.string().uuid().nullable(),
  filiereName: z.string().nullable(),
  teachingUnitId: z.string().uuid().nullable(),
  teachingUnitName: z.string().nullable(),
  coefficient: z.number(),
  hoursCourse: z.number().int(),
  hoursTd: z.number().int(),
  hoursTp: z.number().int(),
  hoursPersonalWork: z.number().int(),
  totalHours: z.number().int(),
  isRequired: z.boolean(),
  isActive: z.boolean(),
});
export type SubjectOfferingDto = z.infer<typeof subjectOfferingSchema>;

export const createSubjectOfferingInputSchema = z.object({
  subjectId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  periodId: z.string().uuid(),
  levelId: z.string().uuid(),
  filiereId: z.string().uuid().nullish(),
  teachingUnitId: z.string().uuid().nullish(),
  coefficient: z.number().positive(),
  hoursCourse: z.number().int().min(0).default(0),
  hoursTd: z.number().int().min(0).default(0),
  hoursTp: z.number().int().min(0).default(0),
  hoursPersonalWork: z.number().int().min(0).default(0),
  isRequired: z.boolean().default(true),
});
export type CreateSubjectOfferingInput = z.infer<typeof createSubjectOfferingInputSchema>;

/** La portée (matière/année/semestre/niveau/filière) est immuable après création — même convention que FeeTariff (MODULE-04.2). */
export const updateSubjectOfferingInputSchema = z.object({
  id: z.string().uuid(),
  teachingUnitId: z.string().uuid().nullish(),
  coefficient: z.number().positive().optional(),
  hoursCourse: z.number().int().min(0).optional(),
  hoursTd: z.number().int().min(0).optional(),
  hoursTp: z.number().int().min(0).optional(),
  hoursPersonalWork: z.number().int().min(0).optional(),
  isRequired: z.boolean().optional(),
});
export type UpdateSubjectOfferingInput = z.infer<typeof updateSubjectOfferingInputSchema>;

export const subjectOfferingIdInputSchema = z.object({ id: z.string().uuid() });

export const listSubjectOfferingsInputSchema = z.object({
  academicYearId: z.string().uuid().optional(),
  periodId: z.string().uuid().optional(),
  levelId: z.string().uuid().optional(),
  filiereId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  includeInactive: z.boolean().default(false),
});
export type ListSubjectOfferingsInput = z.infer<typeof listSubjectOfferingsInputSchema>;
