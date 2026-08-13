import { prisma, type Prisma } from "@isac-erp/db";
import type {
  CashRegisterSessionDto,
  CloseCashRegisterSessionInput,
  ListCashRegisterSessionsInput,
  OpenCashRegisterSessionInput,
} from "@isac-erp/shared";

const SESSION_INCLUDE = {
  cashRegister: true,
  openedByUser: true,
  closedByUser: true,
  payments: { select: { amount: true, status: true, paymentMethod: { select: { code: true } } } },
} satisfies Prisma.CashRegisterSessionInclude;

type SessionWithRelations = Prisma.CashRegisterSessionGetPayload<{ include: typeof SESSION_INCLUDE }>;

function fullName(user: { firstName: string; lastName: string } | null): string | null {
  return user ? `${user.firstName} ${user.lastName}` : null;
}

function toSessionDto(row: SessionWithRelations): CashRegisterSessionDto {
  const validPayments = row.payments.filter((p) => p.status === "VALIDE");
  return {
    id: row.id,
    cashRegisterId: row.cashRegisterId,
    cashRegisterName: row.cashRegister.name,
    openedBy: row.openedBy,
    openedByName: fullName(row.openedByUser) ?? "?",
    openedAt: row.openedAt,
    openingBalance: Number(row.openingBalance),
    closedBy: row.closedBy,
    closedByName: fullName(row.closedByUser),
    closedAt: row.closedAt,
    closingBalanceDeclared: row.closingBalanceDeclared ? Number(row.closingBalanceDeclared) : null,
    closingBalanceComputed: row.closingBalanceComputed ? Number(row.closingBalanceComputed) : null,
    variance: row.variance ? Number(row.variance) : null,
    status: row.status,
    notes: row.notes,
    totalCollected: validPayments.reduce((sum, p) => sum + Number(p.amount), 0),
    paymentCount: validPayments.length,
  };
}

export async function listCashRegisterSessions(
  filter: ListCashRegisterSessionsInput
): Promise<CashRegisterSessionDto[]> {
  const rows = await prisma.cashRegisterSession.findMany({
    where: { cashRegisterId: filter.cashRegisterId, status: filter.status },
    orderBy: { openedAt: "desc" },
    include: SESSION_INCLUDE,
    take: 200,
  });
  return rows.map(toSessionDto);
}

export async function getOpenSessionForUser(userId: string): Promise<CashRegisterSessionDto | null> {
  const row = await prisma.cashRegisterSession.findFirst({
    where: { openedBy: userId, status: "OUVERTE" },
    include: SESSION_INCLUDE,
  });
  return row ? toSessionDto(row) : null;
}

export async function getSessionById(id: string): Promise<CashRegisterSessionDto> {
  const row = await prisma.cashRegisterSession.findUniqueOrThrow({ where: { id }, include: SESSION_INCLUDE });
  return toSessionDto(row);
}

/** Ouverture (MODULE-04.3 §3 règle 1) : un utilisateur ne peut avoir qu'une session ouverte à la fois, une caisse ne peut être ouverte que par une personne à la fois. */
export async function openCashRegisterSession(
  input: OpenCashRegisterSessionInput,
  userId: string
): Promise<CashRegisterSessionDto> {
  const [existingUserSession, existingRegisterSession] = await Promise.all([
    prisma.cashRegisterSession.findFirst({ where: { openedBy: userId, status: "OUVERTE" } }),
    prisma.cashRegisterSession.findFirst({ where: { cashRegisterId: input.cashRegisterId, status: "OUVERTE" } }),
  ]);
  if (existingUserSession) {
    throw new Error("Vous avez déjà une session de caisse ouverte — fermez-la avant d'en ouvrir une nouvelle.");
  }
  if (existingRegisterSession) {
    throw new Error("Cette caisse est déjà ouverte par un autre utilisateur.");
  }

  const row = await prisma.cashRegisterSession.create({
    data: {
      cashRegisterId: input.cashRegisterId,
      openedBy: userId,
      openingBalance: input.openingBalance,
      notes: input.notes ?? null,
    },
    include: SESSION_INCLUDE,
  });
  return toSessionDto(row);
}

/** Solde calculé à la fermeture — espèces validées uniquement (MODULE-04.3 §1.6/§3 règle 5). */
export function computeClosingBalance(openingBalance: number, validCashPaymentsAmount: number): number {
  return openingBalance + validCashPaymentsAmount;
}

/** Écart de caisse : solde compté par le caissier moins solde calculé. */
export function computeVariance(closingBalanceDeclared: number, closingBalanceComputed: number): number {
  return closingBalanceDeclared - closingBalanceComputed;
}

/**
 * Fermeture (MODULE-04.3 §1.6/§3 règle 5) : le solde calculé ne porte que sur
 * les paiements en espèces validés de la session — jamais tous modes
 * confondus (c'est "total des encaissements" qui couvre tous les modes,
 * exposé séparément par toSessionDto.totalCollected). Une fois fermée, la
 * session est figée : jamais recalculée a posteriori.
 */
export async function closeCashRegisterSession(
  input: CloseCashRegisterSessionInput,
  userId: string
): Promise<{ before: CashRegisterSessionDto; after: CashRegisterSessionDto }> {
  const current = await prisma.cashRegisterSession.findUniqueOrThrow({
    where: { id: input.id },
    include: SESSION_INCLUDE,
  });
  if (current.status !== "OUVERTE") {
    throw new Error("Cette session de caisse est déjà fermée.");
  }
  const before = toSessionDto(current);

  const cashCollected = current.payments
    .filter((p) => p.status === "VALIDE" && p.paymentMethod.code === "ESPECES")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const closingBalanceComputed = computeClosingBalance(Number(current.openingBalance), cashCollected);
  const variance = computeVariance(input.closingBalanceDeclared, closingBalanceComputed);

  const updated = await prisma.cashRegisterSession.update({
    where: { id: input.id },
    data: {
      closedBy: userId,
      closedAt: new Date(),
      closingBalanceDeclared: input.closingBalanceDeclared,
      closingBalanceComputed,
      variance,
      status: "FERMEE",
      notes: input.notes ?? current.notes,
    },
    include: SESSION_INCLUDE,
  });
  return { before, after: toSessionDto(updated) };
}

export { toSessionDto, SESSION_INCLUDE };
