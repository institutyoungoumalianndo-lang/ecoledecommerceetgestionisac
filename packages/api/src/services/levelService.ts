import { prisma } from "@isac-erp/db";
import type { CreateLevelInput, LevelDto, UpdateLevelInput } from "@isac-erp/shared";

export async function listLevels(): Promise<LevelDto[]> {
  return prisma.level.findMany({ orderBy: { orderIndex: "asc" } });
}

export async function createLevel(input: CreateLevelInput): Promise<LevelDto> {
  return prisma.level.create({ data: input });
}

export async function updateLevel(input: UpdateLevelInput): Promise<LevelDto> {
  const { id, ...fields } = input;
  return prisma.level.update({ where: { id }, data: fields });
}

export async function deactivateLevel(id: string): Promise<LevelDto> {
  const classCount = await prisma.class.count({ where: { levelId: id, isActive: true } });
  if (classCount > 0) {
    throw new Error(
      "Ce niveau possède encore des classes actives — désactivez-les avant de désactiver le niveau."
    );
  }
  return prisma.level.update({ where: { id }, data: { isActive: false } });
}

export async function reactivateLevel(id: string): Promise<LevelDto> {
  return prisma.level.update({ where: { id }, data: { isActive: true } });
}
