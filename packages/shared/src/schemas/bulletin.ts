import { z } from "zod";
import { enrollmentDecisionSchema } from "./studentEnrollment.js";

/**
 * Réutilise `EnrollmentDecision` (Module 4.1) plutôt qu'un enum dédié : `student_enrollments`
 * portait déjà `decision`/`annual_average`/`mention`, en attente d'un futur module d'évaluation
 * pour les alimenter (voir MODULE-06 §7) — c'est exactement ce module.
 */
const decisionEvaluationSchema = enrollmentDecisionSchema;

const matiereMoyenneSchema = z.object({
  subjectOfferingId: z.string().uuid(),
  subjectName: z.string(),
  coefficient: z.number(),
  noteOrale: z.number().nullable(),
  noteEcrite: z.number().nullable(),
  noteComposition: z.number().nullable(),
  noteFinale: z.number().nullable(),
});
export type MatiereMoyenneDto = z.infer<typeof matiereMoyenneSchema>;

/**
 * Bulletin de période — instantané figé à la génération (voir MODULE-06 §1.7). Écran HTML/CSS
 * imprimable, aucun fichier PDF stocké (comme le bulletin de paie et le reçu de paiement).
 */
export const bulletinPeriodeSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  studentMatricule: z.string(),
  studentName: z.string(),
  studentPhotoPath: z.string().nullable(),
  classLabel: z.string(),
  filiereLabel: z.string().nullable(),
  levelLabel: z.string(),
  academicPeriodId: z.string().uuid(),
  academicPeriodLabel: z.string(),
  academicYearLabel: z.string(),
  numeroDossier: z.string(),
  moyenne: z.number().nullable(),
  mention: z.string(),
  // Régularité (2026-08-03) : "Régulier"/"Irrégulier", calculée à la génération selon le nombre
  // d'absences non justifiées sur la période (EvaluationSettings.seuilAbsencesIrregulier).
  regularite: z.string(),
  decision: decisionEvaluationSchema,
  rang: z.number().int().nullable(),
  effectifClasse: z.number().int(),
  verificationCode: z.string(),
  annule: z.boolean(),
  genereLe: z.coerce.date(),
  genereParName: z.string().nullable(),
  matieres: z.array(matiereMoyenneSchema),
});
export type BulletinPeriodeDto = z.infer<typeof bulletinPeriodeSchema>;

export const genererBulletinPeriodeInputSchema = z.object({
  studentId: z.string().uuid(),
  academicPeriodId: z.string().uuid(),
});
export type GenererBulletinPeriodeInput = z.infer<typeof genererBulletinPeriodeInputSchema>;

const matiereMoyenneAnnuelleSchema = z.object({
  subjectName: z.string(),
  coefficient: z.number(),
  moyennesParPeriode: z.array(z.object({ periodLabel: z.string(), moyenne: z.number().nullable() })),
  moyenneAnnuelle: z.number().nullable(),
});
export type MatiereMoyenneAnnuelleDto = z.infer<typeof matiereMoyenneAnnuelleSchema>;

/** Bulletin annuel — agrège les moyennes de toutes les périodes de l'année (MODULE-06 §1.5/§1.8). */
export const bulletinAnnuelSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  studentMatricule: z.string(),
  studentName: z.string(),
  studentPhotoPath: z.string().nullable(),
  classLabel: z.string(),
  filiereLabel: z.string().nullable(),
  levelLabel: z.string(),
  academicYearId: z.string().uuid(),
  academicYearLabel: z.string(),
  numeroDossier: z.string(),
  moyenneAnnuelle: z.number().nullable(),
  mention: z.string(),
  // Régularité (2026-08-03) : "Régulier"/"Irrégulier", calculée à la génération selon le nombre
  // d'absences non justifiées sur l'année (EvaluationSettings.seuilAbsencesIrregulier).
  regularite: z.string(),
  decision: decisionEvaluationSchema,
  rang: z.number().int().nullable(),
  effectif: z.number().int(),
  verificationCode: z.string(),
  annule: z.boolean(),
  genereLe: z.coerce.date(),
  genereParName: z.string().nullable(),
  matieres: z.array(matiereMoyenneAnnuelleSchema),
});
export type BulletinAnnuelDto = z.infer<typeof bulletinAnnuelSchema>;

export const genererBulletinAnnuelInputSchema = z.object({
  studentId: z.string().uuid(),
  academicYearId: z.string().uuid(),
});
export type GenererBulletinAnnuelInput = z.infer<typeof genererBulletinAnnuelInputSchema>;

export const bulletinIdInputSchema = z.object({ id: z.string().uuid() });

export const listBulletinsStudentInputSchema = z.object({ studentId: z.string().uuid() });
export type ListBulletinsStudentInput = z.infer<typeof listBulletinsStudentInputSchema>;

/** Classement par mérite — jamais stocké, recalculé à la demande (MODULE-06 §1.9). */
export const classementLigneSchema = z.object({
  studentId: z.string().uuid(),
  matricule: z.string(),
  studentName: z.string(),
  photoPath: z.string().nullable(),
  moyenne: z.number(),
  mention: z.string(),
  decision: decisionEvaluationSchema,
  rang: z.number().int(),
});
export type ClassementLigneDto = z.infer<typeof classementLigneSchema>;

export const getClassementInputSchema = z.object({
  filiereId: z.string().uuid(),
  levelId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  academicPeriodId: z.string().uuid().nullish(),
});
export type GetClassementInput = z.infer<typeof getClassementInputSchema>;
