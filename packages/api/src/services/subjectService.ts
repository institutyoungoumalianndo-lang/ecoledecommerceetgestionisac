import { prisma, type Prisma } from "@isac-erp/db";
import type { CreateSubjectInput, ListSubjectsInput, SubjectDto, UpdateSubjectInput } from "@isac-erp/shared";

function toDto(row: { id: string; code: string; name: string; description: string | null; credits: Prisma.Decimal | null; isActive: boolean }): SubjectDto {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    credits: row.credits ? Number(row.credits) : null,
    isActive: row.isActive,
  };
}

export async function listSubjects(filter: ListSubjectsInput): Promise<SubjectDto[]> {
  const rows = await prisma.subject.findMany({
    where: {
      isActive: filter.includeInactive ? undefined : true,
      OR: filter.search
        ? [
            { code: { contains: filter.search, mode: "insensitive" } },
            { name: { contains: filter.search, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: { name: "asc" },
  });
  return rows.map(toDto);
}

export async function getSubjectById(id: string): Promise<SubjectDto> {
  const row = await prisma.subject.findUniqueOrThrow({ where: { id } });
  return toDto(row);
}

export async function createSubject(input: CreateSubjectInput): Promise<SubjectDto> {
  const row = await prisma.subject.create({
    data: { code: input.code, name: input.name, description: input.description ?? null, credits: input.credits ?? null },
  });
  return toDto(row);
}

export async function updateSubject(input: UpdateSubjectInput): Promise<SubjectDto> {
  const { id, ...fields } = input;
  const row = await prisma.subject.update({ where: { id }, data: fields });
  return toDto(row);
}

export async function deactivateSubject(id: string): Promise<SubjectDto> {
  const row = await prisma.subject.update({ where: { id }, data: { isActive: false } });
  return toDto(row);
}

export async function reactivateSubject(id: string): Promise<SubjectDto> {
  const row = await prisma.subject.update({ where: { id }, data: { isActive: true } });
  return toDto(row);
}
