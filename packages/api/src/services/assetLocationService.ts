import { prisma } from "@isac-erp/db";
import type { AssetLocationDto, CreateAssetLocationInput, UpdateAssetLocationInput } from "@isac-erp/shared";

/** Référentiel de lieux dédié à l'inventaire — voir MODULE-14 §1.1/§3, distinct de `Room` (Module 5.2). */
export async function listAssetLocations(activeOnly?: boolean): Promise<AssetLocationDto[]> {
  return prisma.assetLocation.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ building: "asc" }, { floor: "asc" }, { label: "asc" }],
  });
}

export async function createAssetLocation(input: CreateAssetLocationInput): Promise<AssetLocationDto> {
  return prisma.assetLocation.create({
    data: { building: input.building, floor: input.floor ?? null, label: input.label },
  });
}

export async function updateAssetLocation(input: UpdateAssetLocationInput): Promise<AssetLocationDto> {
  return prisma.assetLocation.update({
    where: { id: input.id },
    data: {
      building: input.building,
      floor: input.floor === undefined ? undefined : input.floor,
      label: input.label,
      isActive: input.isActive,
    },
  });
}
