import { prisma, type Prisma } from "@isac-erp/db";
import type {
  CancelJournalEntryInput,
  CreateJournalEntryInput,
  JournalEntryDto,
  JournalEntryLineInput,
  ListJournalEntriesInput,
  ListJournalEntriesResult,
} from "@isac-erp/shared";
import { generateJournalEntryNumber } from "./matriculeService.js";
import { isPeriodLocked } from "./accountingPeriodService.js";

const JOURNAL_ENTRY_INCLUDE = {
  lines: { include: { account: true } },
  createdByUser: true,
  cancelledByUser: true,
} satisfies Prisma.JournalEntryInclude;

type JournalEntryWithRelations = Prisma.JournalEntryGetPayload<{ include: typeof JOURNAL_ENTRY_INCLUDE }>;

function fullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`;
}

function toJournalEntryDto(row: JournalEntryWithRelations): JournalEntryDto {
  const lines = row.lines.map((l) => ({
    id: l.id,
    accountId: l.accountId,
    accountCode: l.account.code,
    accountLabel: l.account.label,
    debit: Number(l.debit),
    credit: Number(l.credit),
    label: l.label,
  }));
  return {
    id: row.id,
    entryNumber: row.entryNumber,
    entryDate: row.entryDate,
    label: row.label,
    sourceModule: row.sourceModule,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    status: row.status,
    reversalOfId: row.reversalOfId,
    createdByName: fullName(row.createdByUser),
    cancelledAt: row.cancelledAt,
    cancelledReason: row.cancelledReason,
    cancelledByName: row.cancelledByUser ? fullName(row.cancelledByUser) : null,
    lines,
    totalDebit: lines.reduce((sum, l) => sum + l.debit, 0),
    totalCredit: lines.reduce((sum, l) => sum + l.credit, 0),
  };
}

/** Équilibre obligatoire (MODULE-07 §3 règle 1) : chaque ligne a exactement un sens (débit XOR crédit), et la somme des débits égale la somme des crédits. */
function assertBalanced(lines: JournalEntryLineInput[]): void {
  if (lines.length < 2) {
    throw new Error("Une écriture doit comporter au moins deux lignes.");
  }
  for (const line of lines) {
    const hasDebit = line.debit > 0;
    const hasCredit = line.credit > 0;
    if (hasDebit === hasCredit) {
      throw new Error("Chaque ligne doit être soit au débit, soit au crédit, jamais les deux ni aucun des deux.");
    }
  }
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new Error(`Écriture déséquilibrée : débit ${totalDebit} ≠ crédit ${totalCredit}.`);
  }
}

async function insertEntry(
  params: {
    entryDate: Date;
    label: string;
    sourceModule: string;
    sourceType?: string;
    sourceId?: string;
    lines: JournalEntryLineInput[];
    createdBy: string;
    reversalOfId?: string;
  }
): Promise<string> {
  assertBalanced(params.lines);
  if (await isPeriodLocked(params.entryDate)) {
    throw new Error("La période comptable de cette date est verrouillée.");
  }

  return prisma.$transaction(async (tx) => {
    const entryNumber = await generateJournalEntryNumber(tx);
    const entry = await tx.journalEntry.create({
      data: {
        entryNumber,
        entryDate: params.entryDate,
        label: params.label,
        sourceModule: params.sourceModule,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        createdBy: params.createdBy,
        reversalOfId: params.reversalOfId,
        lines: {
          create: params.lines.map((l) => ({
            accountId: l.accountId,
            debit: l.debit,
            credit: l.credit,
            label: l.label ?? null,
          })),
        },
      },
    });
    return entry.id;
  });
}

/** Écriture manuelle (MODULE-07 §1.3 — pour ce qui ne peut pas être généré automatiquement). */
export async function createJournalEntry(input: CreateJournalEntryInput, userId: string): Promise<JournalEntryDto> {
  const id = await insertEntry({
    entryDate: input.entryDate,
    label: input.label,
    sourceModule: "MANUEL",
    lines: input.lines,
    createdBy: userId,
  });
  return getJournalEntryById(id);
}

/** Annulation par contre-passation (MODULE-07 §1.6/§3 règle 3) : jamais de suppression, une écriture miroir inverse est créée. */
export async function cancelJournalEntry(
  input: CancelJournalEntryInput,
  userId: string
): Promise<{ before: JournalEntryDto; after: JournalEntryDto }> {
  const current = await prisma.journalEntry.findUniqueOrThrow({ where: { id: input.id }, include: JOURNAL_ENTRY_INCLUDE });
  if (current.status === "ANNULEE") {
    throw new Error("Cette écriture est déjà annulée.");
  }
  const before = toJournalEntryDto(current);

  const reversalDate = new Date();
  if (await isPeriodLocked(reversalDate)) {
    throw new Error("La période comptable actuelle est verrouillée : impossible de contre-passer.");
  }

  const reversalLines: JournalEntryLineInput[] = current.lines.map((l) => ({
    accountId: l.accountId,
    debit: Number(l.credit),
    credit: Number(l.debit),
    label: `Contre-passation de ${current.entryNumber}`,
  }));

  await prisma.$transaction(async (tx) => {
    const entryNumber = await generateJournalEntryNumber(tx);
    await tx.journalEntry.create({
      data: {
        entryNumber,
        entryDate: reversalDate,
        label: `Annulation — ${current.label}`,
        sourceModule: current.sourceModule,
        sourceType: current.sourceType,
        sourceId: current.sourceId,
        createdBy: userId,
        reversalOfId: current.id,
        lines: { create: reversalLines.map((l) => ({ accountId: l.accountId, debit: l.debit, credit: l.credit, label: l.label })) },
      },
    });
    await tx.journalEntry.update({
      where: { id: current.id },
      data: { status: "ANNULEE", cancelledAt: reversalDate, cancelledReason: input.reason, cancelledBy: userId },
    });
  });

  const row = await prisma.journalEntry.findUniqueOrThrow({ where: { id: input.id }, include: JOURNAL_ENTRY_INCLUDE });
  return { before, after: toJournalEntryDto(row) };
}

export async function getJournalEntryById(id: string): Promise<JournalEntryDto> {
  const row = await prisma.journalEntry.findUniqueOrThrow({ where: { id }, include: JOURNAL_ENTRY_INCLUDE });
  return toJournalEntryDto(row);
}

export async function listJournalEntries(filter: ListJournalEntriesInput): Promise<ListJournalEntriesResult> {
  const where: Prisma.JournalEntryWhereInput = {
    OR: filter.search
      ? [
          { entryNumber: { contains: filter.search, mode: "insensitive" } },
          { label: { contains: filter.search, mode: "insensitive" } },
        ]
      : undefined,
    sourceModule: filter.sourceModule,
    status: filter.status,
    lines: filter.accountId ? { some: { accountId: filter.accountId } } : undefined,
    entryDate: filter.dateFrom || filter.dateTo ? { gte: filter.dateFrom, lte: filter.dateTo } : undefined,
  };

  const [rows, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      include: JOURNAL_ENTRY_INCLUDE,
      orderBy: { [filter.sortBy]: filter.sortDirection },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
    }),
    prisma.journalEntry.count({ where }),
  ]);

  return { items: rows.map(toJournalEntryDto), total, page: filter.page, pageSize: filter.pageSize };
}

/**
 * Génération automatique depuis un paiement (MODULE-07 §1.2) : ne crée
 * l'écriture que si le mode de paiement et chaque type de frais concerné ont
 * un compte configuré — sinon le paiement reste valide, simplement non
 * comptabilisé (jamais d'écriture partielle/déséquilibrée).
 */
export async function recordPaymentEntry(payment: {
  id: string;
  amount: number;
  createdAt: Date;
  recordedBy: string;
  receiptNumber: string;
  paymentMethodId: string;
  allocations: { feeTypeId: string; amount: number }[];
}): Promise<JournalEntryDto | null> {
  const paymentMethod = await prisma.paymentMethod.findUniqueOrThrow({ where: { id: payment.paymentMethodId } });
  if (!paymentMethod.linkedAccountId) return null;

  const feeTypeIds = [...new Set(payment.allocations.map((a) => a.feeTypeId))];
  const feeTypes = await prisma.feeType.findMany({ where: { id: { in: feeTypeIds } } });
  const feeTypeById = new Map(feeTypes.map((f) => [f.id, f]));
  if (feeTypes.some((f) => !f.revenueAccountId)) return null;

  const creditByAccount = new Map<string, number>();
  for (const allocation of payment.allocations) {
    const revenueAccountId = feeTypeById.get(allocation.feeTypeId)?.revenueAccountId;
    if (!revenueAccountId) return null;
    creditByAccount.set(revenueAccountId, (creditByAccount.get(revenueAccountId) ?? 0) + allocation.amount);
  }

  const lines: JournalEntryLineInput[] = [
    { accountId: paymentMethod.linkedAccountId, debit: payment.amount, credit: 0 },
    ...[...creditByAccount.entries()].map(([accountId, amount]) => ({ accountId, debit: 0, credit: amount })),
  ];

  const id = await insertEntry({
    entryDate: payment.createdAt,
    label: `Encaissement — reçu ${payment.receiptNumber}`,
    sourceModule: "PAIEMENTS",
    sourceType: "Payment",
    sourceId: payment.id,
    lines,
    createdBy: payment.recordedBy,
  });
  return getJournalEntryById(id);
}

/** Annulation d'un paiement (MODULE-07 §1.2) : contre-passe l'écriture si elle existait, sinon rien à faire. */
export async function recordPaymentCancellationEntry(paymentId: string, cancelledBy: string): Promise<void> {
  const entry = await prisma.journalEntry.findFirst({
    where: { sourceType: "Payment", sourceId: paymentId, status: "VALIDEE" },
  });
  if (!entry) return;
  await cancelJournalEntry({ id: entry.id, reason: "Paiement annulé" }, cancelledBy);
}

/**
 * Génération automatique depuis une dépense approuvée (MODULE-07 §1.3) :
 * même principe conditionnel que pour les paiements.
 */
export async function recordExpenseApprovalEntry(expense: {
  id: string;
  amount: number;
  date: Date;
  expenseNumber: string;
  categoryId: string;
  paymentMethodId: string;
  approvedBy: string;
}): Promise<JournalEntryDto | null> {
  const [category, paymentMethod] = await Promise.all([
    prisma.expenseCategory.findUniqueOrThrow({ where: { id: expense.categoryId } }),
    prisma.paymentMethod.findUniqueOrThrow({ where: { id: expense.paymentMethodId } }),
  ]);
  if (!category.defaultAccountId || !paymentMethod.linkedAccountId) return null;

  const lines: JournalEntryLineInput[] = [
    { accountId: category.defaultAccountId, debit: expense.amount, credit: 0 },
    { accountId: paymentMethod.linkedAccountId, debit: 0, credit: expense.amount },
  ];

  const id = await insertEntry({
    entryDate: expense.date,
    label: `Dépense — ${expense.expenseNumber}`,
    sourceModule: "DEPENSES",
    sourceType: "Expense",
    sourceId: expense.id,
    lines,
    createdBy: expense.approvedBy,
  });
  return getJournalEntryById(id);
}

/**
 * Génération automatique depuis un bulletin de paie validé (MODULE-08 §1.11) : même principe
 * conditionnel que les paiements/dépenses — rien n'est généré tant que le compte de charges de
 * personnel (payroll_settings) et le compte de trésorerie du mode de paiement ne sont pas configurés.
 * Simplification assumée (voir MODULE-08 §1.11) : une seule paire débit/crédit sur le net à payer,
 * pas de décomposition brut/retenues/cotisations vers des comptes de tiers séparés.
 */
export async function recordPayrollValidationEntry(payrollLine: {
  id: string;
  netSalary: number;
  payPeriodYear: number;
  payPeriodMonth: number;
  employeeMatricule: string;
  paymentMethodId: string | null;
  validatedBy: string;
}): Promise<JournalEntryDto | null> {
  if (payrollLine.netSalary <= 0 || !payrollLine.paymentMethodId) return null;

  const [settings, paymentMethod] = await Promise.all([
    prisma.payrollSettings.findFirst(),
    prisma.paymentMethod.findUniqueOrThrow({ where: { id: payrollLine.paymentMethodId } }),
  ]);
  if (!settings?.salaryExpenseAccountId || !paymentMethod.linkedAccountId) return null;

  const lines: JournalEntryLineInput[] = [
    { accountId: settings.salaryExpenseAccountId, debit: payrollLine.netSalary, credit: 0 },
    { accountId: paymentMethod.linkedAccountId, debit: 0, credit: payrollLine.netSalary },
  ];

  const id = await insertEntry({
    entryDate: new Date(payrollLine.payPeriodYear, payrollLine.payPeriodMonth - 1, 1),
    label: `Paie — ${payrollLine.employeeMatricule} — ${payrollLine.payPeriodMonth}/${payrollLine.payPeriodYear}`,
    sourceModule: "PAIE",
    sourceType: "PayrollLine",
    sourceId: payrollLine.id,
    lines,
    createdBy: payrollLine.validatedBy,
  });
  return getJournalEntryById(id);
}

export { toJournalEntryDto, JOURNAL_ENTRY_INCLUDE, assertBalanced };
