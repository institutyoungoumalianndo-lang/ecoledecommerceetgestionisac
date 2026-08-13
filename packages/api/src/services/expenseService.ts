import { prisma, type Prisma } from "@isac-erp/db";
import type {
  AddExpenseDocumentInput,
  CancelExpenseInput,
  CreateExpenseInput,
  ExpenseDto,
  ListExpensesInput,
  ListExpensesResult,
  RejectExpenseInput,
  UpdateExpenseInput,
} from "@isac-erp/shared";
import { generateExpenseNumber } from "./matriculeService.js";
import { cancelJournalEntry, recordExpenseApprovalEntry } from "./journalEntryService.js";

const EXPENSE_INCLUDE = {
  category: true,
  supplier: true,
  paymentMethod: true,
  cashRegisterSession: { include: { cashRegister: true } },
  responsibleUser: true,
  approvedByUser: true,
  createdByUser: true,
  documents: true,
} satisfies Prisma.ExpenseInclude;

type ExpenseWithRelations = Prisma.ExpenseGetPayload<{ include: typeof EXPENSE_INCLUDE }>;

function fullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`;
}

function toExpenseDto(row: ExpenseWithRelations): ExpenseDto {
  return {
    id: row.id,
    expenseNumber: row.expenseNumber,
    date: row.date,
    label: row.label,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    supplierId: row.supplierId,
    supplierName: row.supplier?.name ?? null,
    amount: Number(row.amount),
    paymentMethodId: row.paymentMethodId,
    paymentMethodLabel: row.paymentMethod.label,
    cashRegisterSessionId: row.cashRegisterSessionId,
    cashRegisterName: row.cashRegisterSession?.cashRegister.name ?? null,
    responsibleUserId: row.responsibleUserId,
    responsibleUserName: fullName(row.responsibleUser),
    observations: row.observations,
    status: row.status,
    approvedByName: row.approvedByUser ? fullName(row.approvedByUser) : null,
    approvedAt: row.approvedAt,
    rejectedReason: row.rejectedReason,
    journalEntryId: row.journalEntryId,
    createdByName: fullName(row.createdByUser),
    createdAt: row.createdAt,
    documents: row.documents.map((d) => ({
      id: d.id,
      expenseId: d.expenseId,
      documentType: d.documentType,
      filePath: d.filePath,
      fileName: d.fileName,
      mimeType: d.mimeType,
      fileSizeBytes: d.fileSizeBytes,
      createdAt: d.createdAt,
    })),
  };
}

const EDITABLE_STATUSES = ["BROUILLON", "REJETEE"] as const;

export async function getExpenseById(id: string): Promise<ExpenseDto> {
  const row = await prisma.expense.findUniqueOrThrow({ where: { id }, include: EXPENSE_INCLUDE });
  return toExpenseDto(row);
}

export async function createExpense(input: CreateExpenseInput, userId: string): Promise<ExpenseDto> {
  const id = await prisma.$transaction(async (tx) => {
    const expenseNumber = await generateExpenseNumber(tx);
    const expense = await tx.expense.create({
      data: {
        expenseNumber,
        date: input.date,
        label: input.label,
        categoryId: input.categoryId,
        supplierId: input.supplierId ?? null,
        amount: input.amount,
        paymentMethodId: input.paymentMethodId,
        cashRegisterSessionId: input.cashRegisterSessionId ?? null,
        responsibleUserId: input.responsibleUserId,
        observations: input.observations ?? null,
        createdBy: userId,
      },
    });
    return expense.id;
  });
  return getExpenseById(id);
}

export async function updateExpense(input: UpdateExpenseInput): Promise<ExpenseDto> {
  const current = await prisma.expense.findUniqueOrThrow({ where: { id: input.id } });
  if (!EDITABLE_STATUSES.includes(current.status as (typeof EDITABLE_STATUSES)[number])) {
    throw new Error("Seule une dépense en brouillon ou rejetée peut être modifiée.");
  }
  const { id, ...fields } = input;
  await prisma.expense.update({
    where: { id },
    data: { ...fields, status: current.status === "REJETEE" ? "BROUILLON" : undefined, rejectedReason: current.status === "REJETEE" ? null : undefined },
  });
  return getExpenseById(id);
}

export async function submitExpense(id: string): Promise<ExpenseDto> {
  const current = await prisma.expense.findUniqueOrThrow({ where: { id } });
  if (current.status !== "BROUILLON") {
    throw new Error("Seule une dépense en brouillon peut être soumise à approbation.");
  }
  await prisma.expense.update({ where: { id }, data: { status: "EN_ATTENTE_APPROBATION" } });
  return getExpenseById(id);
}

/** Approbation (MODULE-07 §1.3/§3 règle 5) : génère l'écriture comptable si les comptes sont configurés. */
export async function approveExpense(id: string, approvedBy: string): Promise<ExpenseDto> {
  const current = await prisma.expense.findUniqueOrThrow({ where: { id } });
  if (current.status !== "EN_ATTENTE_APPROBATION") {
    throw new Error("Seule une dépense en attente d'approbation peut être approuvée.");
  }

  const journalEntry = await recordExpenseApprovalEntry({
    id: current.id,
    amount: Number(current.amount),
    date: current.date,
    expenseNumber: current.expenseNumber,
    categoryId: current.categoryId,
    paymentMethodId: current.paymentMethodId,
    approvedBy,
  });

  await prisma.expense.update({
    where: { id },
    data: { status: "APPROUVEE", approvedBy, approvedAt: new Date(), journalEntryId: journalEntry?.id ?? null },
  });
  return getExpenseById(id);
}

export async function rejectExpense(input: RejectExpenseInput): Promise<ExpenseDto> {
  const current = await prisma.expense.findUniqueOrThrow({ where: { id: input.id } });
  if (current.status !== "EN_ATTENTE_APPROBATION") {
    throw new Error("Seule une dépense en attente d'approbation peut être rejetée.");
  }
  await prisma.expense.update({ where: { id: input.id }, data: { status: "REJETEE", rejectedReason: input.reason } });
  return getExpenseById(input.id);
}

/** Annulation d'une dépense approuvée (MODULE-07 §1.6) : contre-passe l'écriture si elle existait, jamais de suppression. */
export async function cancelExpense(input: CancelExpenseInput, userId: string): Promise<ExpenseDto> {
  const current = await prisma.expense.findUniqueOrThrow({ where: { id: input.id } });
  if (current.status !== "APPROUVEE") {
    throw new Error("Seule une dépense approuvée peut être annulée.");
  }
  if (current.journalEntryId) {
    await cancelJournalEntry({ id: current.journalEntryId, reason: input.reason }, userId);
  }
  await prisma.expense.update({ where: { id: input.id }, data: { status: "ANNULEE" } });
  return getExpenseById(input.id);
}

export async function listExpenses(filter: ListExpensesInput): Promise<ListExpensesResult> {
  const where: Prisma.ExpenseWhereInput = {
    OR: filter.search
      ? [
          { expenseNumber: { contains: filter.search, mode: "insensitive" } },
          { label: { contains: filter.search, mode: "insensitive" } },
        ]
      : undefined,
    categoryId: filter.categoryId,
    supplierId: filter.supplierId,
    cashRegisterSessionId: filter.cashRegisterSessionId,
    status: filter.status,
    date: filter.dateFrom || filter.dateTo ? { gte: filter.dateFrom, lte: filter.dateTo } : undefined,
  };

  const [rows, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: EXPENSE_INCLUDE,
      orderBy: { [filter.sortBy]: filter.sortDirection },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
    }),
    prisma.expense.count({ where }),
  ]);

  return { items: rows.map(toExpenseDto), total, page: filter.page, pageSize: filter.pageSize };
}

export async function addExpenseDocument(input: AddExpenseDocumentInput, uploadedBy: string) {
  await prisma.expenseDocument.create({
    data: {
      expenseId: input.expenseId,
      documentType: input.documentType,
      filePath: input.filePath,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSizeBytes: input.fileSizeBytes,
      uploadedBy,
    },
  });
  return getExpenseById(input.expenseId);
}

export async function removeExpenseDocument(documentId: string): Promise<ExpenseDto> {
  const document = await prisma.expenseDocument.findUniqueOrThrow({ where: { id: documentId } });
  await prisma.expenseDocument.delete({ where: { id: documentId } });
  return getExpenseById(document.expenseId);
}

export { toExpenseDto, EXPENSE_INCLUDE };
