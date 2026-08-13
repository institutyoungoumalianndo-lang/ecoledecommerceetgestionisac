import { z } from "zod";

/**
 * Statut de séance (voir MODULE-05.2 §1.9) — reprend littéralement le vocabulaire du chapitre.
 * PROGRAMMEE est la valeur par défaut explicite (remplace le `null` "pas encore qualifiée" du
 * Module 5.1). 🟣 PROGRAMMEE / 🟢 EFFECTUEE / 🟡 REPORTEE / 🔴 ANNULEE / 🔵 REMPLACEE.
 */
export const seanceStatusSchema = z.enum(["PROGRAMMEE", "EFFECTUEE", "REPORTEE", "ANNULEE", "REMPLACEE"]);
export type SeanceStatus = z.infer<typeof seanceStatusSchema>;

export const timesheetStatusSchema = z.enum(["OUVERTE", "CLOTUREE"]);
export type TimesheetStatus = z.infer<typeof timesheetStatusSchema>;

/**
 * Séance — entité centrale de l'emploi du temps (voir MODULE-05.2 §1.4/§1.8/§1.11). Supporte
 * nativement 1 à N classes : les heures/le montant ne sont jamais multipliés par le nombre de
 * classes (§1.11, règle non négociable) — classIds/classNames reflète la liste complète, une seule
 * durationHours pour toute la séance.
 */
export const seanceSchema = z.object({
  id: z.string().uuid(),
  timesheetId: z.string().uuid(),
  teacherId: z.string().uuid(),
  teacherName: z.string(),
  subjectOfferingId: z.string().uuid(),
  subjectName: z.string(),
  roomId: z.string().uuid().nullable(),
  roomLabel: z.string().nullable(),
  recurrenceTemplateId: z.string().uuid().nullable(),
  sessionDate: z.coerce.date(),
  startTime: z.string(),
  endTime: z.string(),
  status: seanceStatusSchema,
  reason: z.string().nullable(),
  rescheduledToSeanceId: z.string().uuid().nullable(),
  substituteTeacherId: z.string().uuid().nullable(),
  substituteTeacherName: z.string().nullable(),
  validatedAt: z.coerce.date().nullable(),
  validatedByName: z.string().nullable(),
  classIds: z.array(z.string().uuid()),
  classNames: z.array(z.string()),
  filiereName: z.string().nullable(),
  levelLabel: z.string().nullable(),
  durationHours: z.number(),
});
export type SeanceDto = z.infer<typeof seanceSchema>;

/** Création manuelle ou assistée d'une séance (voir MODULE-05.2 §1.3/§1.4). Contrôle de conflits côté service. */
export const createSeanceInputSchema = z
  .object({
    teacherId: z.string().uuid(),
    subjectOfferingId: z.string().uuid(),
    roomId: z.string().uuid().nullish(),
    sessionDate: z.coerce.date(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format attendu : HH:mm"),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format attendu : HH:mm"),
    classIds: z.array(z.string().uuid()).min(1, "Au moins une classe est requise."),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: "L'heure de fin doit être après l'heure de début.",
    path: ["endTime"],
  });
export type CreateSeanceInput = z.infer<typeof createSeanceInputSchema>;

export const updateSeanceInputSchema = z
  .object({
    id: z.string().uuid(),
    roomId: z.string().uuid().nullish(),
    sessionDate: z.coerce.date(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format attendu : HH:mm"),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format attendu : HH:mm"),
    classIds: z.array(z.string().uuid()).min(1, "Au moins une classe est requise."),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: "L'heure de fin doit être après l'heure de début.",
    path: ["endTime"],
  });
export type UpdateSeanceInput = z.infer<typeof updateSeanceInputSchema>;

/** Motif obligatoire pour tout statut différent de PROGRAMMEE/EFFECTUEE (voir MODULE-05.1 §3 règle 2). */
export const qualifySeanceInputSchema = z
  .object({
    id: z.string().uuid(),
    status: seanceStatusSchema,
    reason: z.string().trim().min(1).nullish(),
    rescheduledToSeanceId: z.string().uuid().nullish(),
    substituteTeacherId: z.string().uuid().nullish(),
  })
  .superRefine((v, ctx) => {
    if (v.status !== "PROGRAMMEE" && v.status !== "EFFECTUEE" && !v.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Un motif est obligatoire pour ce statut.",
        path: ["reason"],
      });
    }
    if (v.status === "REMPLACEE" && !v.substituteTeacherId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "L'enseignant remplaçant est obligatoire pour ce statut.",
        path: ["substituteTeacherId"],
      });
    }
  });
export type QualifySeanceInput = z.infer<typeof qualifySeanceInputSchema>;

/**
 * Qualification groupée (extension du 2026-07-30, retour du porteur du projet) : marque en une
 * fois plusieurs séances encore PROGRAMMEE comme EFFECTUEE — l'admin ne corrige ensuite que les
 * exceptions (absence, annulation, report) une par une via `qualify`. Ne touche jamais une séance
 * déjà qualifiée ni une fiche clôturée.
 */
export const qualifySeancesBulkInputSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});
export type QualifySeancesBulkInput = z.infer<typeof qualifySeancesBulkInputSchema>;

export const qualifySeancesBulkResultSchema = z.object({ qualifiedCount: z.number().int() });
export type QualifySeancesBulkResult = z.infer<typeof qualifySeancesBulkResultSchema>;

