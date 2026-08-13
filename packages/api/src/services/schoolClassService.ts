import { prisma } from "@isac-erp/db";
import type {
  CreateSchoolClassInput,
  SchoolClassDto,
  UpdateSchoolClassInput,
} from "@isac-erp/shared";

export async function listSchoolClasses(academicYearId?: string): Promise<SchoolClassDto[]> {
  return prisma.class.findMany({
    where: academicYearId ? { academicYearId } : undefined,
    orderBy: { name: "asc" },
  });
}

export async function createSchoolClass(input: CreateSchoolClassInput): Promise<SchoolClassDto> {
  return prisma.class.create({
    data: {
      code: input.code,
      name: input.name,
      filiereId: input.filiereId,
      levelId: input.levelId,
      academicYearId: input.academicYearId,
      maxCapacity: input.maxCapacity ?? null,
      mainRoom: input.mainRoom ?? null,
    },
  });
}

export async function updateSchoolClass(input: UpdateSchoolClassInput): Promise<SchoolClassDto> {
  const { id, ...fields } = input;
  return prisma.class.update({ where: { id }, data: fields });
}

export async function deactivateSchoolClass(id: string): Promise<SchoolClassDto> {
  return prisma.class.update({ where: { id }, data: { isActive: false } });
}

export async function reactivateSchoolClass(id: string): Promise<SchoolClassDto> {
  return prisma.class.update({ where: { id }, data: { isActive: true } });
}
