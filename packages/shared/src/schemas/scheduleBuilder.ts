import { z } from "zod";
import { seanceRecurrenceTemplateSchema } from "./seanceRecurrenceTemplate";
import { teacherAssignmentSchema } from "./teacherAssignment";

/**
 * Constructeur d'emploi du temps (2026-08-06, retour du porteur du projet) — pour une combinaison
 * Année universitaire × Filière (optionnelle, "commune" sinon) × Niveau × Module (= Période/Semestre,
 * voir seanceRecurrenceTemplateSchema), regroupe les affectations enregistrées (Module 5) avec le
 * créneau hebdomadaire déjà posé le cas échéant (Module 5.2), pour permettre de compléter les
 * créneaux manquants puis de générer la grille imprimable (EMPLOI_DU_TEMPS).
 */
export const scheduleBuilderFilterInputSchema = z.object({
  academicYearId: z.string().uuid(),
  filiereId: z.string().uuid().nullish(),
  levelId: z.string().uuid(),
  periodId: z.string().uuid(),
});
export type ScheduleBuilderFilterInput = z.infer<typeof scheduleBuilderFilterInputSchema>;

export const scheduleBuilderAssignmentSchema = teacherAssignmentSchema.extend({
  template: seanceRecurrenceTemplateSchema.nullable(),
});
export type ScheduleBuilderAssignmentDto = z.infer<typeof scheduleBuilderAssignmentSchema>;
