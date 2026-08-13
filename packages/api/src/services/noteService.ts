import { prisma } from "@isac-erp/db";
import type {
  ClassStudentDto,
  EnrollmentDecision,
  LigneSaisieNoteDto,
  ListNotesForSaisieInput,
  SaisirNoteInput,
} from "@isac-erp/shared";
import { getEvaluationSettings } from "./evaluationSettingsService.js";

// --- Fonctions pures — testables sans base de données (MODULE-06 §1.1-§1.6). ---

export interface ComponentWeights {
  poidsOrale: number;
  poidsEcrite: number;
  poidsComposition: number;
}

/**
 * Note finale d'une matière = moyenne des composantes renseignées, chacune pondérée (MODULE-06
 * §1.1/§1.2) — repris du système existant, pondérations désormais configurables. `null` si aucune
 * composante n'est renseignée.
 */
export function calculerNoteFinale(
  noteOrale: number | null,
  noteEcrite: number | null,
  noteComposition: number | null,
  poids: ComponentWeights
): number | null {
  const composantes: Array<[number, number]> = [];
  if (noteOrale !== null) composantes.push([noteOrale, poids.poidsOrale]);
  if (noteEcrite !== null) composantes.push([noteEcrite, poids.poidsEcrite]);
  if (noteComposition !== null) composantes.push([noteComposition, poids.poidsComposition]);
  if (composantes.length === 0) return null;

  const totalPondere = composantes.reduce((sum, [valeur, poid]) => sum + valeur * poid, 0);
  const totalPoids = composantes.reduce((sum, [, poid]) => sum + poid, 0);
  return Math.round((totalPondere / totalPoids) * 100) / 100;
}

export interface MentionThresholds {
  seuilPassable: number;
  seuilAssezBien: number;
  seuilBien: number;
  seuilTresBien: number;
}

/** Barème de mention (MODULE-06 §1.6) — repris du système existant, seuils configurables. */
export function obtenirMention(moyenne: number | null, seuils: MentionThresholds): string {
  if (moyenne === null) return "—";
  if (moyenne < seuils.seuilPassable) return "Ajourné";
  if (moyenne < seuils.seuilAssezBien) return "Passable";
  if (moyenne < seuils.seuilBien) return "Assez Bien";
  if (moyenne < seuils.seuilTresBien) return "Bien";
  return "Très Bien";
}

/** Décision : jamais REDOUBLANT automatique, uniquement une correction manuelle (MODULE-06 §1.6). */
export function obtenirDecision(moyenne: number, seuilAdmission: number): EnrollmentDecision {
  return moyenne >= seuilAdmission ? "ADMIS" : "AJOURNE";
}

/** Moyenne pondérée par coefficient des matières d'une période pour un étudiant (MODULE-06 §1.4). */
export function calculerMoyennePeriode(notes: Array<{ noteFinale: number | null; coefficient: number }>): number | null {
  const notesNotees = notes.filter((n): n is { noteFinale: number; coefficient: number } => n.noteFinale !== null);
  if (notesNotees.length === 0) return null;
  const totalPondere = notesNotees.reduce((sum, n) => sum + n.noteFinale * n.coefficient, 0);
  const totalCoefficients = notesNotees.reduce((sum, n) => sum + n.coefficient, 0);
  if (totalCoefficients === 0) return null;
  return Math.round((totalPondere / totalCoefficients) * 100) / 100;
}

/**
 * Moyenne annuelle = moyenne des moyennes de toutes les périodes calculables, pondération égale
 * entre périodes (MODULE-06 §1.5 — généralise le "(module1+module2)/2" du système existant à N
 * périodes).
 */
export function calculerMoyenneAnnuelle(moyennesParPeriode: Array<number | null>): number | null {
  const moyennesNotees = moyennesParPeriode.filter((m): m is number => m !== null);
  if (moyennesNotees.length === 0) return null;
  const total = moyennesNotees.reduce((sum, m) => sum + m, 0);
  return Math.round((total / moyennesNotees.length) * 100) / 100;
}

// --- Service. ---

/** Étudiants actifs d'une classe — utilisé pour choisir un étudiant avant de générer un bulletin. */
export async function listClassStudents(classId: string): Promise<ClassStudentDto[]> {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { classId, cancelledAt: null },
    include: { student: true },
    orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
  });
  return enrollments.map((e) => ({
    studentId: e.studentId,
    matricule: e.student.matricule,
    lastName: e.student.lastName,
    firstName: e.student.firstName,
  }));
}

