import { z } from "zod";

/**
 * Sessionnaires (2026-08-03, retour du porteur du projet) — étudiants n'ayant pas obtenu la
 * moyenne (10/20 fixe) dans une ou plusieurs matières, classés par niveau/filière/année
 * universitaire. La liste des étudiants en échec n'est jamais stockée (recalculée à la demande,
 * comme le classement par mérite) ; seule la planification (date/heure/salle) de chaque session de
 * rattrapage par matière est persistée.
 */
export const etudiantEnEchecSchema = z.object({
  studentId: z.string().uuid(),
  matricule: z.string(),
  studentName: z.string(),
  moyenne: z.number(),
});
export type EtudiantEnEchecDto = z.infer<typeof etudiantEnEchecSchema>;

export const rattrapageSessionSchema = z.object({
  id: z.string().uuid(),
  date: z.coerce.date(),
  startTime: z.string(),
  endTime: z.string().nullable(),
  roomId: z.string().uuid().nullable(),
  roomLabel: z.string().nullable(),
});
export type RattrapageSessionDto = z.infer<typeof rattrapageSessionSchema>;

export const echecMatiereSchema = z.object({
  subjectId: z.string().uuid(),
  subjectName: z.string(),
  etudiants: z.array(etudiantEnEchecSchema),
  session: rattrapageSessionSchema.nullable(),
});
export type EchecMatiereDto = z.infer<typeof echecMatiereSchema>;

export const getEchecsRattrapageInputSchema = z.object({
  filiereId: z.string().uuid(),
  levelId: z.string().uuid(),
  academicYearId: z.string().uuid(),
});
export type GetEchecsRattrapageInput = z.infer<typeof getEchecsRattrapageInputSchema>;

export const upsertRattrapageSessionInputSchema = z.object({
  filiereId: z.string().uuid(),
  levelId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  subjectId: z.string().uuid(),
  date: z.coerce.date(),
  startTime: z.string().min(1, "L'heure est requise."),
  endTime: z.string().nullable().optional(),
  roomId: z.string().uuid().nullable().optional(),
});
export type UpsertRattrapageSessionInput = z.infer<typeof upsertRattrapageSessionInputSchema>;

export const deleteRattrapageSessionInputSchema = z.object({ id: z.string().uuid() });
export type DeleteRattrapageSessionInput = z.infer<typeof deleteRattrapageSessionInputSchema>;
