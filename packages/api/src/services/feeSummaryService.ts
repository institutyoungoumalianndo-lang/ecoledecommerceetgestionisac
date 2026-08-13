import { prisma } from "@isac-erp/db";
import type {
  FeeDashboard,
  FeeDashboardInput,
  GetStudentFeeSummaryInput,
  PaymentStatus,
  StudentFeeLine,
  StudentFeeSummary,
} from "@isac-erp/shared";
import { resolveApplicableTariff, matchesContext, selectMostSpecificTariff } from "./feeTariffService.js";
import { toReductionDto } from "./feeReductionService.js";

/**
 * Rôle particulier de la Scolarité (2026-08-09, retour du porteur du projet — précisé en deux temps).
 * D'abord : "dans aucun document comptable il ne doit exister une mention des frais qui ont été payés
 * à part la scolarité". Puis, nuance : "les autres frais doivent apparaître mais pas comptabilisés sur
 * la somme totale à payer, et comme la scolarité je dois pouvoir les encaisser mais pas les
 * comptabiliser sur le montant dû." Résultat : `lines` couvre tous les types de frais actifs (un
 * encaissement reste possible pour n'importe lequel, comme avant) mais les totaux agrégés
 * (`totalTariff/totalNet/totalPaid/totalRemaining/totalSurplus`, ci-dessous) ne portent plus que sur
 * la ligne Scolarité — jamais la somme de toutes les lignes. Tout consommateur qui a besoin d'un
 * montant "dû"/"en retard" scolarité-only doit filtrer `lines` sur `feeTypeCode === "SCOLARITE"`
 * (voir alertEngineService.ts, generators/retardPaiement.ts, generators/situationFinanciere.ts) plutôt
 * que de sommer toutes les lignes.
 */
export const SCOLARITE_FEE_TYPE_CODE = "SCOLARITE";

interface AllocationTotals {
  byFeeType: Map<string, number>;
  byInstallment: Map<string, number>;
}

async function getValidAllocationTotals(studentId: string, academicYearId: string): Promise<AllocationTotals> {
  const allocations = await prisma.paymentAllocation.findMany({
    where: { payment: { studentId, academicYearId, status: "VALIDE" } },
    select: { feeTypeId: true, feeInstallmentId: true, amount: true },
  });

  const byFeeType = new Map<string, number>();
  const byInstallment = new Map<string, number>();
  for (const a of allocations) {
    const amount = Number(a.amount);
    byFeeType.set(a.feeTypeId, (byFeeType.get(a.feeTypeId) ?? 0) + amount);
    if (a.feeInstallmentId) {
      byInstallment.set(a.feeInstallmentId, (byInstallment.get(a.feeInstallmentId) ?? 0) + amount);
    }
  }
  return { byFeeType, byInstallment };
}

/**
 * Coût de la scolarité d'un étudiant (MODULE-04.2 §1.7/§6.6). Depuis le
 * Module 4.3, "payé"/"reste à payer" sont calculés à partir des paiements
 * réellement enregistrés (`payment_allocations`, jamais recalculés depuis
 * les tarifs) — le tarif/les réductions restent lus exclusivement depuis le
 * Module 4.2.
 */
