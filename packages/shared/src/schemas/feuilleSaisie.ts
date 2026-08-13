import { z } from "zod";

/** Feuille de saisie imprimable — aucune donnée stockée (voir MODULE-06 §1.10). */
export const feuilleSaisieLigneSchema = z.object({
  studentId: z.string().uuid(),
  matricule: z.string(),
  lastName: z.string(),
  firstName: z.string(),
});
export type FeuilleSaisieLigneDto = z.infer<typeof feuilleSaisieLigneSchema>;

export const feuilleSaisieSchema = z.object({
  subjectName: z.string(),
  classLabel: z.string(),
  filiereLabel: z.string().nullable(),
  levelLabel: z.string(),
  academicYearLabel: z.string(),
  academicPeriodLabel: z.string(),
  coefficient: z.number(),
  teacherName: z.string().nullable(),
  teacherPhone: z.string().nullable(),
  students: z.array(feuilleSaisieLigneSchema),
});
export type FeuilleSaisieDto = z.infer<typeof feuilleSaisieSchema>;

export const getFeuilleSaisieInputSchema = z.object({
  subjectOfferingId: z.string().uuid(),
  classId: z.string().uuid(),
});
export type GetFeuilleSaisieInput = z.infer<typeof getFeuilleSaisieInputSchema>;
