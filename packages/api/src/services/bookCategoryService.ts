import { prisma } from "@isac-erp/db";
import type { BookCategoryDto, CreateBookCategoryInput, UpdateBookCategoryInput } from "@isac-erp/shared";

/** Référentiel configurable de catégories d'ouvrages — voir MODULE-13 §1.1, aucune valeur codée en dur. */
export async function listBookCategories(activeOnly?: boolean): Promise<BookCategoryDto[]> {
  return prisma.bookCategory.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { name: "asc" },
  });
}

export async function createBookCategory(input: CreateBookCategoryInput): Promise<BookCategoryDto> {
  return prisma.bookCategory.create({ data: { name: input.name } });
}

export async function updateBookCategory(input: UpdateBookCategoryInput): Promise<BookCategoryDto> {
  return prisma.bookCategory.update({
    where: { id: input.id },
    data: { name: input.name, isActive: input.isActive },
  });
}
