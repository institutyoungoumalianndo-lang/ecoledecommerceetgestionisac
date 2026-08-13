import { prisma, type EnrollmentStatus, type Prisma } from "@isac-erp/db";
import type {
  CreateFeeTariffInput,
  FeeTariffDto,
  FeeTariffListFilterInput,
  SetFeeInstallmentPlanInput,
  UpdateFeeTariffInput,
} from "@isac-erp/shared";

const TARIFF_INCLUDE = {
  feeType: true,
  academicYear: true,
  filiere: true,
  level: true,
  class: true,
  installments: { include: { installments: { orderBy: { orderIndex: "asc" as const } } } },
} satisfies Prisma.FeeTariffInclude;

type TariffWithRelations = Prisma.FeeTariffGetPayload<{ include: typeof TARIFF_INCLUDE }>;

function toTariffDto(row: TariffWithRelations): FeeTariffDto {
  return {
    id: row.id,
    feeTypeId: row.feeTypeId,
    feeTypeName: row.feeType.name,
    academicYearId: row.academicYearId,
    academicYearLabel: row.academicYear.label,
    filiereId: row.filiereId,
    filiereName: row.filiere?.name ?? null,
    levelId: row.levelId,
    levelLabel: row.level?.label ?? null,
    classId: row.classId,
    className: row.class?.name ?? null,
    targetEnrollmentStatus: row.targetEnrollmentStatus,
    amount: Number(row.amount),
    isActive: row.isActive,
    installmentPlan: row.installments
      ? {
          id: row.installments.id,
          feeTariffId: row.installments.feeTariffId,
          installmentCount: row.installments.installmentCount,
          latePenaltyType: row.installments.latePenaltyType,
          latePenaltyValue: row.installments.latePenaltyValue ? Number(row.installments.latePenaltyValue) : null,
          gracePeriodDays: row.installments.gracePeriodDays,
          installments: row.installments.installments.map((i) => ({
            id: i.id,
            orderIndex: i.orderIndex,
            label: i.label,
            dueDate: i.dueDate,
            amount: Number(i.amount),
          })),
        }
      : null,
  };
}

export async function listFeeTariffs(filter: FeeTariffListFilterInput): Promise<FeeTariffDto[]> {
  const where: Prisma.FeeTariffWhereInput = {
    isActive: filter.includeInactive ? undefined : true,
    academicYearId: filter.academicYearId,
    feeTypeId: filter.feeTypeId,
    filiereId: filter.filiereId,
    levelId: filter.levelId,
    classId: filter.classId,
  };
  const rows = await prisma.feeTariff.findMany({
    where,
    orderBy: [{ academicYear: { startDate: "desc" } }, { feeType: { name: "asc" } }],
    include: TARIFF_INCLUDE,
  });
  return rows.map(toTariffDto);
}

export async function getFeeTariffById(id: string): Promise<FeeTariffDto> {
  const row = await prisma.feeTariff.findUniqueOrThrow({ where: { id }, include: TARIFF_INCLUDE });
  return toTariffDto(row);
}

/** Empêche deux tarifs strictement identiques en portée (même combinaison de dimensions) — vérifié côté service (voir MODULE-04.2 §1.3, NULL rend une contrainte unique DB peu fiable). */
async function assertNoDuplicateScope(input: CreateFeeTariffInput, excludeId?: string): Promise<void> {
  const existing = await prisma.feeTariff.findFirst({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      feeTypeId: input.feeTypeId,
      academicYearId: input.academicYearId,
      filiereId: input.filiereId ?? null,
      levelId: input.levelId ?? null,
      classId: input.classId ?? null,
      targetEnrollmentStatus: input.targetEnrollmentStatus ?? null,
      isActive: true,
    },
  });
  if (existing) {
    throw new Error("Un tarif existe déjà pour exactement cette combinaison (type, année, filière, niveau, classe, statut).");
  }
}

export async function createFeeTariff(input: CreateFeeTariffInput): Promise<FeeTariffDto> {
  await assertNoDuplicateScope(input);
  const row = await prisma.feeTariff.create({
    data: {
      feeTypeId: input.feeTypeId,
      academicYearId: input.academicYearId,
      filiereId: input.filiereId ?? null,
      levelId: input.levelId ?? null,
      classId: input.classId ?? null,
      targetEnrollmentStatus: input.targetEnrollmentStatus ?? null,
      amount: input.amount,
    },
    include: TARIFF_INCLUDE,
  });
  return toTariffDto(row);
}

