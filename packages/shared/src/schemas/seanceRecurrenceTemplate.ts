import { z } from "zod";
import { dayOfWeekSchema } from "./teacherAvailability";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Modèle de récurrence hebdomadaire — remplace TeacherWeeklySlot (Module 5.1), génère des Séance
 * concrètes et indépendantes (voir MODULE-05.2 §1.8.1). Ne contraint jamais une séance déjà générée.
 */
export const seanceRecurrenceTemplateSchema = z.object({
  id: z.string().uuid(),
  teacherId: z.string().uuid(),
  teacherName: z.string(),
  subjectOfferingId: z.string().uuid(),
  subjectName: z.string(),
  /** Semestre (module) de la subject_offering — un modèle de récurrence n'est valide que pour ce
   * semestre : les enseignements sont modulaires (2 semestres/an), un enseignant n'est pas
   * forcément reconduit d'un semestre à l'autre (retour du porteur du projet, 2026-07-30). */
  periodId: z.string().uuid(),
  periodLabel: z.string(),
  periodStartDate: z.coerce.date(),
  periodEndDate: z.coerce.date(),
  roomId: z.string().uuid().nullable(),
  roomLabel: z.string().nullable(),
  dayOfWeek: dayOfWeekSchema,
  startTime: z.string(),
  endTime: z.string(),
  pedagogicalGroupId: z.string().uuid().nullable(),
  pedagogicalGroupLabel: z.string().nullable(),
  isActive: z.boolean(),
  classIds: z.array(z.string().uuid()),
  classNames: z.array(z.string()),
});
export type SeanceRecurrenceTemplateDto = z.infer<typeof seanceRecurrenceTemplateSchema>;

export const createSeanceRecurrenceTemplateInputSchema = z
  .object({
    teacherId: z.string().uuid(),
    subjectOfferingId: z.string().uuid(),
    roomId: z.string().uuid().nullish(),
    dayOfWeek: dayOfWeekSchema,
    startTime: z.string().regex(timePattern, "Format attendu : HH:mm"),
    endTime: z.string().regex(timePattern, "Format attendu : HH:mm"),
    pedagogicalGroupId: z.string().uuid().nullish(),
    classIds: z.array(z.string().uuid()).min(1, "Au moins une classe est requise."),
  })
  .refine((v: { startTime: string; endTime: string }) => v.startTime < v.endTime, {
    message: "L'heure de fin doit être après l'heure de début.",
    path: ["endTime"],
  });
export type CreateSeanceRecurrenceTemplateInput = z.infer<typeof createSeanceRecurrenceTemplateInputSchema>;

export const updateSeanceRecurrenceTemplateInputSchema = z
  .object({
    id: z.string().uuid(),
    roomId: z.string().uuid().nullish(),
    dayOfWeek: dayOfWeekSchema,
    startTime: z.string().regex(timePattern, "Format attendu : HH:mm"),
    endTime: z.string().regex(timePattern, "Format attendu : HH:mm"),
    pedagogicalGroupId: z.string().uuid().nullish(),
    classIds: z.array(z.string().uuid()).min(1, "Au moins une classe est requise."),
    isActive: z.boolean(),
  })
  .refine((v: { startTime: string; endTime: string }) => v.startTime < v.endTime, {
    message: "L'heure de fin doit être après l'heure de début.",
    path: ["endTime"],
  });
export type UpdateSeanceRecurrenceTemplateInput = z.infer<typeof updateSeanceRecurrenceTemplateInputSchema>;

export const seanceRecurrenceTemplateIdInputSchema = z.object({ id: z.string().uuid() });

/**
 * Détection de conflits (enseignant/salle/classe) au niveau du modèle de récurrence hebdomadaire
 * (2026-08-06, retour du porteur du projet — construction de l'emploi du temps par filière/niveau/
 * module) — même principe que `seanceConflictSchema` (Module 5.2 §1.4) mais comparé aux autres
 * modèles actifs sur le même jour de semaine, pas à des séances datées.
 */
export const recurrenceConflictSchema = z.object({
  type: z.enum(["TEACHER", "ROOM", "CLASS"]),
  templateId: z.string().uuid(),
  label: z.string(),
  dayOfWeek: dayOfWeekSchema,
  startTime: z.string(),
  endTime: z.string(),
});
export type RecurrenceConflictDto = z.infer<typeof recurrenceConflictSchema>;

export const listSeanceRecurrenceTemplatesInputSchema = z.object({
  teacherId: z.string().uuid().optional(),
  activeOnly: z.boolean().optional(),
});
export type ListSeanceRecurrenceTemplatesInput = z.infer<typeof listSeanceRecurrenceTemplatesInputSchema>;

/** Génère des séances concrètes dans `seances` depuis ce modèle, sur une plage de dates (voir MODULE-05.2 §1.8.1). */
export const generateSeancesFromTemplateInputSchema = z
  .object({
    templateId: z.string().uuid(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: "La date de fin doit être après la date de début.",
    path: ["endDate"],
  });
export type GenerateSeancesFromTemplateInput = z.infer<typeof generateSeancesFromTemplateInputSchema>;
