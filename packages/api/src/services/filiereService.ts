import { prisma } from "@isac-erp/db";
import type { CreateFiliereInput, FiliereDto, UpdateFiliereInput } from "@isac-erp/shared";

export async function listFilieres(): Promise<FiliereDto[]> {
  return prisma.filiere.findMany({ orderBy: { name: "asc" } });
}

export async function createFiliere(input: CreateFiliereInput): Promise<FiliereDto> {
  return prisma.filiere.create({
    data: {
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      responsableUserId: input.responsableUserId ?? null,
      duration: input.duration ?? null,
    },
  });
}

export async function updateFiliere(input: UpdateFiliereInput): Promise<FiliereDto> {
  const { id, ...fields } = input;
  return prisma.filiere.update({ where: { id }, data: fields });
}

/** Désactivation logique uniquement — voir principe non négociable n°2/n°6. */
export async function deactivateFiliere(id: string): Promise<FiliereDto> {
  const classCount = await prisma.class.count({ where: { filiereId: id, isActive: true } });
  if (classCount > 0) {
    throw new Error(
      "Cette filière possède encore des classes actives — désactivez-les avant de désactiver la filière."
    );
  }
  return prisma.filiere.update({ where: { id }, data: { isActive: false } });
}

export async function reactivateFiliere(id: string): Promise<FiliereDto> {
  return prisma.filiere.update({ where: { id }, data: { isActive: true } });
}
