import { prisma } from "@isac-erp/db";
import type { AssetCategoryDto, CreateAssetCategoryInput, UpdateAssetCategoryInput } from "@isac-erp/shared";

/** Référentiel configurable de catégories de biens — voir MODULE-14 §1.1, aucune valeur codée en dur. */
export async function listAssetCategories(activeOnly?: boolean): Promise<AssetCategoryDto[]> {
  return prisma.assetCategory.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { name: "asc" },
  });
}

export async function createAssetCategory(input: CreateAssetCategoryInput): Promise<AssetCategoryDto> {
  return prisma.assetCategory.create({ data: { name: input.name } });
}

export async function updateAssetCategory(input: UpdateAssetCategoryInput): Promise<AssetCategoryDto> {
  return prisma.assetCategory.update({
    where: { id: input.id },
    data: { name: input.name, isActive: input.isActive },
  });
}
