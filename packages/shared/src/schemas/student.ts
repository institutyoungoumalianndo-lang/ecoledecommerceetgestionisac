import { z } from "zod";

export const genderSchema = z.enum(["M", "F"]);
export type Gender = z.infer<typeof genderSchema>;

export const maritalStatusSchema = z.enum(["CELIBATAIRE", "MARIE", "AUTRE"]);
export type MaritalStatus = z.infer<typeof maritalStatusSchema>;

/**
 * Type de programme (2026-08-03, retour du porteur du projet) — distinct de la filière : la
 * filière est le domaine d'étude, le programme est le type de diplôme préparé (indépendant l'un de
 * l'autre).
 */
export const programmeTypeSchema = z.enum(["DQP", "CAP", "BEP", "BT", "BTS"]);
export type ProgrammeType = z.infer<typeof programmeTypeSchema>;

export const studentSchema = z.object({
  id: z.string().uuid(),
  matricule: z.string(),
  ina: z.string().nullable(),
  programme: programmeTypeSchema.nullable(),
  lastName: z.string(),
  firstName: z.string(),
  gender: genderSchema,
  birthDate: z.coerce.date().nullable(),
  birthPlace: z.string().nullable(),
  nationality: z.string().nullable(),
  photoPath: z.string().nullable(),
  address: z.string().nullable(),
  neighborhood: z.string().nullable(),
  commune: z.string().nullable(),
  city: z.string().nullable(),
  prefecture: z.string().nullable(),
  country: z.string().nullable(),
  phonePrimary: z.string().nullable(),
  phoneSecondary: z.string().nullable(),
  email: z.string().nullable(),
  maritalStatus: maritalStatusSchema,
  archivedAt: z.coerce.date().nullable(),
  archivedReason: z.string().nullable(),
  archivedBy: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type StudentDto = z.infer<typeof studentSchema>;

/** Ligne du tableau paginé — projette l'inscription courante de l'étudiant. */
export const studentListRowSchema = z.object({
  id: z.string().uuid(),
  matricule: z.string(),
  ina: z.string().nullable(),
  lastName: z.string(),
  firstName: z.string(),
  gender: genderSchema,
  phonePrimary: z.string().nullable(),
  email: z.string().nullable(),
  isArchived: z.boolean(),
  currentClassId: z.string().uuid().nullable(),
  currentClassName: z.string().nullable(),
  currentFiliereName: z.string().nullable(),
  currentLevelLabel: z.string().nullable(),
  currentAcademicYearLabel: z.string().nullable(),
  /**
   * L'étudiant a-t-il une inscription (non annulée) pour l'année universitaire actuellement active ?
   * (2026-08-09, retour du porteur du projet : "un étudiant de l'année précédente n'est plus actif
   * tant qu'il ne s'est pas réinscrit pour l'année suivante"). Notion additive, distincte de
   * `isArchived` (qui reste "a quitté l'école définitivement", inchangé) — un étudiant peut être
   * "à réinscrire" (isReenrolledActiveYear: false) sans jamais être archivé, et reste payable dans
   * les deux cas (aucun contrôle `archivedAt`/réinscription côté paiements).
   */
  isReenrolledActiveYear: z.boolean(),
});
export type StudentListRow = z.infer<typeof studentListRowSchema>;

export const studentListSortFieldSchema = z.enum(["lastName", "firstName", "matricule"]);

export const studentListFilterInputSchema = z.object({
  search: z.string().trim().optional(),
  filiereId: z.string().uuid().optional(),
  levelId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  academicYearId: z.string().uuid().optional(),
  /** Réinscription (2026-08-09) : ne garder que les étudiants SANS inscription (non annulée) pour
   * cette année — sert à cibler la recherche du bouton "Réinscription" sur ceux qui en ont besoin. */
  needsReenrollmentForYearId: z.string().uuid().optional(),
  includeArchived: z.boolean().default(false),
  sortBy: studentListSortFieldSchema.default("lastName"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(10).max(200).default(50),
});
export type StudentListFilterInput = z.infer<typeof studentListFilterInputSchema>;

export const studentListPageSchema = z.object({
  rows: z.array(studentListRowSchema),
  total: z.number().int(),
});
export type StudentListPage = z.infer<typeof studentListPageSchema>;

export const createStudentInputSchema = z.object({
  ina: z.string().nullish(),
  programme: programmeTypeSchema.nullish().or(z.literal("")),
  lastName: z.string().min(1),
  firstName: z.string().min(1),
  gender: genderSchema,
  birthDate: z.coerce.date().nullish(),
  birthPlace: z.string().nullish(),
  nationality: z.string().nullish(),
  photoPath: z.string().nullish(),
  address: z.string().nullish(),
  neighborhood: z.string().nullish(),
  commune: z.string().nullish(),
  city: z.string().nullish(),
  prefecture: z.string().nullish(),
  country: z.string().nullish(),
  phonePrimary: z.string().nullish(),
  phoneSecondary: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  maritalStatus: maritalStatusSchema.default("CELIBATAIRE"),
  // Première inscription — créée dans la même transaction que l'étudiant.
  classId: z.string().uuid(),
  regimeId: z.string().uuid().nullish(),
  enrollmentDate: z.coerce.date().nullish(),
  duplicateWarningAcknowledged: z.boolean().optional(),
});
export type CreateStudentInput = z.infer<typeof createStudentInputSchema>;

export const updateStudentInputSchema = z.object({
  id: z.string().uuid(),
  ina: z.string().nullish(),
  programme: programmeTypeSchema.nullish().or(z.literal("")),
  lastName: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  gender: genderSchema.optional(),
  birthDate: z.coerce.date().nullish(),
  birthPlace: z.string().nullish(),
  nationality: z.string().nullish(),
  photoPath: z.string().nullish(),
  address: z.string().nullish(),
  neighborhood: z.string().nullish(),
  commune: z.string().nullish(),
  city: z.string().nullish(),
  prefecture: z.string().nullish(),
  country: z.string().nullish(),
  phonePrimary: z.string().nullish(),
  phoneSecondary: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  maritalStatus: maritalStatusSchema.optional(),
});
export type UpdateStudentInput = z.infer<typeof updateStudentInputSchema>;

export const studentIdInputSchema = z.object({ id: z.string().uuid() });

export const archiveStudentInputSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1),
});
export type ArchiveStudentInput = z.infer<typeof archiveStudentInputSchema>;

