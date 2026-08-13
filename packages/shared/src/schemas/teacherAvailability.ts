import { z } from "zod";

export const dayOfWeekSchema = z.enum([
  "LUNDI",
  "MARDI",
  "MERCREDI",
  "JEUDI",
  "VENDREDI",
  "SAMEDI",
  "DIMANCHE",
]);
export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;

/** Créneau hebdomadaire récurrent (voir MODULE-05 §1.4) — heures au format "HH:mm". */
export const teacherWeeklyAvailabilitySchema = z.object({
  id: z.string().uuid(),
  teacherId: z.string().uuid(),
  dayOfWeek: dayOfWeekSchema,
  startTime: z.string(),
  endTime: z.string(),
});
export type TeacherWeeklyAvailabilityDto = z.infer<typeof teacherWeeklyAvailabilitySchema>;

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createTeacherWeeklyAvailabilityInputSchema = z.object({
  teacherId: z.string().uuid(),
  dayOfWeek: dayOfWeekSchema,
  startTime: z.string().regex(timePattern, "Format attendu : HH:mm"),
  endTime: z.string().regex(timePattern, "Format attendu : HH:mm"),
});
export type CreateTeacherWeeklyAvailabilityInput = z.infer<
  typeof createTeacherWeeklyAvailabilityInputSchema
>;

export const teacherWeeklyAvailabilityIdInputSchema = z.object({ id: z.string().uuid() });

/** Indisponibilité ponctuelle / congé — daté, non récurrent (voir MODULE-05 §1.4). */
export const teacherLeaveSchema = z.object({
  id: z.string().uuid(),
  teacherId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().nullable(),
});
export type TeacherLeaveDto = z.infer<typeof teacherLeaveSchema>;

export const createTeacherLeaveInputSchema = z.object({
  teacherId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().nullish(),
});
export type CreateTeacherLeaveInput = z.infer<typeof createTeacherLeaveInputSchema>;

export const teacherLeaveIdInputSchema = z.object({ id: z.string().uuid() });

export const listTeacherAvailabilityInputSchema = z.object({ teacherId: z.string().uuid() });
export type ListTeacherAvailabilityInput = z.infer<typeof listTeacherAvailabilityInputSchema>;
