import { prisma } from "@isac-erp/db";
import type { PedagogicalPerformanceGroupDto, PedagogicalPerformanceInput, PedagogicalPerformanceReportDto } from "@isac-erp/shared";
import { getEvaluationSettings } from "./evaluationSettingsService.js";
import { calculerMoyenneAnnuelleEtudiant, calculerMoyennePeriodeEtudiant, obtenirDecision } from "./noteService.js";

export interface StudentRow {
  filiereName: string;
  levelLabel: string;
  moyenne: number | null;
}

export function summarize(label: string, rows: StudentRow[], seuilAdmission: number): PedagogicalPerformanceGroupDto {
  const graded = rows.filter((r): r is StudentRow & { moyenne: number } => r.moyenne !== null);
  const averageGrade = graded.length > 0 ? graded.reduce((sum, r) => sum + r.moyenne, 0) / graded.length : null;
  const successCount = graded.filter((r) => obtenirDecision(r.moyenne, seuilAdmission) === "ADMIS").length;
  const successRate = graded.length > 0 ? (successCount / graded.length) * 100 : null;
  return { label, studentCount: rows.length, averageGrade, successRate };
}

function groupBy(rows: StudentRow[], key: (r: StudentRow) => string): Map<string, StudentRow[]> {
  const map = new Map<string, StudentRow[]>();
  for (const row of rows) {
    const list = map.get(key(row)) ?? [];
    list.push(row);
    map.set(key(row), list);
  }
  return map;
}

/**
 * Rapport de performance pédagogique (MODULE-10 §1.1) — réutilise `calculerMoyennePeriodeEtudiant`/
 * `calculerMoyenneAnnuelleEtudiant` (Module 6, `noteService.ts`), jamais de recalcul indépendant.
 * Toujours calculé à la demande, jamais stocké — même principe que `classementService.obtenirClassement`.
 */
export async function getPedagogicalPerformanceReport(input: PedagogicalPerformanceInput): Promise<PedagogicalPerformanceReportDto> {
  const settings = await getEvaluationSettings();
  const seuilAdmission = Number(settings.seuilAdmission);

  const classes = await prisma.class.findMany({
    where: { academicYearId: input.academicYearId, filiereId: input.filiereId, levelId: input.levelId },
    include: { filiere: true, level: true },
  });
  const classIds = classes.map((c) => c.id);
  const classById = new Map(classes.map((c) => [c.id, c]));

  const enrollments =
    classIds.length > 0
      ? await prisma.studentEnrollment.findMany({ where: { classId: { in: classIds }, cancelledAt: null } })
      : [];

  const rows: StudentRow[] = await Promise.all(
    enrollments.map(async (enrollment) => {
      const cls = classById.get(enrollment.classId)!;
      const moyenne = input.periodId
        ? await calculerMoyennePeriodeEtudiant(enrollment.studentId, input.periodId)
        : await calculerMoyenneAnnuelleEtudiant(enrollment.studentId, input.academicYearId);
      return { filiereName: cls.filiere.name, levelLabel: cls.level.label, moyenne };
    })
  );

  const byFiliere = [...groupBy(rows, (r) => r.filiereName).entries()].map(([label, group]) => summarize(label, group, seuilAdmission));
  const byLevel = [...groupBy(rows, (r) => r.levelLabel).entries()].map(([label, group]) => summarize(label, group, seuilAdmission));

  return {
    overall: summarize("Ensemble", rows, seuilAdmission),
    byFiliere,
    byLevel,
  };
}
