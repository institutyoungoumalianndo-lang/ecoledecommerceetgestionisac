import { prisma } from "@isac-erp/db";
import type { PedagogicalDiagnosticResult, PedagogicalIssue } from "@isac-erp/shared";
import { resolveOfferingsForContext } from "./subjectOfferingService.js";

/**
 * Diagnostic pédagogique (MODULE-02.1 §1.5/§3 règle 5) : purement informatif,
 * ne bloque aucune opération — aucun module consommateur (Emploi du temps,
 * Notes) n'existe encore pour justifier un verrou. Vérifie, pour chaque
 * semestre de l'année de la classe : qu'au moins une matière obligatoire est
 * définie, que les volumes horaires des matières obligatoires ne sont pas
 * nuls, que leur coefficient est renseigné (> 0).
 */
export async function validateClassPedagogy(classId: string): Promise<PedagogicalDiagnosticResult> {
  const cls = await prisma.class.findUniqueOrThrow({
    where: { id: classId },
    include: { filiere: true, level: true, academicYear: { include: { periods: { orderBy: { orderIndex: "asc" } } } } },
  });

  const issues: PedagogicalIssue[] = [];

  for (const period of cls.academicYear.periods) {
    const offerings = await resolveOfferingsForContext({
      academicYearId: cls.academicYearId,
      periodId: period.id,
      levelId: cls.levelId,
      filiereId: cls.filiereId,
    });
    const requiredOfferings = offerings.filter((o) => o.isRequired);

    if (requiredOfferings.length === 0) {
      issues.push({
        periodId: period.id,
        periodLabel: period.label,
        type: "MATIERE_OBLIGATOIRE_MANQUANTE",
        message: `Aucune matière obligatoire définie pour ${period.label} (${cls.filiere.name} / ${cls.level.label}).`,
        subjectOfferingId: null,
        subjectName: null,
      });
    }

    for (const offering of requiredOfferings) {
      if (offering.totalHours === 0) {
        issues.push({
          periodId: period.id,
          periodLabel: period.label,
          type: "VOLUME_HORAIRE_INCOHERENT",
          message: `"${offering.subjectName}" n'a aucun volume horaire renseigné (cours/TD/TP/travail personnel tous à 0).`,
          subjectOfferingId: offering.id,
          subjectName: offering.subjectName,
        });
      }
      if (offering.coefficient <= 0) {
        issues.push({
          periodId: period.id,
          periodLabel: period.label,
          type: "COEFFICIENT_MANQUANT",
          message: `"${offering.subjectName}" n'a pas de coefficient valide.`,
          subjectOfferingId: offering.id,
          subjectName: offering.subjectName,
        });
      }
    }
  }

  return {
    classId: cls.id,
    className: cls.name,
    filiereName: cls.filiere.name,
    levelName: cls.level.label,
    academicYearLabel: cls.academicYear.label,
    issues,
    isValid: issues.length === 0,
  };
}
