import { prisma } from "@isac-erp/db";
import type {
  CreateTeacherLeaveInput,
  CreateTeacherWeeklyAvailabilityInput,
  TeacherLeaveDto,
  TeacherWeeklyAvailabilityDto,
} from "@isac-erp/shared";

export async function listTeacherWeeklyAvailability(teacherId: string): Promise<TeacherWeeklyAvailabilityDto[]> {
  return prisma.teacherWeeklyAvailability.findMany({
    where: { teacherId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

export async function createTeacherWeeklyAvailability(
  input: CreateTeacherWeeklyAvailabilityInput
): Promise<TeacherWeeklyAvailabilityDto> {
  if (input.endTime <= input.startTime) {
    throw new Error("L'heure de fin doit être postérieure à l'heure de début.");
  }
  return prisma.teacherWeeklyAvailability.create({ data: input });
}

export async function deleteTeacherWeeklyAvailability(id: string): Promise<void> {
  await prisma.teacherWeeklyAvailability.delete({ where: { id } });
}

export async function listTeacherLeaves(teacherId: string): Promise<TeacherLeaveDto[]> {
  return prisma.teacherLeave.findMany({ where: { teacherId }, orderBy: { startDate: "desc" } });
}

export async function createTeacherLeave(input: CreateTeacherLeaveInput): Promise<TeacherLeaveDto> {
  if (input.endDate < input.startDate) {
    throw new Error("La date de fin doit être postérieure ou égale à la date de début.");
  }
  return prisma.teacherLeave.create({ data: { ...input, reason: input.reason ?? null } });
}

export async function deleteTeacherLeave(id: string): Promise<void> {
  await prisma.teacherLeave.delete({ where: { id } });
}
