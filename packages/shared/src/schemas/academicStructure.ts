import { z } from "zod";

export const academicYearSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean(),
  isClosed: z.boolean(),
  closedAt: z.coerce.date().nullable(),
  reopenedAt: z.coerce.date().nullable(),
});
export type AcademicYearDto = z.infer<typeof academicYearSchema>;

export const createAcademicYearInputSchema = z
  .object({
    label: z.string().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((v) => v.endDate > v.startDate, {
    message: "La date de fin doit être postérieure à la date de début",
    path: ["endDate"],
  });
export type CreateAcademicYearInput = z.infer<typeof createAcademicYearInputSchema>;

export const updateAcademicYearInputSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearInputSchema>;

export const academicYearIdInputSchema = z.object({ id: z.string().uuid() });

export const academicPeriodSchema = z.object({
  id: z.string().uuid(),
  academicYearId: z.string().uuid(),
  code: z.string(),
  label: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  orderIndex: z.number().int(),
});
export type AcademicPeriodDto = z.infer<typeof academicPeriodSchema>;

export const createAcademicPeriodInputSchema = z.object({
  academicYearId: z.string().uuid(),
  code: z.string().min(1),
  label: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  orderIndex: z.number().int().min(0),
});
export type CreateAcademicPeriodInput = z.infer<typeof createAcademicPeriodInputSchema>;

export const updateAcademicPeriodInputSchema = createAcademicPeriodInputSchema
  .partial()
  .extend({ id: z.string().uuid() });
export type UpdateAcademicPeriodInput = z.infer<typeof updateAcademicPeriodInputSchema>;

export const filiereSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  responsableUserId: z.string().uuid().nullable(),
  duration: z.string().nullable(),
  isActive: z.boolean(),
});
export type FiliereDto = z.infer<typeof filiereSchema>;

export const createFiliereInputSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullish(),
  responsableUserId: z.string().uuid().nullish(),
  duration: z.string().nullish(),
});
export type CreateFiliereInput = z.infer<typeof createFiliereInputSchema>;

export const updateFiliereInputSchema = createFiliereInputSchema
  .partial()
  .extend({ id: z.string().uuid() });
export type UpdateFiliereInput = z.infer<typeof updateFiliereInputSchema>;

export const filiereIdInputSchema = z.object({ id: z.string().uuid() });

export const levelSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  label: z.string(),
  orderIndex: z.number().int(),
  isActive: z.boolean(),
});
export type LevelDto = z.infer<typeof levelSchema>;

export const createLevelInputSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  orderIndex: z.number().int().min(0),
});
export type CreateLevelInput = z.infer<typeof createLevelInputSchema>;

export const updateLevelInputSchema = createLevelInputSchema
  .partial()
  .extend({ id: z.string().uuid() });
export type UpdateLevelInput = z.infer<typeof updateLevelInputSchema>;

export const levelIdInputSchema = z.object({ id: z.string().uuid() });

export const schoolClassSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  filiereId: z.string().uuid(),
  levelId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  maxCapacity: z.number().int().positive().nullable(),
  mainRoom: z.string().nullable(),
  isActive: z.boolean(),
});
export type SchoolClassDto = z.infer<typeof schoolClassSchema>;

export const createSchoolClassInputSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  filiereId: z.string().uuid(),
  levelId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  maxCapacity: z.number().int().positive().nullish(),
  mainRoom: z.string().nullish(),
});
export type CreateSchoolClassInput = z.infer<typeof createSchoolClassInputSchema>;

export const updateSchoolClassInputSchema = createSchoolClassInputSchema
  .partial()
  .extend({ id: z.string().uuid() });
export type UpdateSchoolClassInput = z.infer<typeof updateSchoolClassInputSchema>;

export const schoolClassIdInputSchema = z.object({ id: z.string().uuid() });
