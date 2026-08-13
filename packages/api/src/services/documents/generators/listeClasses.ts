import { prisma } from "@isac-erp/db";
import type { GenerateDocumentInput } from "@isac-erp/shared";
import { drawTable, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "LISTE_CLASSES" }>;

/** Liste des classes (MODULE-09 §1 — documents administratifs), avec effectif inscrit par classe. */
export async function generateListeClasses(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const academicYear = await prisma.academicYear.findUniqueOrThrow({ where: { id: input.academicYearId } });
  const classes = await prisma.class.findMany({
    where: { academicYearId: input.academicYearId, isActive: true },
    include: { filiere: true, level: true, _count: { select: { enrollments: { where: { cancelledAt: null } } } } },
    orderBy: [{ filiere: { name: "asc" } }, { name: "asc" }],
  });

  doc.fontSize(10).fillColor(ctx.printTheme.secondaryTextColor).text(`Année universitaire ${academicYear.label} — ${classes.length} classe(s).`);
  doc.moveDown(0.75);

  drawTable(
    doc,
    ctx,
    [
      { label: "Classe", width: 110 },
      { label: "Filière", width: 140 },
      { label: "Niveau", width: 80 },
      { label: "Salle principale", width: 100 },
      { label: "Effectif", width: 60 },
    ],
    classes.map((c) => [c.name, c.filiere.name, c.level.label, c.mainRoom ?? "—", String(c._count.enrollments)])
  );

  return {
    relatedEntityType: "AcademicYear",
    relatedEntityId: academicYear.id,
    relatedEntityLabel: `Liste des classes — ${academicYear.label}`,
    qrFields: {},
  };
}