/** Montant modifiable en place (comme les autres paramètres du Module 2) — justification obligatoire, avant/après journalisés par l'appelant (routeur) dans audit_log. */
export async function updateFeeTariffAmount(
  input: UpdateFeeTariffInput
): Promise<{ before: FeeTariffDto; after: FeeTariffDto }> {
  const current = await prisma.feeTariff.findUniqueOrThrow({ where: { id: input.id }, include: TARIFF_INCLUDE });
  const before = toTariffDto(current);
  const updated = await prisma.feeTariff.update({
    where: { id: input.id },
    data: { amount: input.amount },
    include: TARIFF_INCLUDE,
  });
  return { before, after: toTariffDto(updated) };
}

export async function deactivateFeeTariff(id: string): Promise<FeeTariffDto> {
  const row = await prisma.feeTariff.update({ where: { id }, data: { isActive: false }, include: TARIFF_INCLUDE });
  return toTariffDto(row);
}

export async function reactivateFeeTariff(id: string): Promise<FeeTariffDto> {
  const row = await prisma.feeTariff.update({ where: { id }, data: { isActive: true }, include: TARIFF_INCLUDE });
  return toTariffDto(row);
}

export async function setFeeInstallmentPlan(input: SetFeeInstallmentPlanInput): Promise<FeeTariffDto> {
  await prisma.$transaction(async (tx) => {
    const plan = await tx.feeInstallmentPlan.upsert({
      where: { feeTariffId: input.feeTariffId },
      update: {
        installmentCount: input.installments.length,
        latePenaltyType: input.latePenaltyType,
        latePenaltyValue: input.latePenaltyValue ?? null,
        gracePeriodDays: input.gracePeriodDays,
      },
      create: {
        feeTariffId: input.feeTariffId,
        installmentCount: input.installments.length,
        latePenaltyType: input.latePenaltyType,
        latePenaltyValue: input.latePenaltyValue ?? null,
        gracePeriodDays: input.gracePeriodDays,
      },
    });
    await tx.feeInstallment.deleteMany({ where: { planId: plan.id } });
    await tx.feeInstallment.createMany({
      data: input.installments.map((i) => ({
        planId: plan.id,
        orderIndex: i.orderIndex,
        label: i.label ?? null,
        dueDate: i.dueDate,
        amount: i.amount,
      })),
    });
  });
  return getFeeTariffById(input.feeTariffId);
}

export async function removeFeeInstallmentPlan(feeTariffId: string): Promise<void> {
  await prisma.feeInstallmentPlan.deleteMany({ where: { feeTariffId } });
}

export interface TariffResolutionContext {
  academicYearId: string;
  filiereId: string;
  levelId: string;
  classId: string;
  enrollmentStatus: EnrollmentStatus;
}

export interface TariffScopeCandidate {
  filiereId: string | null;
  levelId: string | null;
  classId: string | null;
  targetEnrollmentStatus: string | null;
  updatedAt: Date;
}

/** Un tarif s'applique si chacune de ses dimensions renseignées correspond exactement au contexte (MODULE-04.2 §1.3). */
export function matchesContext<T extends TariffScopeCandidate>(
  candidate: T,
  context: Pick<TariffResolutionContext, "filiereId" | "levelId" | "classId" | "enrollmentStatus">
): boolean {
  return (
    (candidate.filiereId === null || candidate.filiereId === context.filiereId) &&
    (candidate.levelId === null || candidate.levelId === context.levelId) &&
    (candidate.classId === null || candidate.classId === context.classId) &&
    (candidate.targetEnrollmentStatus === null || candidate.targetEnrollmentStatus === context.enrollmentStatus)
  );
}

function specificityScore(candidate: TariffScopeCandidate): number {
  return (
    Number(candidate.filiereId !== null) +
    Number(candidate.levelId !== null) +
    Number(candidate.classId !== null) +
    Number(candidate.targetEnrollmentStatus !== null)
  );
}

/** Le tarif le plus spécifique (le plus de dimensions renseignées) l'emporte ; à égalité, le plus récemment modifié. */
export function selectMostSpecificTariff<T extends TariffScopeCandidate>(candidates: T[]): T | null {
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => {
    const diff = specificityScore(b) - specificityScore(a);
    if (diff !== 0) return diff;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
  return sorted[0]!;
}

/** Résolution du tarif le plus spécifique pour un type de frais donné (MODULE-04.2 §3.1). */
export async function resolveApplicableTariff(
  feeTypeId: string,
  context: TariffResolutionContext
): Promise<FeeTariffDto | null> {
  const candidates = await prisma.feeTariff.findMany({
    where: { feeTypeId, academicYearId: context.academicYearId, isActive: true },
    include: TARIFF_INCLUDE,
  });

  const matching = candidates.filter((c) => matchesContext(c, context));
  const best = selectMostSpecificTariff(matching);
  return best ? toTariffDto(best) : null;
}

export { toTariffDto, TARIFF_INCLUDE };
export type { TariffWithRelations };
