import { prisma } from "@isac-erp/db";
import type { AccountingPeriodDto, ListAccountingPeriodsInput, PeriodInput } from "@isac-erp/shared";

function fullName(user: { firstName: string; lastName: string } | null): string | null {
  return user ? `${user.firstName} ${user.lastName}` : null;
}

async function getOrCreatePeriod(year: number, month: number) {
  const existing = await prisma.accountingPeriod.findUnique({ where: { year_month: { year, month } } });
  if (existing) return existing;
  return prisma.accountingPeriod.create({ data: { year, month } });
}

export async function listAccountingPeriods(filter: ListAccountingPeriodsInput): Promise<AccountingPeriodDto[]> {
  const rows = await prisma.accountingPeriod.findMany({
    where: { year: filter.year },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { lockedByUser: true },
  });
  return rows.map((row) => ({
    id: row.id,
    year: row.year,
    month: row.month,
    isLocked: row.isLocked,
    lockedAt: row.lockedAt,
    lockedByName: fullName(row.lockedByUser),
  }));
}

/** Verrouillage de période (MODULE-07 §1.5) : bloque toute nouvelle écriture sur cette période. */
export async function lockPeriod(input: PeriodInput, userId: string): Promise<AccountingPeriodDto> {
  const period = await getOrCreatePeriod(input.year, input.month);
  const row = await prisma.accountingPeriod.update({
    where: { id: period.id },
    data: { isLocked: true, lockedAt: new Date(), lockedBy: userId },
    include: { lockedByUser: true },
  });
  return { id: row.id, year: row.year, month: row.month, isLocked: row.isLocked, lockedAt: row.lockedAt, lockedByName: fullName(row.lockedByUser) };
}

export async function unlockPeriod(input: PeriodInput): Promise<AccountingPeriodDto> {
  const period = await getOrCreatePeriod(input.year, input.month);
  const row = await prisma.accountingPeriod.update({
    where: { id: period.id },
    data: { isLocked: false, lockedAt: null, lockedBy: null },
    include: { lockedByUser: true },
  });
  return { id: row.id, year: row.year, month: row.month, isLocked: row.isLocked, lockedAt: row.lockedAt, lockedByName: fullName(row.lockedByUser) };
}

/** Utilisé par journalEntryService avant toute création/contre-passation d'écriture (MODULE-07 §3 règle 4). */
export async function isPeriodLocked(date: Date): Promise<boolean> {
  const period = await prisma.accountingPeriod.findUnique({
    where: { year_month: { year: date.getFullYear(), month: date.getMonth() + 1 } },
  });
  return period?.isLocked ?? false;
}
