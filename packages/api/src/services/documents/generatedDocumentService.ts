import { prisma } from "@isac-erp/db";
import type { GeneratedDocumentDto, ListGeneratedDocumentsInput } from "@isac-erp/shared";
import { resolveRelatedEntityLabel, toGeneratedDocumentDto } from "./documentEngineService.js";

/**
 * Consultation de l'archive du moteur documentaire (MODULE-09 §1.7) : un document généré n'est jamais
 * modifié après coup — cette couche est strictement en lecture, la seule écriture est
 * `documentEngineService.generateDocument`.
 */

export async function listGeneratedDocuments(filter: ListGeneratedDocumentsInput): Promise<GeneratedDocumentDto[]> {
  const rows = await prisma.generatedDocument.findMany({
    where: {
      documentType: filter.documentType,
      relatedEntityType: filter.relatedEntityType,
      relatedEntityId: filter.relatedEntityId,
      documentNumber: filter.search ? { contains: filter.search, mode: "insensitive" } : undefined,
      generatedAt: {
        gte: filter.startDate,
        lte: filter.endDate,
      },
    },
    include: { generatedByUser: true },
    orderBy: { generatedAt: "desc" },
    take: 500,
  });

  return Promise.all(
    rows.map(async (row) => {
      const label = await resolveRelatedEntityLabel(row.relatedEntityType, row.relatedEntityId);
      const generatedByName = row.generatedByUser ? `${row.generatedByUser.firstName} ${row.generatedByUser.lastName}` : null;
      return toGeneratedDocumentDto(row, label, generatedByName);
    })
  );
}

export async function getGeneratedDocumentById(id: string): Promise<GeneratedDocumentDto> {
  const row = await prisma.generatedDocument.findUniqueOrThrow({ where: { id }, include: { generatedByUser: true } });
  const label = await resolveRelatedEntityLabel(row.relatedEntityType, row.relatedEntityId);
  const generatedByName = row.generatedByUser ? `${row.generatedByUser.firstName} ${row.generatedByUser.lastName}` : null;
  return toGeneratedDocumentDto(row, label, generatedByName);
}
