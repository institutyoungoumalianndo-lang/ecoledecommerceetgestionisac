import { z } from "zod";

/**
 * Affectation pédagogique — table de liaison réutilisant SubjectOffering (Module 2.1),
 * jamais de duplication de matière/année/semestre/niveau/filière (voir MODULE-05 §1.2/§3 règle 1-2).
 * La charge horaire hebdomadaire de l'affectation (hoursPerWeek) est projetée depuis la
 * SubjectOffering liée, jamais stockée ici.
 */
export const teacherAssignmentSchema = z.object({
  id: z.string().uuid(),
  teacherId: z.string().uuid(),
  subjectOfferingId: z.string().uuid(),
  classId: z.string().uuid(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  subjectName: z.string(),
  className: z.string(),
  levelLabel: z.string(),
  filiereName: z.string().nullable(),
  periodLabel: z.string(),
  academicYearLabel: z.string(),
  coefficient: z.number(),
  hoursPerWeek: z.number(),
  /** Identifiants bruts de la subject_offering liée (2026-08-08) : nécessaires pour pré-remplir le
   * formulaire de réaffectation avec les valeurs actuelles, jamais affichés tels quels à l'écran. */
  academicYearId: z.string().uuid(),
  periodId: z.string().uuid(),
  levelId: z.string().uuid(),
  subjectId: z.string().uuid(),
});
export type TeacherAssignmentDto = z.infer<typeof teacherAssignmentSchema>;

export const createTeacherAssignmentInputSchema = z.object({
  teacherId: z.string().uuid(),
  subjectOfferingId: z.string().uuid(),
  classId: z.string().uuid(),
});
export type CreateTeacherAssignmentInput = z.infer<typeof createTeacherAssignmentInputSchema>;

export const teacherAssignmentIdInputSchema = z.object({ id: z.string().uuid() });

export const listTeacherAssignmentsInputSchema = z.object({
  teacherId: z.string().uuid(),
  includeInactive: z.boolean().default(false),
});
export type ListTeacherAssignmentsInput = z.infer<typeof listTeacherAssignmentsInputSchema>;

/** Charge horaire calculée à la demande — jamais stockée (voir MODULE-05 §1.3). */
export const teacherWorkloadSchema = z.object({
  weeklyHours: z.number(),
  monthlyHours: z.number(),
  semesterHours: z.number(),
  yearlyHours: z.number(),
  weeklyCapacity: z.number().nullable(),
  weeklyRemaining: z.number().nullable(),
});
export type TeacherWorkloadDto = z.infer<typeof teacherWorkloadSchema>;

export const getTeacherWorkloadInputSchema = z.object({
  teacherId: z.string().uuid(),
  academicYearId: z.string().uuid().optional(),
});
export type GetTeacherWorkloadInput = z.infer<typeof getTeacherWorkloadInputSchema>;

/**
 * Heures planifiées d'un enseignant sur un mois calendaire précis, calculées depuis ses affectations
 * actives (2026-08-08, retour du porteur du projet) — sert de suggestion pré-remplie mais toujours
 * modifiable sur la fiche d'émargement mensuelle, jamais une valeur imposée. Réutilise le même calcul
 * que celui employé jusqu'ici pour la paie (`computeMonthlyPlannedHours`), désormais uniquement ici.
 */
export const getTeacherPlannedHoursForMonthInputSchema = z.object({
  teacherId: z.string().uuid(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
});
export type GetTeacherPlannedHoursForMonthInput = z.infer<typeof getTeacherPlannedHoursForMonthInputSchema>;

export const teacherPlannedHoursForMonthSchema = z.object({
  plannedHours: z.number(),
});
export type TeacherPlannedHoursForMonth = z.infer<typeof teacherPlannedHoursForMonthSchema>;
