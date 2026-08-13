import { prisma, type Prisma } from "@isac-erp/db";
import type { CreateExpenseCategoryInput, ExpenseCategoryDto, UpdateExpenseCategoryInput } from "@isac-erp/shared";

const CATEGORY_INCLUDE = { defaultAccount: true } satisfies Prisma.ExpenseCategoryInclude;
type CategoryWithRelations = Prisma.ExpenseCategoryGetPayload<{ include: typeof CATEGORY_INCLUDE }>;

function toDto(row: CategoryWithRelations): ExpenseCategoryDto {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    defaultAccountId: row.defaultAccountId,
    defaultAccountLabel: row.defaultAccount ? `${row.defaultAccount.code} — ${row.defaultAccount.label}` : null,
    isActive: row.isActive,
  };
}

export async function listExpenseCategories(): Promise<ExpenseCategoryDto[]> {
  const rows = await prisma.expenseCategory.findMany({ orderBy: { name: "asc" }, include: CATEGORY_INCLUDE });
  return rows.map(toDto);
}

export async function createExpenseCategory(input: CreateExpenseCategoryInput): Promise<ExpenseCategoryDto> {
  const row = await prisma.expenseCategory.create({
    data: { code: input.code, name: input.name, defaultAccountId: input.defaultAccountId ?? null },
    include: CATEGORY_INCLUDE,
  });
  return toDto(row);
}

export async function updateExpenseCategory(input: UpdateExpenseCategoryInput): Promise<ExpenseCategoryDto> {
  const { id, ...fields } = input;
  const row = await prisma.expenseCategory.update({ where: { id }, data: fields, include: CATEGORY_INCLUDE });
  return toDto(row);
}

export async function deactivateExpenseCategory(id: string): Promise<ExpenseCategoryDto> {
  const row = await prisma.expenseCategory.update({ where: { id }, data: { isActive: false }, include: CATEGORY_INCLUDE });
  return toDto(row);
}
