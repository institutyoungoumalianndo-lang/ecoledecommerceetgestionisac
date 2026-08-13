import { z } from "zod";

/** Absence d'un étudiant pour un jour donné (2026-08-03, retour du porteur du projet) — pas de
 * pointage quotidien : l'étudiant est présumé présent, seule une absence enregistrée explicitement
 * apparaît ici. Alimente la mention de régularité du bulletin. */
export const studentAbsenceSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  date: z.coerce.date(),
  motif: z.string(),
  justifiee: z.boolean(),
  createdByName: z.string(),
  createdAt: z.coerce.date(),
});
export type StudentAbsenceDto = z.infer<typeof studentAbsenceSchema>;

export const listStudentAbsencesInputSchema = z.object({ studentId: z.string().uuid() });
export type ListStudentAbsencesInput = z.infer<typeof listStudentAbsencesInputSchema>;

export const createStudentAbsenceInputSchema = z.object({
  studentId: z.string().uuid(),
  date: z.coerce.date(),
  motif: z.string().min(1, "Le motif est requis."),
  justifiee: z.boolean(),
});
export type CreateStudentAbsenceInput = z.infer<typeof createStudentAbsenceInputSchema>;

export const deleteStudentAbsenceInputSchema = z.object({ id: z.string().uuid() });
export type DeleteStudentAbsenceInput = z.infer<typeof deleteStudentAbsenceInputSchema>;
