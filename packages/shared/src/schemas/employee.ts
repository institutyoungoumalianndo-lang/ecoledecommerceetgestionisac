import { z } from "zod";
import { genderSchema } from "./student.js";

export const salaryModeSchema = z.enum(["FIXE", "HORAIRE"]);
export type SalaryMode = z.infer<typeof salaryModeSchema>;

/**
 * Sujet de paie unique (MODULE-08 §1.1) — personnel administratif pur (teacherId null) ET enseignants
 * payés (teacherId renseigné). Les champs d'identité renvoyés ici sont toujours les valeurs
 * effectivement affichables : lues depuis `teachers` quand isLinkedToTeacher est vrai, jamais dupliquées.
 */
export const employeeSchema = z.object({
  id: z.string().uuid(),
  matricule: z.string(),
  categoryId: z.string().uuid(),
  categoryLabel: z.string(),
  department: z.string().nullable(),
  contractTypeId: z.string().uuid().nullable(),
  contractTypeLabel: z.string().nullable(),
  teacherId: z.string().uuid().nullable(),
  isLinkedToTeacher: z.boolean(),
  lastName: z.string().nullable(),
  firstName: z.string().nullable(),
  gender: genderSchema.nullable(),
  phonePrimary: z.string().nullable(),
  phoneSecondary: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  photoPath: z.string().nullable(),
  /** Identité civile (2026-08-06) — pour les contrats de travail (Module Personnel). */
  birthDate: z.coerce.date().nullable(),
  birthPlace: z.string().nullable(),
  nationality: z.string().nullable(),
  idNumber: z.string().nullable(),
  hireDate: z.coerce.date().nullable(),
  salaryMode: salaryModeSchema,
  fixedMonthlySalary: z.number().nullable(),
  hourlyRate: z.number().nullable(),
  teachingHoursPaid: z.boolean(),
  archivedAt: z.coerce.date().nullable(),
  archivedReason: z.string().nullable(),
  archivedBy: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type EmployeeDto = z.infer<typeof employeeSchema>;

export const employeeListRowSchema = z.object({
  id: z.string().uuid(),
  matricule: z.string(),
  lastName: z.string().nullable(),
  firstName: z.string().nullable(),
  categoryLabel: z.string(),
  isLinkedToTeacher: z.boolean(),
  salaryMode: salaryModeSchema,
  isArchived: z.boolean(),
});
export type EmployeeListRow = z.infer<typeof employeeListRowSchema>;

export const employeeListSortFieldSchema = z.enum(["lastName", "firstName", "matricule"]);

export const employeeListFilterInputSchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  includeArchived: z.boolean().default(false),
  sortBy: employeeListSortFieldSchema.default("lastName"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(10).max(200).default(50),
});
export type EmployeeListFilterInput = z.infer<typeof employeeListFilterInputSchema>;

export const employeeListPageSchema = z.object({
  rows: z.array(employeeListRowSchema),
  total: z.number().int(),
});
export type EmployeeListPage = z.infer<typeof employeeListPageSchema>;

const employeeBaseFieldsSchema = z.object({
  categoryId: z.string().min(1, "La catégorie est obligatoire.").uuid(),
  department: z.string().nullish(),
  contractTypeId: z.string().uuid().nullish(),
  teacherId: z.string().uuid().nullish(),
  lastName: z.string().nullish(),
  firstName: z.string().nullish(),
  gender: genderSchema.nullish(),
  phonePrimary: z.string().nullish(),
  phoneSecondary: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  address: z.string().nullish(),
  photoPath: z.string().nullish(),
  birthDate: z.coerce.date().nullish(),
  birthPlace: z.string().nullish(),
  nationality: z.string().nullish(),
  idNumber: z.string().nullish(),
  hireDate: z.coerce.date().nullish(),
  salaryMode: salaryModeSchema.default("FIXE"),
  fixedMonthlySalary: z.number().positive().nullish(),
  hourlyRate: z.number().positive().nullish(),
  teachingHoursPaid: z.boolean().default(false),
});

function refineEmployeeRules<T extends z.infer<typeof employeeBaseFieldsSchema>>(
  data: T,
  ctx: z.RefinementCtx
) {
  if (!data.teacherId) {
    if (!data.lastName || !data.firstName || !data.gender) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nom, prénom et sexe sont obligatoires pour un employé non lié à un enseignant.",
        path: ["lastName"],
      });
    }
    if (data.salaryMode === "HORAIRE") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le mode horaire n'est disponible que pour un employé lié à un enseignant.",
        path: ["salaryMode"],
      });
    }
  }
}

export const createEmployeeInputSchema = employeeBaseFieldsSchema.superRefine(refineEmployeeRules);
export type CreateEmployeeInput = z.infer<typeof createEmployeeInputSchema>;

export const updateEmployeeInputSchema = employeeBaseFieldsSchema
  .partial()
  .extend({ id: z.string().uuid() });
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeInputSchema>;

export const employeeIdInputSchema = z.object({ id: z.string().uuid() });

export const archiveEmployeeInputSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1),
});
export type ArchiveEmployeeInput = z.infer<typeof archiveEmployeeInputSchema>;

/**
 * Pont Enseignant → Paie (extension du 2026-07-30, retour du porteur du projet) : un enseignant
 * affecté à des matières n'est payable qu'une fois un Employee créé et lié (teacherId) — jusqu'ici
 * sans aucun écran pour repérer ceux à qui cette étape manque. Liste tous les enseignants ayant au
 * moins une affectation active sur l'année universitaire donnée, avec le statut de ce lien.
 */
export const teacherPayrollStatusSchema = z.object({
  teacherId: z.string().uuid(),
  matricule: z.string(),
  lastName: z.string(),
  firstName: z.string(),
  subjectCount: z.number().int(),
  employeeId: z.string().uuid().nullable(),
  hasPayrollProfile: z.boolean(),
});
export type TeacherPayrollStatusDto = z.infer<typeof teacherPayrollStatusSchema>;

export const listTeachersPayrollStatusInputSchema = z.object({
  academicYearId: z.string().uuid().optional(),
});
export type ListTeachersPayrollStatusInput = z.infer<typeof listTeachersPayrollStatusInputSchema>;
