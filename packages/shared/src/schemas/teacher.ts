import { z } from "zod";
import { genderSchema } from "./student.js";

export const teacherSchema = z.object({
  id: z.string().uuid(),
  matricule: z.string(),
  lastName: z.string(),
  firstName: z.string(),
  gender: genderSchema,
  birthDate: z.coerce.date().nullable(),
  birthPlace: z.string().nullable(),
  nationality: z.string().nullable(),
  /** Pièce d'identité (2026-08-06) — pour les contrats de travail (Module Personnel). */
  idNumber: z.string().nullable(),
  photoPath: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  phonePrimary: z.string().nullable(),
  phoneSecondary: z.string().nullable(),
  whatsapp: z.string().nullable(),
  email: z.string().nullable(),
  highestDegree: z.string().nullable(),
  academicGrade: z.string().nullable(),
  specialty: z.string().nullable(),
  function: z.string().nullable(),
  hireDate: z.coerce.date().nullable(),
  contractTypeId: z.string().uuid().nullable(),
  contractTypeLabel: z.string().nullable(),
  statusId: z.string().uuid().nullable(),
  statusLabel: z.string().nullable(),
  weeklyHoursCapacity: z.number().nullable(),
  archivedAt: z.coerce.date().nullable(),
  archivedReason: z.string().nullable(),
  archivedBy: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  /** Pont Enseignant → Paie (extension du 2026-07-30) — non nul si un Employee est déjà lié à cet enseignant. */
  payrollEmployeeId: z.string().uuid().nullable(),
});
export type TeacherDto = z.infer<typeof teacherSchema>;

/** Ligne du tableau paginé — recherche transverse MODULE-05 §1.8/§10.8. */
export const teacherListRowSchema = z.object({
  id: z.string().uuid(),
  matricule: z.string(),
  lastName: z.string(),
  firstName: z.string(),
  gender: genderSchema,
  phonePrimary: z.string().nullable(),
  email: z.string().nullable(),
  specialty: z.string().nullable(),
  statusLabel: z.string().nullable(),
  isArchived: z.boolean(),
});
export type TeacherListRow = z.infer<typeof teacherListRowSchema>;

export const teacherListSortFieldSchema = z.enum(["lastName", "firstName", "matricule"]);

export const teacherListFilterInputSchema = z.object({
  search: z.string().trim().optional(),
  statusId: z.string().uuid().optional(),
  specialty: z.string().optional(),
  subjectId: z.string().uuid().optional(),
  filiereId: z.string().uuid().optional(),
  levelId: z.string().uuid().optional(),
  includeArchived: z.boolean().default(false),
  sortBy: teacherListSortFieldSchema.default("lastName"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(10).max(200).default(50),
});
export type TeacherListFilterInput = z.infer<typeof teacherListFilterInputSchema>;

export const teacherListPageSchema = z.object({
  rows: z.array(teacherListRowSchema),
  total: z.number().int(),
});
export type TeacherListPage = z.infer<typeof teacherListPageSchema>;

export const createTeacherInputSchema = z.object({
  lastName: z.string().min(1),
  firstName: z.string().min(1),
  gender: genderSchema,
  birthDate: z.coerce.date().nullish(),
  birthPlace: z.string().nullish(),
  nationality: z.string().nullish(),
  idNumber: z.string().nullish(),
  photoPath: z.string().nullish(),
  address: z.string().nullish(),
  city: z.string().nullish(),
  phonePrimary: z.string().nullish(),
  phoneSecondary: z.string().nullish(),
  whatsapp: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  highestDegree: z.string().nullish(),
  academicGrade: z.string().nullish(),
  specialty: z.string().nullish(),
  function: z.string().nullish(),
  hireDate: z.coerce.date().nullish(),
  contractTypeId: z.string().uuid().nullish(),
  statusId: z.string().uuid().nullish(),
  weeklyHoursCapacity: z.number().positive().nullish(),
});
export type CreateTeacherInput = z.infer<typeof createTeacherInputSchema>;

export const updateTeacherInputSchema = createTeacherInputSchema
  .partial()
  .extend({ id: z.string().uuid() });
export type UpdateTeacherInput = z.infer<typeof updateTeacherInputSchema>;

export const teacherIdInputSchema = z.object({ id: z.string().uuid() });

export const archiveTeacherInputSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1),
});
export type ArchiveTeacherInput = z.infer<typeof archiveTeacherInputSchema>;