export async function listNotesForSaisie(input: ListNotesForSaisieInput): Promise<LigneSaisieNoteDto[]> {
  const [enrollments, offering, existingNotes] = await Promise.all([
    prisma.studentEnrollment.findMany({
      where: { classId: input.classId, cancelledAt: null },
      include: { student: true },
      orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
    }),
    prisma.subjectOffering.findUniqueOrThrow({ where: { id: input.subjectOfferingId } }),
    prisma.note.findMany({ where: { subjectOfferingId: input.subjectOfferingId } }),
  ]);

  const noteByStudentId = new Map(existingNotes.map((n) => [n.studentId, n]));
  const coefficient = Number(offering.coefficient);

  return enrollments.map((enrollment) => {
    const note = noteByStudentId.get(enrollment.studentId);
    return {
      studentId: enrollment.studentId,
      studentLastName: enrollment.student.lastName,
      studentFirstName: enrollment.student.firstName,
      noteId: note?.id ?? null,
      noteOrale: note?.noteOrale ? Number(note.noteOrale) : null,
      noteEcrite: note?.noteEcrite ? Number(note.noteEcrite) : null,
      noteComposition: note?.noteComposition ? Number(note.noteComposition) : null,
      noteFinale: note?.noteFinale ? Number(note.noteFinale) : null,
      coefficient,
      verrouillee: note?.verrouillee ?? false,
    };
  });
}

/** Saisit ou modifie une note (MODULE-06 §3 règle 1-2) — la note finale est toujours recalculée. */
export async function saisirNote(
  input: SaisirNoteInput,
  saisiePar: string,
  aPermissionAdministration: boolean
): Promise<void> {
  const existing = await prisma.note.findUnique({
    where: { studentId_subjectOfferingId: { studentId: input.studentId, subjectOfferingId: input.subjectOfferingId } },
  });
  if (existing?.verrouillee && !aPermissionAdministration) {
    throw new Error(
      "Cette note est verrouillée (bulletin déjà généré) — seul un utilisateur habilité peut la modifier."
    );
  }

  const settings = await getEvaluationSettings();
  const noteOrale = input.noteOrale ?? null;
  const noteEcrite = input.noteEcrite ?? null;
  const noteComposition = input.noteComposition ?? null;
  const noteFinale = calculerNoteFinale(noteOrale, noteEcrite, noteComposition, settings);

  await prisma.note.upsert({
    where: { studentId_subjectOfferingId: { studentId: input.studentId, subjectOfferingId: input.subjectOfferingId } },
    create: {
      studentId: input.studentId,
      subjectOfferingId: input.subjectOfferingId,
      noteOrale,
      noteEcrite,
      noteComposition,
      noteFinale,
      saisiePar,
    },
    update: { noteOrale, noteEcrite, noteComposition, noteFinale, saisiePar, saisieLe: new Date() },
  });
}

/** Moyenne d'un étudiant sur une période (MODULE-06 §1.4), à partir des notes déjà en base. */
export async function calculerMoyennePeriodeEtudiant(studentId: string, academicPeriodId: string): Promise<number | null> {
  const notes = await prisma.note.findMany({
    where: { studentId, subjectOffering: { periodId: academicPeriodId } },
    include: { subjectOffering: true },
  });
  return calculerMoyennePeriode(
    notes.map((n) => ({
      noteFinale: n.noteFinale ? Number(n.noteFinale) : null,
      coefficient: Number(n.subjectOffering.coefficient),
    }))
  );
}

/** Moyenne annuelle d'un étudiant (MODULE-06 §1.5), sur toutes les périodes de l'année. */
export async function calculerMoyenneAnnuelleEtudiant(studentId: string, academicYearId: string): Promise<number | null> {
  const periods = await prisma.academicPeriod.findMany({ where: { academicYearId }, orderBy: { orderIndex: "asc" } });
  const moyennes = await Promise.all(periods.map((p) => calculerMoyennePeriodeEtudiant(studentId, p.id)));
  return calculerMoyenneAnnuelle(moyennes);
}

/** Verrouille toutes les notes d'un étudiant pour une période (MODULE-06 §3 règle 3). */
export async function verrouillerNotesPeriode(studentId: string, academicPeriodId: string): Promise<void> {
  await prisma.note.updateMany({
    where: { studentId, subjectOffering: { periodId: academicPeriodId } },
    data: { verrouillee: true },
  });
}
