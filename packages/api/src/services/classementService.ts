import { prisma } from "@isac-erp/db";
import type { ClassementLigneDto, GetClassementInput } from "@isac-erp/shared";
import { getEvaluationSettings } from "./evaluationSettingsService.js";
import { calculerMoyenneAnnuelleEtudiant, calculerMoyennePeriodeEtudiant, obtenirDecision, obtenirMention } from "./noteService.js";

/**
 * Attribue un rang "façon classement sportif" : deux étudiants à égalité partagent le même rang,
 * le rang suivant saute (ex. 1, 1, 3) — repris tel quel du système existant (MODULE-06 §1.9).
 * Fonction pure, testable sans base de données. `lignes` doit déjà être trié par moyenne décroissante.
 */
export function attribuerRangs<T extends { moyenne: number }>(lignes: T[]): Array<T & { rang: number }> {
  let rangCourant = 0;
  let moyennePrecedente: number | null = null;
  return lignes.map((ligne, index) => {
    if (ligne.moyenne !== moyennePrecedente) rangCourant = index + 1;
    moyennePrecedente = ligne.moyenne;
    return { ...ligne, rang: rangCourant };
  });
}

/**
 * Classement par mérite — jamais stocké, recalculé à la demande (MODULE-06 §1.9) — réunit tous les
 * étudiants d'une filière/niveau (toutes classes confondues) pour une année, `academicPeriodId`
 * null = moyenne annuelle.
 */
export async function obtenirClassement(input: GetClassementInput): Promise<ClassementLigneDto[]> {
  const classes = await prisma.class.findMany({
    where: { filiereId: input.filiereId, levelId: input.levelId, academicYearId: input.academicYearId },
  });
  const classIds = classes.map((c) => c.id);
  if (classIds.length === 0) return [];

  const [enrollments, settings] = await Promise.all([
    prisma.studentEnrollment.findMany({
      where: { classId: { in: classIds }, cancelledAt: null },
      include: { student: true },
    }),
    getEvaluationSettings(),
  ]);

  const lignes: Array<Omit<ClassementLigneDto, "rang">> = [];
  for (const enrollment of enrollments) {
    const moyenne = input.academicPeriodId
      ? await calculerMoyennePeriodeEtudiant(enrollment.studentId, input.academicPeriodId)
      : await calculerMoyenneAnnuelleEtudiant(enrollment.studentId, input.academicYearId);
    if (moyenne === null) continue;
    lignes.push({
      studentId: enrollment.studentId,
      matricule: enrollment.student.matricule,
      studentName: `${enrollment.student.lastName} ${enrollment.student.firstName}`,
      photoPath: enrollment.student.photoPath,
      moyenne,
      mention: obtenirMention(moyenne, settings),
      decision: obtenirDecision(moyenne, settings.seuilAdmission),
    });
  }

  lignes.sort((a, b) => b.moyenne - a.moyenne);
  return attribuerRangs(lignes);
}