export const seanceIdInputSchema = z.object({ id: z.string().uuid() });

/** Vue filtrée — classe/enseignant/salle/filière/niveau/semestre, jamais une table séparée par vue (voir MODULE-05.2 §1.2). */
export const listSeancesInputSchema = z.object({
  teacherId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  filiereId: z.string().uuid().optional(),
  levelId: z.string().uuid().optional(),
  periodId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type ListSeancesInput = z.infer<typeof listSeancesInputSchema>;

/** Détection de conflits (enseignant/salle/classe) — contrôle bloquant avant validation (voir MODULE-05.2 §1.4). */
export const seanceConflictSchema = z.object({
  type: z.enum(["TEACHER", "ROOM", "CLASS"]),
  seanceId: z.string().uuid(),
  label: z.string(),
  sessionDate: z.coerce.date(),
  startTime: z.string(),
  endTime: z.string(),
});
export type SeanceConflictDto = z.infer<typeof seanceConflictSchema>;

export const checkSeanceConflictsInputSchema = z.object({
  excludeSeanceId: z.string().uuid().optional(),
  teacherId: z.string().uuid(),
  roomId: z.string().uuid().nullish(),
  classIds: z.array(z.string().uuid()).min(1),
  sessionDate: z.coerce.date(),
  startTime: z.string(),
  endTime: z.string(),
});
export type CheckSeanceConflictsInput = z.infer<typeof checkSeanceConflictsInputSchema>;

export const checkSeanceConflictsResultSchema = z.object({
  conflicts: z.array(seanceConflictSchema),
});
export type CheckSeanceConflictsResult = z.infer<typeof checkSeanceConflictsResultSchema>;

/** Fiche mensuelle de pointage — un enseignant × un mois (voir MODULE-05.1 §1.3/§1.11, conservée par le Module 5.2 §1.8). */
export const teacherMonthlyTimesheetSchema = z.object({
  id: z.string().uuid(),
  teacherId: z.string().uuid(),
  teacherName: z.string(),
  teacherMatricule: z.string(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  status: timesheetStatusSchema,
  closedAt: z.coerce.date().nullable(),
  closedByName: z.string().nullable(),
  sessionsPlanned: z.number().int(),
  sessionsDone: z.number().int(),
  sessionsPostponed: z.number().int(),
  sessionsNotDone: z.number().int(),
  hoursPlanned: z.number(),
  hoursDone: z.number(),
  sessions: z.array(seanceSchema),
});
export type TeacherMonthlyTimesheetDto = z.infer<typeof teacherMonthlyTimesheetSchema>;

/** Ouvre (ou récupère) la fiche mensuelle d'un enseignant — ne génère plus de séances (§1.8 : elles existent déjà). */
export const openMonthlyTimesheetInputSchema = z.object({
  teacherId: z.string().uuid(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
});
export type OpenMonthlyTimesheetInput = z.infer<typeof openMonthlyTimesheetInputSchema>;

export const getMonthlyTimesheetInputSchema = z.object({
  teacherId: z.string().uuid(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
});
export type GetMonthlyTimesheetInput = z.infer<typeof getMonthlyTimesheetInputSchema>;

/**
 * Grille de pointage cochable (extension du 2026-07-30, retour du porteur du projet) : depuis la
 * fiche enseignant, une grille simple — coché = heures exécutées (EFFECTUEE), décoché = pas encore
 * (retour à PROGRAMMEE) — enregistrée en une fois pour tout le mois. Ne touche jamais une séance
 * REPORTEE/ANNULEE/REMPLACEE (motif déjà saisi via la qualification détaillée) ni une fiche clôturée.
 */
export const saveMonthlyPointageInputSchema = z.object({
  teacherId: z.string().uuid(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  executedSeanceIds: z.array(z.string().uuid()),
});
export type SaveMonthlyPointageInput = z.infer<typeof saveMonthlyPointageInputSchema>;

export const closeMonthlyTimesheetInputSchema = z.object({ id: z.string().uuid() });
export type CloseMonthlyTimesheetInput = z.infer<typeof closeMonthlyTimesheetInputSchema>;

export const listMonthlyTimesheetsInputSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
});
export type ListMonthlyTimesheetsInput = z.infer<typeof listMonthlyTimesheetsInputSchema>;

/** Écran de contrôle avant génération de la paie (voir MODULE-05.1 §1.9, colonne "reportées" distinguée au Module 5.2 §1.14). */
export const payrollControlSummarySchema = z.object({
  teacherId: z.string().uuid(),
  employeeId: z.string().uuid().nullable(),
  teacherMatricule: z.string(),
  teacherName: z.string(),
  timesheetStatus: timesheetStatusSchema.nullable(),
  sessionsPlanned: z.number().int(),
  sessionsDone: z.number().int(),
  sessionsPostponed: z.number().int(),
  sessionsNotDone: z.number().int(),
  hoursPlanned: z.number(),
  hoursDone: z.number(),
  grossAmount: z.number().nullable(),
  observations: z.array(z.string()),
});
export type PayrollControlSummaryDto = z.infer<typeof payrollControlSummarySchema>;

export const getPayrollControlSummaryInputSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
});
export type GetPayrollControlSummaryInput = z.infer<typeof getPayrollControlSummaryInputSchema>;
