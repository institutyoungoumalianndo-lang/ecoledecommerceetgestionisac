import { prisma } from "@isac-erp/db";
import type { CreateTeacherStatusInput, TeacherStatusDto, UpdateTeacherStatusInput } from "@isac-erp/shared";

export async function listTeacherStatuses(): Promise<TeacherStatusDto[]> {
  return prisma.teacherStatus.findMany({ orderBy: { label: "asc" } });
}

export async function createTeacherStatus(input: CreateTeacherStatusInput): Promise<TeacherStatusDto> {
  return prisma.teacherStatus.create({ data: input });
}

export async function updateTeacherStatus(input: UpdateTeacherStatusInput): Promise<TeacherStatusDto> {
  const { id, ...fields } = input;
  return prisma.teacherStatus.update({ where: { id }, data: fields });
}

export async function deactivateTeacherStatus(id: string): Promise<TeacherStatusDto> {
  return prisma.teacherStatus.update({ where: { id }, data: { isActive: false } });
}

export async function reactivateTeacherStatus(id: string): Promise<TeacherStatusDto> {
  return prisma.teacherStatus.update({ where: { id }, data: { isActive: true } });
}
