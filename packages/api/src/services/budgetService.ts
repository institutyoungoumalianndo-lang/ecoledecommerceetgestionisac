import { prisma } from "@isac-erp/db";
import type { BudgetDto, CreateBudgetInput, GetBudgetInput, UpdateBudgetLinesInput } from "@isac-erp/shared";

/** Écart prévisionnel/réalisé toujours calculé à la volée (MODULE-07 §1.9/§3 règle 6), jamais stocké. */
async function toBudgetDto(budget: { id: string; year: number; label: string | null }): Promise<BudgetDto> {
  const lines = await prisma.budgetLine.findMany({ where: { budgetId: budget.id }, include: { category: true } });

  const yearStart = new Date(budget.year, 0, 1);
  const yearEnd = new Date(budget.year + 1, 0, 1);
  const actualByCategory = await prisma.expense.groupBy({
    by: ["categoryId"],
    where: { status: "APPROUVEE", date: { gte: yearStart, lt: yearEnd } },
    _sum: { amount: true },
  });
  const actualByCategoryId = new Map(actualByCategory.map((a) => [a.categoryId, Number(a._sum.amount ?? 0)]));

  const lineDtos = lines.map((l) => {
    const allocated = Number(l.allocatedAmount);
    const actual = actualByCategoryId.get(l.categoryId) ?? 0;
    return {
      id: l.id,
      categoryId: l.categoryId,
      categoryName: l.category.name,
      allocatedAmount: allocated,
      actualAmount: actual,
      variance: allocated - actual,
    };
  });

  return {
    id: budget.id,
    year: budget.year,
    label: budget.label,
    lines: lineDtos,
    totalAllocated: lineDtos.reduce((sum, l) => sum + l.allocatedAmount, 0),
    totalActual: lineDtos.reduce((sum, l) => sum + l.actualAmount, 0),
    totalVariance: lineDtos.reduce((sum, l) => sum + l.variance, 0),
  };
}

export async function getBudget(input: GetBudgetInput): Promise<BudgetDto | null> {
  const budget = await prisma.budget.findUnique({ where: { year: input.year } });
  if (!budget) return null;
  return toBudgetDto(budget);
}

export async function listBudgets(): Promise<{ id: string; year: number; label: string | null }[]> {
  return prisma.budget.findMany({ orderBy: { year: "desc" }, select: { id: true, year: true, label: true } });
}

export async function createBudget(input: CreateBudgetInput): Promise<BudgetDto> {
  const budget = await prisma.budget.create({
    data: {
      year: input.year,
      label: input.label ?? null,
      lines: { create: input.lines.map((l) => ({ categoryId: l.categoryId, allocatedAmount: l.allocatedAmount })) },
    },
  });
  return toBudgetDto(budget);
}

export async function updateBudgetLines(input: UpdateBudgetLinesInput): Promise<BudgetDto> {
  const budget = await prisma.budget.findUniqueOrThrow({ where: { id: input.budgetId } });
  await prisma.$transaction(async (tx) => {
    await tx.budgetLine.deleteMany({ where: { budgetId: input.budgetId } });
    await tx.budgetLine.createMany({
      data: input.lines.map((l) => ({ budgetId: input.budgetId, categoryId: l.categoryId, allocatedAmount: l.allocatedAmount })),
    });
  });
  return toBudgetDto(budget);
}
