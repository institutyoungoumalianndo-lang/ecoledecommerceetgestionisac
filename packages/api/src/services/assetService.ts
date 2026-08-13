import { prisma, type Prisma } from "@isac-erp/db";
import type { AssetDto, AssetMovementDto, CreateAssetInput, ListAssetsInput, ReformAssetInput, UpdateAssetInput } from "@isac-erp/shared";
import { generateAssetInventoryNumber } from "./matriculeService.js";

const assetInclude = {
  category: true,
  location: true,
  responsibleEmployee: { include: { teacher: true } },
  responsibleTeacher: true,
} satisfies Prisma.AssetInclude;

type AssetWithRelations = Prisma.AssetGetPayload<{ include: typeof assetInclude }>;

export function formatLocationLabel(location: { building: string; floor: string | null; label: string } | null): string | null {
  if (!location) return null;
  return [location.building, location.floor, location.label].filter(Boolean).join(" / ");
}

/** Nom du responsable — un employé administratif pur porte sa propre identité ; un enseignant payé
 * (via Employee.teacherId) ou un enseignant non payé (via responsibleTeacherId direct) est lu depuis
 * `teachers`, jamais recopié (même principe que documentEngineService.ts). */
export function resolveResponsibleName(asset: AssetWithRelations): string | null {
  if (asset.responsibleEmployee) {
    const source = asset.responsibleEmployee.teacher ?? asset.responsibleEmployee;
    return `${source.firstName ?? ""} ${source.lastName ?? ""}`.trim() || null;
  }
  if (asset.responsibleTeacher) {
    return `${asset.responsibleTeacher.firstName} ${asset.responsibleTeacher.lastName}`.trim() || null;
  }
  return null;
}

