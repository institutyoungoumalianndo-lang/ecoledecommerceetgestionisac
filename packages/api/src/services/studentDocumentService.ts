import { prisma } from "@isac-erp/db";
import type {
  CreateStudentDocumentInput,
  ReplaceStudentDocumentInput,
  StudentDocumentDto,
} from "@isac-erp/shared";

export async function listStudentDocuments(studentId: string): Promise<StudentDocumentDto[]> {
  return prisma.studentDocument.findMany({
    where: { studentId },
    orderBy: { uploadedAt: "desc" },
  });
}

export async function createStudentDocument(
  input: CreateStudentDocumentInput,
  uploadedBy: string
): Promise<StudentDocumentDto> {
  return prisma.studentDocument.create({ data: { ...input, uploadedBy } });
}

/** Remplace le fichier d'un document existant (MODULE-04 §3.5) — pas de conservation de versions. */
export async function replaceStudentDocument(
  input: ReplaceStudentDocumentInput,
  uploadedBy: string
): Promise<StudentDocumentDto> {
  const { id, ...fields } = input;
  return prisma.studentDocument.update({
    where: { id },
    data: { ...fields, uploadedAt: new Date(), uploadedBy },
  });
}

export async function deleteStudentDocument(id: string): Promise<void> {
  await prisma.studentDocument.delete({ where: { id } });
}
