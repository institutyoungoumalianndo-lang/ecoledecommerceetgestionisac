import { prisma } from "@isac-erp/db";
import type { CreateTeacherDocumentInput, TeacherDocumentDto } from "@isac-erp/shared";

export async function listTeacherDocuments(teacherId: string): Promise<TeacherDocumentDto[]> {
  return prisma.teacherDocument.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTeacherDocument(
  input: CreateTeacherDocumentInput,
  uploadedBy: string
): Promise<TeacherDocumentDto> {
  return prisma.teacherDocument.create({ data: { ...input, uploadedBy } });
}

export async function deleteTeacherDocument(id: string): Promise<void> {
  await prisma.teacherDocument.delete({ where: { id } });
}