export async function getStudentFeeSummary(input: GetStudentFeeSummaryInput): Promise<StudentFeeSummary> {
  const targetYear = input.academicYearId
    ? await prisma.academicYear.findUniqueOrThrow({ where: { id: input.academicYearId } })
    : await prisma.academicYear.findFirstOrThrow({ where: { isActive: true } });

  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { studentId_academicYearId: { studentId: input.studentId, academicYearId: targetYear.id } },
  });

  const [feeTypes, allReductions, allocationTotals] = await Promise.all([
    prisma.feeType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.feeReduction.findMany({
      where: { studentId: input.studentId, academicYearId: targetYear.id },
      include: { student: true, feeType: true, academicYear: true },
    }),
    getValidAllocationTotals(input.studentId, targetYear.id),
  ]);

  const now = new Date();
  const validReductions = allReductions.filter((r) => !r.validTo || r.validTo >= now);

  const lines: StudentFeeLine[] = await Promise.all(
    feeTypes.map(async (feeType) => {
      const tariff = enrollment
        ? await resolveApplicableTariff(feeType.id, {
            academicYearId: targetYear.id,
            filiereId: enrollment.filiereId,
            levelId: enrollment.levelId,
            classId: enrollment.classId,
            enrollmentStatus: enrollment.status,
          })
        : null;

      const applicableReductions = validReductions.filter((r) => r.feeTypeId === null || r.feeTypeId === feeType.id);
      const reductionAmount = tariff
        ? applicableReductions.reduce((sum, r) => {
            const value = Number(r.value);
            return sum + (r.valueMode === "POURCENTAGE" ? (tariff.amount * value) / 100 : value);
          }, 0)
        : 0;

      const netAmount = tariff ? Math.max(0, tariff.amount - reductionAmount) : null;
      const paidAmount = allocationTotals.byFeeType.get(feeType.id) ?? 0;
      const remainingAmount = netAmount !== null ? Math.max(0, netAmount - paidAmount) : null;
      const surplusAmount = netAmount !== null ? Math.max(0, paidAmount - netAmount) : paidAmount;

      const installments = (tariff?.installmentPlan?.installments ?? []).map((i) => {
        const installmentPaid = allocationTotals.byInstallment.get(i.id) ?? 0;
        return {
          id: i.id,
          orderIndex: i.orderIndex,
          label: i.label,
          dueDate: i.dueDate,
          amount: i.amount,
          paidAmount: installmentPaid,
          remainingAmount: Math.max(0, i.amount - installmentPaid),
        };
      });

      return {
        feeTypeId: feeType.id,
        feeTypeName: feeType.name,
        feeTypeCode: feeType.code,
        tariffAmount: tariff?.amount ?? null,
        reductions: applicableReductions.map((r) => toReductionDto(r)),
        reductionAmount,
        netAmount,
        paidAmount,
        remainingAmount,
        surplusAmount,
        installments,
      };
    })
  );

  // Totaux agrégés scolarité seule (voir commentaire sur SCOLARITE_FEE_TYPE_CODE ci-dessus) — jamais
  // la somme de toutes les lignes, même si `lines` couvre tous les types de frais actifs.
  const scolariteLine = lines.find((l) => l.feeTypeCode === SCOLARITE_FEE_TYPE_CODE);
  const totalTariff = scolariteLine?.tariffAmount ?? 0;
  const totalReductions = scolariteLine?.reductionAmount ?? 0;
  const totalNet = scolariteLine?.netAmount ?? 0;
  const totalPaid = scolariteLine?.paidAmount ?? 0;
  const totalRemaining = scolariteLine?.remainingAmount ?? 0;
  const totalSurplus = scolariteLine?.surplusAmount ?? 0;

  return {
    studentId: input.studentId,
    academicYearId: targetYear.id,
    academicYearLabel: targetYear.label,
    lines,
    totalTariff,
    totalReductions,
    totalNet,
    totalPaid,
    totalRemaining,
    totalSurplus,
  };
}

/**
 * Résumés de frais de tous les étudiants actuellement inscrits d'une année — réutilisé par les
 * rapports/alertes décisionnels (MODULE-10 §1.2/§1.3 : taux de recouvrement, impayés en retard),
 * jamais un nouveau calcul de tarif indépendant.
 */
export async function getAllActiveStudentFeeSummaries(academicYearId: string): Promise<StudentFeeSummary[]> {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { academicYearId, cancelledAt: null },
    select: { studentId: true },
  });
  return Promise.all(enrollments.map((e) => getStudentFeeSummary({ studentId: e.studentId, academicYearId })));
}

export function computePaymentStatus(totalNet: number, totalPaid: number): PaymentStatus {
  if (totalNet <= 0 || totalPaid >= totalNet) return "TOTALEMENT_PAYE";
  if (totalPaid <= 0) return "NON_PAYE";
  return "PARTIELLEMENT_PAYE";
}

/**
 * Recalcule et enregistre `student_enrollments.payment_status`/`fee_amount_expected`
 * à partir des paiements réels (MODULE-04.3 §6 point 3, remplace la saisie
 * manuelle du Module 4.1) — appelé explicitement après chaque création ou
 * annulation de paiement, jamais depuis une simple lecture.
 */
export async function syncEnrollmentPaymentStatus(enrollmentId: string): Promise<void> {
  const enrollment = await prisma.studentEnrollment.findUniqueOrThrow({ where: { id: enrollmentId } });
  const summary = await getStudentFeeSummary({ studentId: enrollment.studentId, academicYearId: enrollment.academicYearId });
  await prisma.studentEnrollment.update({
    where: { id: enrollmentId },
    data: {
      feeAmountExpected: summary.totalNet,
      paymentStatus: computePaymentStatus(summary.totalNet, summary.totalPaid),
    },
  });
}

