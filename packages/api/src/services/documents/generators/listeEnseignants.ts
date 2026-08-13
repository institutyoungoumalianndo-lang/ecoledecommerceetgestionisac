import { prisma } from "@isac-erp/db";
import type { GenerateDocumentInput } from "@isac-erp/shared";
import { drawTable, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "LISTE_ENSEIGNANTS" }>;

/** Liste des enseignants (MODULE-09 §1 — documents administratifs). */
export async function generateListeEnseignants(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const teachers = await prisma.teacher.findMany({
    where: { archivedAt: null, status: input.statusCode ? { code: input.statusCode } : undefined },
    include: { status: true, contractType: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  doc.fontSize(10).fillColor(ctx.printTheme.secondaryTextColor).text(`${teachers.length} enseignant(s).`);
  doc.moveDown(0.75);

  drawTable(
    doc,
    ctx,
    [
      { label: "Matricule", width: 75 },
      { label: "Nom et prénom", width: 150 },
      { label: "Spécialité", width: 110 },
      { label: "Statut", width: 75 },
      { label: "Téléphone", width: 80 },
    ],
    teachers.map((t) => [
      t.matricule,
      `${t.lastName} ${t.firstName}`,
      t.specialty ?? "—",
      t.status?.label ?? "—",
      t.phonePrimary ?? "—",
    ])
  );

  return {
    relatedEntityType: null,
    relatedEntityId: null,
    relatedEntityLabel: "Liste des enseignants",
    qrFields: {},
  };
}
