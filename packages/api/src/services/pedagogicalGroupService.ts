import { prisma, type Prisma } from "@isac-erp/db";
import type {
  CreatePedagogicalGroupInput,
  ListPedagogicalGroupsInput,
  PedagogicalGroupDto,
  UpdatePedagogicalGroupInput,
} from "@isac-erp/shared";

const GROUP_INCLUDE = {
  classes: { include: { class: true }, orderBy: { class: { name: "asc" as const } } },
} satisfies Prisma.PedagogicalGroupInclude;

type GroupWithRelations = Prisma.PedagogicalGroupGetPayload<{ include: typeof GROUP_INCLUDE }>;

function toGroupDto(row: GroupWithRelations): PedagogicalGroupDto {
  return {
    id: row.id,
    label: row.label,
    isActive: row.isActive,
    classIds: row.classes.map((c) => c.classId),
    classNames: row.classes.map((c) => c.class.name),
  };
}

/**
 * Groupe pédagogique — raccourci de saisie pour les cours mutualisés/tronc commun (voir
 * MODULE-05.2 §1.6). Préremplit les classes d'une séance, ne les contraint jamais après création.
 */
export async function listPedagogicalGroups(input: ListPedagogicalGroupsInput): Promise<PedagogicalGroupDto[]> {
  const rows = await prisma.pedagogicalGroup.findMany({
    where: input.activeOnly ? { isActive: true } : undefined,
    include: GROUP_INCLUDE,
    orderBy: { label: "asc" },
  });
  return rows.map(toGroupDto);
}

export async function createPedagogicalGroup(input: CreatePedagogicalGroupInput): Promise<PedagogicalGroupDto> {
  const row = await prisma.pedagogicalGroup.create({
    data: {
      label: input.label,
      classes: { create: input.classIds.map((classId) => ({ classId })) },
    },
    include: GROUP_INCLUDE,
  });
  return toGroupDto(row);
}

export async function updatePedagogicalGroup(input: UpdatePedagogicalGroupInput): Promise<PedagogicalGroupDto> {
  const row = await prisma.$transaction(async (tx) => {
    if (input.classIds) {
      await tx.pedagogicalGroupClass.deleteMany({ where: { pedagogicalGroupId: input.id } });
      await tx.pedagogicalGroupClass.createMany({
        data: input.classIds.map((classId) => ({ pedagogicalGroupId: input.id, classId })),
      });
    }
    return tx.pedagogicalGroup.update({
      where: { id: input.id },
      data: { label: input.label, isActive: input.isActive },
      include: GROUP_INCLUDE,
    });
  });
  return toGroupDto(row);
}

/** Jamais supprimé physiquement — des modèles de récurrence peuvent référencer ce groupe. */
export async function deactivatePedagogicalGroup(id: string): Promise<PedagogicalGroupDto> {
  const row = await prisma.pedagogicalGroup.update({
    where: { id },
    data: { isActive: false },
    include: GROUP_INCLUDE,
  });
  return toGroupDto(row);
}

export async function reactivatePedagogicalGroup(id: string): Promise<PedagogicalGroupDto> {
  const row = await prisma.pedagogicalGroup.update({
    where: { id },
    data: { isActive: true },
    include: GROUP_INCLUDE,
  });
  return toGroupDto(row);
}
