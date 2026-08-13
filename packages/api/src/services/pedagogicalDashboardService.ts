import { prisma } from "@isac-erp/db";
import type { PedagogicalDashboard } from "@isac-erp/shared";

/** Tableau de bord pédagogique (MODULE-02.1 §1.11/§9.13) — répartitions calculées à la volée sur l'année active. */
export async function getPedagogicalDashboard(): Promise<PedagogicalDashboard> {
  const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });

  const [filiereCount, levelCount, classCount, subjectCount, teachingUnitCount, offerings] = await Promise.all([
    prisma.filiere.count({ where: { isActive: true } }),
    prisma.level.count({ where: { isActive: true } }),
    prisma.class.count({ where: { isActive: true, academicYearId: activeYear?.id } }),
    prisma.subject.count({ where: { isActive: true } }),
    prisma.teachingUnit.count({ where: { isActive: true } }),
    activeYear
      ? prisma.subjectOffering.findMany({
          where: { academicYearId: activeYear.id, isActive: true },
          include: { subject: true, filiere: true },
        })
      : Promise.resolve([]),
  ]);

  const hoursByType = offerings.reduce(
    (acc, o) => {
      acc.course += o.hoursCourse;
      acc.td += o.hoursTd;
      acc.tp += o.hoursTp;
      acc.personalWork += o.hoursPersonalWork;
      return acc;
    },
    { course: 0, td: 0, tp: 0, personalWork: 0 }
  );

  const creditsByFiliere = new Map<string, { filiereName: string; subjectIds: Set<string>; total: number }>();
  for (const o of offerings) {
    if (!o.filiereId || !o.filiere) continue;
    const entry = creditsByFiliere.get(o.filiereId) ?? { filiereName: o.filiere.name, subjectIds: new Set(), total: 0 };
    if (!entry.subjectIds.has(o.subjectId)) {
      entry.subjectIds.add(o.subjectId);
      entry.total += o.subject.credits ? Number(o.subject.credits) : 0;
    }
    creditsByFiliere.set(o.filiereId, entry);
  }

  return {
    filiereCount,
    levelCount,
    classCount,
    subjectCount,
    teachingUnitCount,
    hoursByType,
    creditsByFiliere: [...creditsByFiliere.entries()].map(([filiereId, v]) => ({
      filiereId,
      filiereName: v.filiereName,
      totalCredits: v.total,
    })),
  };
}
