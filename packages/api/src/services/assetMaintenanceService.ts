import { prisma } from "@isac-erp/db";
import type { AssetMaintenanceDto, CreateAssetMaintenanceInput, UpdateAssetMaintenanceInput } from "@isac-erp/shared";

/** Historique de maintenance/réparations d'un bien, avec coûts — voir MODULE-14 §1.3. Indépendant de
 * la comptabilité : `performedBy` est un texte libre, jamais un `Supplier` du Module 7. */
function toAssetMaintenanceDto(row: {
  id: string;
  description: string;
  cost: unknown;
  performedBy: string | null;
  status: "PLANIFIEE" | "TERMINEE";
  scheduledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  createdByUser: { firstName: string; lastName: string } | null;
}): AssetMaintenanceDto {
  return {
    id: row.id,
    description: row.description,
    cost: row.cost ? Number(row.cost) : null,
    performedBy: row.performedBy,
    status: row.status,
    scheduledAt: row.scheduledAt,
    completedAt: row.completedAt,
    createdByName: row.createdByUser ? `${row.createdByUser.firstName} ${row.createdByUser.lastName}` : null,
    createdAt: row.createdAt,
  };
}

export async function listAssetMaintenances(assetId: string): Promise<AssetMaintenanceDto[]> {
  const rows = await prisma.assetMaintenance.findMany({
    where: { assetId },
    include: { createdByUser: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toAssetMaintenanceDto);
}

export async function createAssetMaintenance(input: CreateAssetMaintenanceInput, actorUserId: string): Promise<AssetMaintenanceDto> {
  const row = await prisma.assetMaintenance.create({
    data: {
      assetId: input.assetId,
      description: input.description,
      cost: input.cost ?? null,
      performedBy: input.performedBy ?? null,
      status: input.status,
      scheduledAt: input.scheduledAt ?? null,
      completedAt: input.completedAt ?? null,
      createdBy: actorUserId,
    },
    include: { createdByUser: true },
  });
  return toAssetMaintenanceDto(row);
}

export async function updateAssetMaintenance(input: UpdateAssetMaintenanceInput): Promise<AssetMaintenanceDto> {
  const row = await prisma.assetMaintenance.update({
    where: { id: input.id },
    data: {
      description: input.description,
      cost: input.cost === undefined ? undefined : input.cost,
      performedBy: input.performedBy === undefined ? undefined : input.performedBy,
      status: input.status,
      scheduledAt: input.scheduledAt === undefined ? undefined : input.scheduledAt,
      completedAt: input.completedAt === undefined ? undefined : input.completedAt,
    },
    include: { createdByUser: true },
  });
  return toAssetMaintenanceDto(row);
}
