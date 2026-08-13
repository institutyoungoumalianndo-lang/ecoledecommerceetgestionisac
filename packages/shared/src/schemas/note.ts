import { z } from "zod";

const noteValueSchema = z.number().min(0).max(20);

/**
 * Note — un étudiant × une affectation de matière (voir MODULE-06 §1.1). `subjectOffering` porte
 * déjà matière/année/semestre/niveau/filière/coefficient, jamais dupliqué ici.
 */
export const noteSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  subjectOfferingId: z.string().uuid(),
  noteOrale: z.number().nullable(),
  noteEcrite: z.number().nullable(),
  noteComposition: z.number().nullable(),
  noteFinale: z.number().nullable(),
  verrouillee: z.boolean(),
  saisieLe: z.coerce.date(),
  saisieParName: z.string().nullable(),
});
export type NoteDto = z.infer<typeof noteSchema>;

/** Une ligne du tableau de saisie : un étudiant, avec sa note existante éventuelle. */
export const ligneSaisieNoteSchema = z.object({
  studentId: z.string().uuid(),
  studentLastName: z.string(),
  studentFirstName: z.string(),
  noteId: z.string().uuid().nullable(),
  noteOrale: z.number().nullable(),
  noteEcrite: z.number().nullable(),
  noteComposition: z.number().nullable(),
  noteFinale: z.number().nullable(),
  coefficient: z.number(),
  verrouillee: z.boolean(),
});
export type LigneSaisieNoteDto = z.infer<typeof ligneSaisieNoteSchema>;

export const listNotesForSaisieInputSchema = z.object({
  classId: z.string().uuid(),
  subjectOfferingId: z.string().uuid(),
});
export type ListNotesForSaisieInput = z.infer<typeof listNotesForSaisieInputSchema>;

export const classStudentSchema = z.object({
  studentId: z.string().uuid(),
  matricule: z.string(),
  lastName: z.string(),
  firstName: z.string(),
});
export type ClassStudentDto = z.infer<typeof classStudentSchema>;

export const listClassStudentsInputSchema = z.object({ classId: z.string().uuid() });
export type ListClassStudentsInput = z.infer<typeof listClassStudentsInputSchema>;

/** Motif obligatoire non requis : la note finale est toujours recalculée, jamais saisie (MODULE-06 §3 règle 1). */
export const saisirNoteInputSchema = z.object({
  studentId: z.string().uuid(),
  subjectOfferingId: z.string().uuid(),
  noteOrale: noteValueSchema.nullish(),
  noteEcrite: noteValueSchema.nullish(),
  noteComposition: noteValueSchema.nullish(),
});
export type SaisirNoteInput = z.infer<typeof saisirNoteInputSchema>;
