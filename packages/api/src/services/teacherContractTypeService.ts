import { prisma } from "@isac-erp/db";
import type {
  CreateTeacherContractTypeInput,
  TeacherContractTypeDto,
  UpdateTeacherContractTypeInput,
} from "@isac-erp/shared";

export async function listTeacherContractTypes(): Promise<TeacherContractTypeDto[]> {
  return prisma.teacherContractType.findMany({ orderBy: { label: "asc" } });
}

export async function createTeacherContractType(
  input: CreateTeacherContractTypeInput
): Promise<TeacherContractTypeDto> {
  return prisma.teacherContractType.create({ data: input });
}

export async function updateTeacherContractType(
  input: UpdateTeacherContractTypeInput
): Promise<TeacherContractTypeDto> {
  const { id, ...fields } = input;
  return prisma.teacherContractType.update({ where: { id }, data: fields });
}

export async function deactivateTeacherContractType(id: string): Promise<TeacherContractTypeDto> {
  return prisma.teacherContractType.update({ where: { id }, data: { isActive: false } });
}

export async function reactivateTeacherContractType(id: string): Promise<TeacherContractTypeDto> {
  return prisma.teacherContractType.update({ where: { id }, data: { isActive: true } });
}
