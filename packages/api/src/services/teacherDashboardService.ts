import { prisma } from "@isac-erp/db";
import type { TeacherDashboard } from "@isac-erp/shared";
import { computeWorkloadFromPeriods, type PeriodWorkload } from "./teacherAssignmentService.js";

/** Tableau de bord Enseignants (MODULE-05 §1.9/§10.9) — répartitions calculées à la volée. */
export async function getTeacherDashboard(): Promise<TeacherDashboard> {
  const today = new Date();
  const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });

  const [teachers, activeLeaves, assignments] = await Promise.all([
    prisma.teacher.findMany({ where: { archivedAt: null }, include: { status: true } }),
    prisma.teacherLeave.findMany({
      where: { startDate: { lte: today }, endDate: { gte: today }, teacher: { archivedAt: null } },
      select: { teacherId: true },
    }),
    activeYear
      ? prisma.teacherAssignment.findMany({
          where: { isActive: true, teacher: { archivedAt: null }, subjectOffering: { academicYearId: activeYear.id } },
          include: { subjectOffering: { include: { period: true } } },
        })
      : Promise.resolve([]),
  ]);

  const totalCount = teachers.length;

  const byStatusMap = new Map<string, number>();
  const bySpecialtyMap = new Map<string, number>();
  for (const t of teachers) {
    const statusLabel = t.status?.label ?? "Non renseigné";
    byStatusMap.set(statusLabel, (byStatusMap.get(statusLabel) ?? 0) + 1);
    if (t.specialty) {
      bySpecialtyMap.set(t.specialty, (bySpecialtyMap.get(t.specialty) ?? 0) + 1);
    }
  }

  const hoursByTeacher = new Map<string, Map<string, PeriodWorkload>>();
  for (const a of assignments) {
    const period = a.subjectOffering.period;
    const weeklyHours = a.subjectOffering.hoursCourse + a.subjectOffering.hoursTd + a.subjectOffering.hoursTp;
    const periodsForTeacher = hoursByTeacher.get(a.teacherId) ?? new Map<string, PeriodWorkload>();
    const entry = periodsForTeacher.get(period.id) ?? { startDate: period.startDate, endDate: period.endDate, weeklyHours: 0 };
    entry.weeklyHours += weeklyHours;
    periodsForTeacher.set(period.id, entry);
    hoursByTeacher.set(a.teacherId, periodsForTeacher);
  }

  const totalWeeklyHours = [...hoursByTeacher.values()].reduce(
    (sum, periods) => sum + computeWorkloadFromPeriods([...periods.values()], today).weeklyHours,
    0
  );
  const averageWeeklyHours = totalCount > 0 ? totalWeeklyHours / totalCount : 0;

  const onLeaveTeacherIds = new Set(activeLeaves.map((l: { teacherId: string }) => l.teacherId));
  const availableCount = totalCount - onLeaveTeacherIds.size;

  return {
    totalCount,
    byStatus: [...byStatusMap.entries()].map(([statusLabel, count]) => ({ statusLabel, count })),
    bySpecialty: [...bySpecialtyMap.entries()].map(([specialty, count]) => ({ specialty, count })),
    averageWeeklyHours,
    availableCount,
  };
}
