import { prisma } from "@isac-erp/db";
import type { CreateTeachingUnitInput, TeachingUnitDto, UpdateTeachingUnitInput } from "@isac-erp/shared";

function fullName(user: { firstName: string; lastName: string } | null): string | null {
  return user ? `${user.firstName} ${user.lastName}` : null;
}

/** Total des crédits et nombre de matières toujours calculés depuis les subject_offerings actives, jamais stockés (MODULE-02.1 §1.3). */
async function toDto(row: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  responsibleUserId: string | null;
  responsibleUser: { firstName: string; lastName: string } | null;
  isActive: boolean;
}): Promise<TeachingUnitDto> {
  const offerings = await prisma.subjectOffering.findMany({
    where: { teachingUnitId: row.id, isActive: true },
    include: { subject: true },
  });
  const distinctSubjects = new Map(offerings.map((o) => [o.subjectId, o.subject]));

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    responsibleUserId: row.responsibleUserId,
    responsibleUserName: fullName(row.responsibleUser),
    totalCredits: [...distinctSubjects.values()].reduce((sum: number, s: { credits: unknown }) => sum + (s.credits ? Number(s.credits) : 0), 0),
    subjectCount: distinctSubjects.size,
    isActive: row.isActive,
  };
}

export async function listTeachingUnits(): Promise<TeachingUnitDto[]> {
  const rows = await prisma.teachingUnit.findMany({ orderBy: { name: "asc" }, include: { responsibleUser: true } });
  return Promise.all(rows.map(toDto));
}

export async function getTeachingUnitById(id: string): Promise<TeachingUnitDto> {
  const row = await prisma.teachingUnit.findUniqueOrThrow({ where: { id }, include: { responsibleUser: true } });
  return toDto(row);
}

export async function createTeachingUnit(input: CreateTeachingUnitInput): Promise<TeachingUnitDto> {
  const row = await prisma.teachingUnit.create({
    data: {
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      responsibleUserId: input.responsibleUserId ?? null,
    },
    include: { responsibleUser: true },
  });
  return toDto(row);
}

export async function updateTeachingUnit(input: UpdateTeachingUnitInput): Promise<TeachingUnitDto> {
  const { id, ...fields } = input;
  const row = await prisma.teachingUnit.update({ where: { id }, data: fields, include: { responsibleUser: true } });
  return toDto(row);
}

export async function deactivateTeachingUnit(id: string): Promise<TeachingUnitDto> {
  const row = await prisma.teachingUnit.update({ where: { id }, data: { isActive: false }, include: { responsibleUser: true } });
  return toDto(row);
}