function toAssetDto(asset: AssetWithRelations): AssetDto {
  return {
    id: asset.id,
    inventoryNumber: asset.inventoryNumber,
    label: asset.label,
    description: asset.description,
    photoPath: asset.photoPath,
    categoryId: asset.categoryId,
    categoryName: asset.category.name,
    locationId: asset.locationId,
    locationLabel: formatLocationLabel(asset.location),
    responsibleEmployeeId: asset.responsibleEmployeeId,
    responsibleTeacherId: asset.responsibleTeacherId,
    responsibleName: resolveResponsibleName(asset),
    condition: asset.condition,
    status: asset.status,
    acquisitionValue: asset.acquisitionValue ? Number(asset.acquisitionValue) : null,
    acquisitionDate: asset.acquisitionDate,
    reformJustification: asset.reformJustification,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

export function requireSingleResponsible(employeeId?: string | null, teacherId?: string | null): void {
  if (employeeId && teacherId) {
    throw new Error("Un bien ne peut avoir qu'un seul responsable — employé ou enseignant, pas les deux.");
  }
}

export async function listAssets(input: ListAssetsInput): Promise<AssetDto[]> {
  const where: Prisma.AssetWhereInput = {
    categoryId: input.categoryId,
    locationId: input.locationId,
    status: input.status,
    ...(input.search
      ? {
          OR: [
            { label: { contains: input.search, mode: "insensitive" } },
            { inventoryNumber: { contains: input.search, mode: "insensitive" } },
            { description: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const assets = await prisma.asset.findMany({ where, include: assetInclude, orderBy: { createdAt: "desc" } });
  return assets.map(toAssetDto);
}

export async function getAsset(id: string): Promise<AssetDto> {
  const asset = await prisma.asset.findUniqueOrThrow({ where: { id }, include: assetInclude });
  return toAssetDto(asset);
}

export async function createAsset(input: CreateAssetInput): Promise<AssetDto> {
  requireSingleResponsible(input.responsibleEmployeeId, input.responsibleTeacherId);
  const asset = await prisma.$transaction(async (tx) => {
    const inventoryNumber = await generateAssetInventoryNumber(tx);
    return tx.asset.create({
      data: {
        inventoryNumber,
        label: input.label,
        description: input.description ?? null,
        photoPath: input.photoPath ?? null,
        categoryId: input.categoryId,
        locationId: input.locationId ?? null,
        responsibleEmployeeId: input.responsibleEmployeeId ?? null,
        responsibleTeacherId: input.responsibleTeacherId ?? null,
        condition: input.condition,
        acquisitionValue: input.acquisitionValue ?? null,
        acquisitionDate: input.acquisitionDate ?? null,
      },
      include: assetInclude,
    });
  });
  return toAssetDto(asset);
}

/** Toute modification de localisation/responsable/état génère une ligne d'historique (MODULE-14 §1.2). */
export async function updateAsset(input: UpdateAssetInput, actorUserId: string): Promise<AssetDto> {
  requireSingleResponsible(input.responsibleEmployeeId, input.responsibleTeacherId);

  const updated = await prisma.$transaction(async (tx) => {
    const before = await tx.asset.findUniqueOrThrow({ where: { id: input.id }, include: assetInclude });

    const after = await tx.asset.update({
      where: { id: input.id },
      data: {
        label: input.label,
        description: input.description === undefined ? undefined : input.description,
        photoPath: input.photoPath === undefined ? undefined : input.photoPath,
        categoryId: input.categoryId,
        locationId: input.locationId === undefined ? undefined : input.locationId,
        responsibleEmployeeId: input.responsibleEmployeeId === undefined ? undefined : input.responsibleEmployeeId,
        responsibleTeacherId: input.responsibleTeacherId === undefined ? undefined : input.responsibleTeacherId,
        condition: input.condition,
        acquisitionValue: input.acquisitionValue === undefined ? undefined : input.acquisitionValue,
        acquisitionDate: input.acquisitionDate === undefined ? undefined : input.acquisitionDate,
      },
      include: assetInclude,
    });

    const beforeLocation = formatLocationLabel(before.location);
    const afterLocation = formatLocationLabel(after.location);
    if (beforeLocation !== afterLocation) {
      await tx.assetMovement.create({
        data: { assetId: after.id, changedBy: actorUserId, field: "LOCALISATION", oldValue: beforeLocation, newValue: afterLocation },
      });
    }

    const beforeResponsible = resolveResponsibleName(before);
    const afterResponsible = resolveResponsibleName(after);
    if (beforeResponsible !== afterResponsible) {
      await tx.assetMovement.create({
        data: { assetId: after.id, changedBy: actorUserId, field: "RESPONSABLE", oldValue: beforeResponsible, newValue: afterResponsible },
      });
    }

    if (before.condition !== after.condition) {
      await tx.assetMovement.create({
        data: { assetId: after.id, changedBy: actorUserId, field: "ETAT", oldValue: before.condition, newValue: after.condition },
      });
    }

    return after;
  });

  return toAssetDto(updated);
}

/** Réforme/mise au rebut (MODULE-14 §1.4) — jamais une suppression physique : le statut change avec
 * justification obligatoire, tracée dans l'historique de mouvements. */
export async function reformAsset(input: ReformAssetInput, actorUserId: string): Promise<AssetDto> {
  const updated = await prisma.$transaction(async (tx) => {
    const before = await tx.asset.findUniqueOrThrow({ where: { id: input.id } });
    const after = await tx.asset.update({
      where: { id: input.id },
      data: { status: input.status, reformJustification: input.justification },
      include: assetInclude,
    });
    await tx.assetMovement.create({
      data: {
        assetId: after.id,
        changedBy: actorUserId,
        field: "STATUT",
        oldValue: before.status,
        newValue: after.status,
        note: input.justification,
      },
    });
    return after;
  });
  return toAssetDto(updated);
}

export async function listAssetMovements(assetId: string): Promise<AssetMovementDto[]> {
  const movements = await prisma.assetMovement.findMany({
    where: { assetId },
    include: { changedByUser: true },
    orderBy: { createdAt: "desc" },
  });
  return movements.map((m) => ({
    id: m.id,
    field: m.field,
    oldValue: m.oldValue,
    newValue: m.newValue,
    note: m.note,
    changedByName: m.changedByUser ? `${m.changedByUser.firstName} ${m.changedByUser.lastName}` : null,
    createdAt: m.createdAt,
  }));
}
