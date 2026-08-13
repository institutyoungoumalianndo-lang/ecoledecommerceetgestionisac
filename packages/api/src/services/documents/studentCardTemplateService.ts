import { prisma } from "@isac-erp/db";
import type { StudentCardTemplateDto, UpdateStudentCardTemplateInput } from "@isac-erp/shared";

/** Gabarit de la carte d'étudiant — singleton (MODULE-09.1 §2/§6 point 3 : mise en page fixe, seul le contenu est personnalisable). */
async function getOrCreateRow() {
  const existing = await prisma.studentCardTemplate.findFirst();
  if (existing) return existing;
  return prisma.studentCardTemplate.create({ data: {} });
}

export async function getStudentCardTemplate(): Promise<StudentCardTemplateDto> {
  return getOrCreateRow();
}

export async function updateStudentCardTemplate(
  input: UpdateStudentCardTemplateInput
): Promise<{ before: StudentCardTemplateDto; after: StudentCardTemplateDto }> {
  const before = await getOrCreateRow();
  const after = await prisma.studentCardTemplate.update({ where: { id: before.id }, data: input });
  return { before, after };
}
