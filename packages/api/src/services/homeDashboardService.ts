import { prisma } from "@isac-erp/db";
import type { HomeDashboard } from "@isac-erp/shared";
import { getEnrollmentDashboard } from "./enrollmentService.js";
import { getFinancialDashboard } from "./financialReportService.js";
import { getPaymentDashboard } from "./paymentService.js";
import { getTeacherDashboard } from "./teacherDashboardService.js";
import { getPedagogicalDashboard } from "./pedagogicalDashboardService.js";

/**
 * Visibilité par section, résolue par le routeur à partir des permissions déjà
 * vérifiées côté serveur (mêmes codes que les tableaux de bord de module
 * existants) — voir `routers/homeDashboard.ts`. Ce service reste une pure
 * couche de calcul, comme le reste de `packages/api/src/services` (aucune
 * vérification de permission n'y est jamais faite, principe déjà en vigueur).
 */
export interface HomeDashboardVisibility {
  students: boolean;
  enrollments: boolean;
  payments: boolean;
  finance: boolean;
  teachers: boolean;
  pedagogical: boolean;
  timetable: boolean;
  evaluation: boolean;
  communication: boolean;
  documents: boolean;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7)); // lundi
  return d;
}
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function startOfMonth(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}
function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}
function monthLabel(date: Date): string {
  return date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}
