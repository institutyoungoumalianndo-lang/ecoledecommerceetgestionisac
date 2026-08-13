import { prisma, type Prisma } from "@isac-erp/db";
import type { CreateDigitalDocumentInput, DigitalDocumentDto, ListDigitalDocumentsInput } from "@isac-erp/shared";

const documentInclude = {
  category: true,
  uploadedByUser: true,
} satisfies Prisma.DigitalDocumentInclude;

type DocumentWithRelations = Prisma.DigitalDocumentGetPayload<{ include: typeof documentInclude }>;

function toDto(doc: DocumentWithRelations): DigitalDocumentDto {
  return {
    id: doc.id,
    title: doc.title,
    categoryId: doc.categoryId,
    categoryName: doc.category.name,
    filePath: doc.filePath,
    fileFormat: doc.fileFormat,
    fileSizeBytes: doc.fileSizeBytes,
    description: doc.description,
    uploadedByName: doc.uploadedByUser ? `${doc.uploadedByUser.firstName} ${doc.uploadedByUser.lastName}` : null,
    createdAt: doc.createdAt,
  };
}

/** Registre de documents numériques (MODULE-13 §5.1) — le fichier est déjà stocké (upload REST
 * préalable, ADR-012) ; cette fonction ne fait que persister les métadonnées. */
export async function listDigitalDocuments(input: ListDigitalDocumentsInput): Promise<DigitalDocumentDto[]> {
  const where: Prisma.DigitalDocumentWhereInput = {
    categoryId: input.categoryId,
    ...(input.search ? { title: { contains: input.search, mode: "insensitive" } } : {}),
  };
  const documents = await prisma.digitalDocument.findMany({ where, include: documentInclude, orderBy: { createdAt: "desc" } });
  return documents.map(toDto);
}

export async function createDigitalDocument(input: CreateDigitalDocumentInput, actorUserId: string): Promise<DigitalDocumentDto> {
  const doc = await prisma.digitalDocument.create({
    data: {
      title: input.title,
      categoryId: input.categoryId,
      filePath: input.filePath,
      fileFormat: input.fileFormat,
      fileSizeBytes: input.fileSizeBytes,
      description: input.description ?? null,
      uploadedBy: actorUserId,
    },
    include: documentInclude,
  });
  return toDto(doc);
}

/** Suppression réelle — un document numérique est un fichier importé, pas une donnée métier
 * historique (même principe que `StudentDocument`, jamais celui des paiements/étudiants). */
export async function deleteDigitalDocument(id: string): Promise<void> {
  await prisma.digitalDocument.delete({ where: { id } });
}
