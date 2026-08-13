import { prisma, type Prisma } from "@isac-erp/db";
import type { ClosePayPeriodInput, CreatePayPeriodInput, PayPeriodDto } from "@isac-erp/shared";

const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export function payPeriodLabel(year: number, month: number): string {
  return `${MONTH_LABELS[month - 1] ?? month} ${year}`;
}

type PayPeriodWithUser = Prisma.PayPeriodGetPayload<{ include: { validatedByUser: true } }>;

function toDto(row: PayPeriodWithUser): PayPeriodDto {
  return {
    id: row.id,
    year: row.year,
    month: row.month,
    label: payPeriodLabel(row.year, row.month),
    status: row.status,
    openedAt: row.openedAt,
    closedAt: row.closedAt,
    paymentDate: row.paymentDate,
    validatedByName: row.validatedByUser ? `${row.validatedByUser.firstName} ${row.validatedByUser.lastName}` : null,
  };
}

export async function listPayPeriods(filter: { year?: number }): Promise<PayPeriodDto[]> {
  const rows = await prisma.payPeriod.findMany({
    where: { year: filter.year },
    include: { validatedByUser: true },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  return rows.map(toDto);
}

export async function getPayPeriodById(id: string): Promise<PayPeriodDto> {
  const row = await prisma.payPeriod.findUniqueOrThrow({ where: { id }, include: { validatedByUser: true } });
  return toDto(row);
}

/** Ouvre un nouveau mois de paie (MODULE-08 §1.6) — statut initial OUVERT. */
export async function createPayPeriod(input: CreatePayPeriodInput): Promise<PayPeriodDto> {
  const existing = await prisma.payPeriod.findUnique({
    where: { year_month: { year: input.year, month: input.month } },
  });
  if (existing) {
    throw new Error(`La période ${payPeriodLabel(input.year, input.month)} est déjà ouverte.`);
  }
  const row = await prisma.payPeriod.create({
    data: { year: input.year, month: input.month },
    include: { validatedByUser: true },
  });
  return toDto(row);
}

/** Passe la période en EN_COURS dès le premier calcul de bulletin (jamais avant clôture). */
export async function markPayPeriodInProgress(payPeriodId: string): Promise<void> {
  await prisma.payPeriod.updateMany({
    where: { id: payPeriodId, status: "OUVERT" },
    data: { status: "EN_COURS" },
  });
}

function assertPayPeriodNotLocked(status: string): void {
  if (status === "CLOTURE") {
    throw new Error("Cette période de paie est clôturée. Seul un administrateur autorisé peut la rouvrir.");
  }
}

export async function assertPayPeriodModifiable(payPeriodId: string): Promise<void> {
  const period = await prisma.payPeriod.findUniqueOrThrow({ where: { id: payPeriodId } });
  assertPayPeriodNotLocked(period.status);
}

/** Clôture le mois : exige que toutes les lignes de paie de la période soient VALIDEE (MODULE-08 §1.6). */
export async function closePayPeriod(input: ClosePayPeriodInput, validatedBy: string): Promise<PayPeriodDto> {
  const unfinished = await prisma.payrollLine.count({
    where: { payPeriodId: input.id, status: { not: "VALIDEE" } },
  });
  if (unfinished > 0) {
    throw new Error("Toutes les lignes de paie doivent être validées avant de clôturer la période.");
  }
  const row = await prisma.payPeriod.update({
    where: { id: input.id },
    data: {
      status: "CLOTURE",
      closedAt: new Date(),
      paymentDate: input.paymentDate ?? new Date(),
      validatedBy,
    },
    include: { validatedByUser: true },
  });
  return toDto(row);
}

/** Réouverture par un administrateur autorisé (`PAIE:ADMINISTRATION`) — voir MODULE-08 §1.6. */
export async function reopenPayPeriod(id: string): Promise<PayPeriodDto> {
  const row = await prisma.payPeriod.update({
    where: { id },
    data: { status: "EN_COURS", closedAt: null },
    include: { validatedByUser: true },
  });
  return toDto(row);
}