export const duplicateMatchReasonSchema = z.enum(["TELEPHONE", "EMAIL", "NOM_DATE_NAISSANCE"]);

export const checkStudentDuplicatesInputSchema = z.object({
  lastName: z.string().min(1),
  firstName: z.string().min(1),
  birthDate: z.coerce.date().nullish(),
  phonePrimary: z.string().nullish(),
  email: z.string().nullish(),
  excludeStudentId: z.string().uuid().nullish(),
});
export type CheckStudentDuplicatesInput = z.infer<typeof checkStudentDuplicatesInputSchema>;

export const studentDuplicateMatchSchema = z.object({
  id: z.string().uuid(),
  matricule: z.string(),
  lastName: z.string(),
  firstName: z.string(),
  matchedOn: z.array(duplicateMatchReasonSchema),
});
export type StudentDuplicateMatch = z.infer<typeof studentDuplicateMatchSchema>;

/**
 * Ligne du canevas national INA (2026-08-03, retour du porteur du projet) — export dédié, distinct
 * du tableau interne : colonnes fixées par un gabarit externe (INA/Nom/Prénom/Sexe/Date et lieu de
 * naissance/Nom du père/Nom de la mère/Institution/Programme/Filière/Région/E-mail). Programme
 * (DQP/CAP/BEP/BT/BTS) et Filière (domaine d'étude) sont deux notions distinctes (retour du porteur
 * du projet, 2026-08-03) — jamais confondues. Institution/Région/E-mail sont des valeurs par défaut
 * appliquées côté écran (établissement/"Kindia" fixe), pas des colonnes par étudiant.
 */
export const studentInaExportRowSchema = z.object({
  ina: z.string().nullable(),
  lastName: z.string(),
  firstName: z.string(),
  gender: genderSchema,
  birthDate: z.coerce.date().nullable(),
  birthPlace: z.string().nullable(),
  fatherName: z.string().nullable(),
  motherName: z.string().nullable(),
  programme: programmeTypeSchema.nullable(),
  filiereName: z.string().nullable(),
});
export type StudentInaExportRow = z.infer<typeof studentInaExportRowSchema>;