function dayLabel(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

async function monthlyEnrollmentSeries(now: Date): Promise<{ label: string; value: number }[]> {
  const points: { label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = addMonths(startOfMonth(now), -i);
    const end = addMonths(start, 1);
    const count = await prisma.studentEnrollment.count({ where: { createdAt: { gte: start, lt: end } } });
    points.push({ label: monthLabel(start), value: count });
  }
  return points;
}

async function monthlyPaymentSeries(now: Date): Promise<{ label: string; value: number }[]> {
  const points: { label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = addMonths(startOfMonth(now), -i);
    const end = addMonths(start, 1);
    const total = await prisma.payment.aggregate({
      where: { status: "VALIDE", createdAt: { gte: start, lt: end } },
      _sum: { amount: true },
    });
    points.push({ label: monthLabel(start), value: Number(total._sum.amount ?? 0) });
  }
  return points;
}

async function dailyCollectionsHistory(now: Date): Promise<{ label: string; value: number }[]> {
  const points: { label: string; value: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const start = addDays(startOfDay(now), -i);
    const end = addDays(start, 1);
    const total = await prisma.payment.aggregate({
      where: { status: "VALIDE", createdAt: { gte: start, lt: end } },
      _sum: { amount: true },
    });
    points.push({ label: dayLabel(start), value: Number(total._sum.amount ?? 0) });
  }
  return points;
}

/** Tableau de bord d'accueil unifié — refonte UI/UX Phase 3 (2026-07-30). */
export async function getHomeDashboard(userId: string, visible: HomeDashboardVisibility): Promise<HomeDashboard> {
  const now = new Date();
  const today = startOfDay(now);
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);
  const monthStart = startOfMonth(now);

  const [
    activeStudentsCount,
    enrolledTodayCount,
    debtorStudentsCount,
    paymentDashboard,
    enrollmentDashboard,
    teacherDashboard,
    pedagogicalDashboard,
    financialDashboard,
    seancesThisWeekCount,
    openEvaluationPeriodsCount,
    smsSentMonthCount,
    whatsappSentMonthCount,
    emailsSentMonthCount,
    notificationsCount,
    messagesFailedCount,
    expiredCardsCount,
    enrollmentsByMonth,
    paymentsByMonth,
    collectionsHistory,
  ] = await Promise.all([
    // "Étudiants actifs" = réinscrits pour l'année active, pas seulement non archivés (2026-08-09,
    // retour du porteur du projet : "un étudiant de l'année précédente n'est plus actif tant qu'il ne
    // s'est pas réinscrit pour l'année suivante") — n'affecte QUE ce compteur, jamais `archivedAt` lui-
    // même (recherche/rapports financiers/communication/export restent inchangés, voir studentService.ts).
    visible.students
      ? prisma.student.count({
          where: { archivedAt: null, enrollments: { some: { cancelledAt: null, academicYear: { isActive: true } } } },
        })
      : Promise.resolve(null),
    visible.enrollments ? prisma.studentEnrollment.count({ where: { createdAt: { gte: today } } }) : Promise.resolve(null),
    visible.enrollments
      ? prisma.studentEnrollment.count({
          where: { academicYear: { isActive: true }, paymentStatus: { in: ["NON_PAYE", "PARTIELLEMENT_PAYE"] } },
        })
      : Promise.resolve(null),
    visible.payments ? getPaymentDashboard() : Promise.resolve(null),
    visible.enrollments ? getEnrollmentDashboard({}) : Promise.resolve(null),
    visible.teachers ? getTeacherDashboard() : Promise.resolve(null),
    visible.pedagogical ? getPedagogicalDashboard() : Promise.resolve(null),
    visible.finance ? getFinancialDashboard() : Promise.resolve(null),
    visible.timetable
      ? prisma.seance.count({ where: { sessionDate: { gte: weekStart, lt: weekEnd } } })
      : Promise.resolve(null),
    // "Examens" (cahier des charges) n'existe pas comme entité — proxy transparent : périodes
    // d'évaluation actives à la date du jour, sur l'année académique active.
    visible.evaluation
      ? prisma.academicPeriod.count({
          where: { academicYear: { isActive: true }, startDate: { lte: now }, endDate: { gte: now } },
        })
      : Promise.resolve(null),
    visible.communication
      ? prisma.communicationMessage.count({
          where: { channel: "SMS", status: { in: ["ENVOYE", "LIVRE", "LU"] }, createdAt: { gte: monthStart } },
        })
      : Promise.resolve(null),
    visible.communication
      ? prisma.communicationMessage.count({
          where: { channel: "WHATSAPP", status: { in: ["ENVOYE", "LIVRE", "LU"] }, createdAt: { gte: monthStart } },
        })
      : Promise.resolve(null),
    visible.communication
      ? prisma.communicationMessage.count({
          where: { channel: "EMAIL", status: { in: ["ENVOYE", "LIVRE", "LU"] }, createdAt: { gte: monthStart } },
        })
      : Promise.resolve(null),
    visible.communication ? prisma.internalNotification.count({ where: { userId, isRead: false } }) : Promise.resolve(null),
    // "Alertes importantes" n'existe pas comme concept générique — composite transparent :
    // messages de communication échoués + cartes d'étudiant expirées.
    visible.communication ? prisma.communicationMessage.count({ where: { status: "ECHOUE" } }) : Promise.resolve(null),
    visible.documents ? prisma.studentCard.count({ where: { status: "EXPIRED" } }) : Promise.resolve(null),
    visible.enrollments ? monthlyEnrollmentSeries(now) : Promise.resolve(null),
    visible.payments ? monthlyPaymentSeries(now) : Promise.resolve(null),
    visible.payments ? dailyCollectionsHistory(now) : Promise.resolve(null),
  ]);

  const importantAlertsCount =
    messagesFailedCount === null && expiredCardsCount === null
      ? null
      : (messagesFailedCount ?? 0) + (expiredCardsCount ?? 0);

  return {
    cards: {
      activeStudentsCount,
      enrolledTodayCount,
      collectedTodayAmount: paymentDashboard?.totalToday ?? null,
      collectedMonthAmount: paymentDashboard?.totalMonth ?? null,
      debtorStudentsCount,
      activeTeachersCount: teacherDashboard?.totalCount ?? null,
      classCount: pedagogicalDashboard?.classCount ?? null,
      filiereCount: pedagogicalDashboard?.filiereCount ?? null,
      seancesThisWeekCount,
      openEvaluationPeriodsCount,
      pendingPaymentsAmount: paymentDashboard?.totalOutstanding ?? null,
      smsSentMonthCount,
      whatsappSentMonthCount,
      emailsSentMonthCount,
      notificationsCount,
      importantAlertsCount,
    },
    charts: {
      enrollmentsByMonth,
      revenueByMonth: financialDashboard?.recentMonths ?? null,
      byFiliere: enrollmentDashboard ? enrollmentDashboard.byFiliere.map((f) => ({ label: f.filiereName, count: f.count })) : null,
      byGender: enrollmentDashboard?.byGender ?? null,
      byLevel: enrollmentDashboard ? enrollmentDashboard.byLevel.map((l) => ({ label: l.levelLabel, count: l.count })) : null,
      paymentsByMonth,
      collectionsHistory,
    },
  };
}
