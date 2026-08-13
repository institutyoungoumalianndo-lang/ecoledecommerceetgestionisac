import { prisma } from "@isac-erp/db";
import type {
  CreateTeacherTrainingInput,
  TeacherTrainingDto,
  UpdateTeacherTrainingInput,
} from "@isac-erp/shared";

export async function listTeacherTrainings(teacherId: string): Promise<TeacherTrainingDto[]> {
  return prisma.teacherTraining.findMany({ where: { teacherId }, orderBy: { startDate: "desc" } });
}

export async function createTeacherTraining(input: CreateTeacherTrainingInput): Promise<TeacherTrainingDto> {
  return prisma.teacherTraining.create({
    data: {
      ...input,
      institution: input.institution ?? null,
      endDate: input.endDate ?? null,
      certificatePath: input.certificatePath ?? null,
    },
  });
}

export async function updateTeacherTraining(input: UpdateTeacherTrainingInput): Promise<TeacherTrainingDto> {
  const { id, ...fields } = input;
  return prisma.teacherTraining.update({ where: { id }, data: fields });
}

export async function deleteTeacherTraining(id: string): Promise<void> {
  await prisma.teacherTraining.delete({ where: { id } });
}
