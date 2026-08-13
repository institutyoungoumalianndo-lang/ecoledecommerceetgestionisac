import { prisma } from "@isac-erp/db";
import type {
  CreateDigitalDocumentCategoryInput,
  DigitalDocumentCategoryDto,
  UpdateDigitalDocumentCategoryInput,
} from "@isac-erp/shared";

/** Référentiel de catégories de documents numériques — voir MODULE-13 §5.1/§5.3, distinct de `BookCategory`. */
export async function listDigitalDocumentCategories(activeOnly?: boolean): Promise<DigitalDocumentCategoryDto[]> {
  return prisma.digitalDocumentCategory.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { name: "asc" },
  });
}

export async function createDigitalDocumentCategory(
  input: CreateDigitalDocumentCategoryInput
): Promise<DigitalDocumentCategoryDto> {
  return prisma.digitalDocumentCategory.create({ data: { name: input.name } });
}

export async function updateDigitalDocumentCategory(
  input: UpdateDigitalDocumentCategoryInput
): Promise<DigitalDocumentCategoryDto> {
  return prisma.digitalDocumentCategory.update({
    where: { id: input.id },
    data: { name: input.name, isActive: input.isActive },
  });
}