export async function getFeeDashboard(input: FeeDashboardInput): Promise<FeeDashboard> {
  const where = input.academicYearId ? { academicYearId: input.academicYearId } : {};

  const [totalFeeTypes, tariffs, grouped] = await Promise.all([
    prisma.feeType.count({ where: { isActive: true } }),
    prisma.feeTariff.findMany({ where: { ...where, isActive: true }, select: { amount: true } }),
    prisma.feeTariff.groupBy({
      by: ["feeTypeId"],
      where: { ...where, isActive: true },
      _count: { _all: true },
      orderBy: { _count: { feeTypeId: "desc" } },
      take: 5,
    }),
  ]);

  const feeTypeIds = grouped.map((g) => g.feeTypeId);
  const feeTypes = await prisma.feeType.findMany({ where: { id: { in: feeTypeIds } } });
  const feeTypeById = new Map(feeTypes.map((f) => [f.id, f]));

  const totalTariffs = tariffs.length;
  const averageTariffAmount =
    totalTariffs === 0 ? 0 : tariffs.reduce((sum, t) => sum + Number(t.amount), 0) / totalTariffs;

  return {
    totalFeeTypes,
    totalTariffs,
    averageTariffAmount,
    byFeeType: grouped.map((g) => ({
      feeTypeId: g.feeTypeId,
      feeTypeName: feeTypeById.get(g.feeTypeId)?.name ?? "?",
      tariffCount: g._count._all,
    })),
  };
}

/**
 * Solde restant agrégé, tous étudiants actifs de l'année (MODULE-04.3 §7.9).
 * Réutilise les mêmes fonctions pures de résolution que `resolveApplicableTariff`
 * (matchesContext/selectMostSpecificTariff) appliquées en mémoire sur des
 * données chargées en bloc, pour éviter une requête par étudiant.
 */
export async function getTotalOutstandingForActiveYear(): Promise<number> {
  const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
  if (!activeYear) return 0;

  const [enrollments, tariffs, reductions, allocations] = await Promise.all([
    prisma.studentEnrollment.findMany({
      where: { academicYearId: activeYear.id, cancelledAt: null },
      select: { id: true, studentId: true, filiereId: true, levelId: true, classId: true, status: true },
    }),
    prisma.feeTariff.findMany({
      where: { academicYearId: activeYear.id, isActive: true, feeType: { code: SCOLARITE_FEE_TYPE_CODE } },
    }),
    prisma.feeReduction.findMany({
      where: { academicYearId: activeYear.id, OR: [{ validTo: null }, { validTo: { gte: new Date() } }] },
    }),
    prisma.paymentAllocation.findMany({
      where: { payment: { academicYearId: activeYear.id, status: "VALIDE" } },
      select: { feeTypeId: true, amount: true, payment: { select: { studentId: true } } },
    }),
  ]);

  const tariffsByFeeType = new Map<string, typeof tariffs>();
  for (const t of tariffs) {
    const list = tariffsByFeeType.get(t.feeTypeId) ?? [];
    list.push(t);
    tariffsByFeeType.set(t.feeTypeId, list);
  }

  const reductionsByStudent = new Map<string, typeof reductions>();
  for (const r of reductions) {
    const list = reductionsByStudent.get(r.studentId) ?? [];
    list.push(r);
    reductionsByStudent.set(r.studentId, list);
  }

  const paidByStudentAndFeeType = new Map<string, number>();
  for (const a of allocations) {
    const key = `${a.payment.studentId}:${a.feeTypeId}`;
    paidByStudentAndFeeType.set(key, (paidByStudentAndFeeType.get(key) ?? 0) + Number(a.amount));
  }

  let totalOutstanding = 0;
  for (const enrollment of enrollments) {
    for (const [feeTypeId, candidates] of tariffsByFeeType) {
      const matching = candidates.filter((c) =>
        matchesContext(c, {
          filiereId: enrollment.filiereId,
          levelId: enrollment.levelId,
          classId: enrollment.classId,
          enrollmentStatus: enrollment.status,
        })
      );
      const best = selectMostSpecificTariff(matching);
      if (!best) continue;

      const amount = Number(best.amount);
      const studentReductions = (reductionsByStudent.get(enrollment.studentId) ?? []).filter(
        (r) => r.feeTypeId === null || r.feeTypeId === feeTypeId
      );
      const reductionAmount = studentReductions.reduce((sum, r) => {
        const value = Number(r.value);
        return sum + (r.valueMode === "POURCENTAGE" ? (amount * value) / 100 : value);
      }, 0);
      const netAmount = Math.max(0, amount - reductionAmount);
      const paid = paidByStudentAndFeeType.get(`${enrollment.studentId}:${feeTypeId}`) ?? 0;
      totalOutstanding += Math.max(0, netAmount - paid);
    }
  }

  return totalOutstanding;
}
