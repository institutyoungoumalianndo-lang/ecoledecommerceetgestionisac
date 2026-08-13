import { prisma } from "@isac-erp/db";
import type { GenerateDocumentInput } from "@isac-erp/shared";
import { resolveUploadPath, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "CARTE_ETUDIANT" }>;

/** Carte d'étudiant (MODULE-09 §1) : archétype "carte compacte avec photo", format réduit centré en haut de page. */
export async function generateCarteEtudiant(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const student = await prisma.student.findUniqueOrThrow({ where: { id: input.studentId } });
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId: input.studentId, cancelledAt: null },
    orderBy: { enrollmentDate: "desc" },
    include: { academicYear: true, class: true, filiere: true },
  });

  const fullName = `${student.firstName} ${student.lastName}`;
  const cardWidth = 260;
  const cardHeight = 160;
  const cardX = (doc.page.width - cardWidth) / 2;
  const cardY = doc.y + 10;

  doc
    .roundedRect(cardX, cardY, cardWidth, cardHeight, 8)
    .lineWidth(ctx.printTheme.borderWidthPt)
    .stroke(ctx.printTheme.borderColor);

  const photo = resolveUploadPath(student.photoPath);
  const photoSize = 70;
  if (photo) {
    doc.image(photo, cardX + 12, cardY + 12, { fit: [photoSize, photoSize] });
  } else {
    doc.rect(cardX + 12, cardY + 12, photoSize, photoSize).stroke(ctx.printTheme.borderColor);
    doc.fontSize(7).fillColor(ctx.printTheme.secondaryTextColor).text("Photo", cardX + 12, cardY + 42, {
      width: photoSize,
      align: "center",
    });
  }

  const textX = cardX + 12 + photoSize + 12;
  const textWidth = cardWidth - photoSize - 36;
  doc.font("Helvetica-Bold").fontSize(11).fillColor(ctx.printTheme.titleColor).text("CARTE D'ÉTUDIANT", textX, cardY + 12, {
    width: textWidth,
  });
  doc.font("Helvetica").fontSize(9).fillColor(ctx.printTheme.primaryTextColor);
  doc.text(fullName, textX, cardY + 34, { width: textWidth });
  doc.fontSize(8).fillColor(ctx.printTheme.secondaryTextColor);
  doc.text(`Matricule : ${student.matricule}`, textX, cardY + 52, { width: textWidth });
  if (enrollment) {
    doc.text(`${enrollment.class.name} — ${enrollment.filiere.name}`, textX, cardY + 66, { width: textWidth });
    doc.text(`Année : ${enrollment.academicYear.label}`, textX, cardY + 80, { width: textWidth });
  }
  doc.text(`Campus : ${ctx.campus.name}`, textX, cardY + 94, { width: textWidth });

  doc.y = cardY + cardHeight + 20;

  return {
    relatedEntityType: "Student",
    relatedEntityId: student.id,
    relatedEntityLabel: fullName,
    qrFields: {
      matricule: student.matricule,
      nomComplet: fullName,
      anneeUniversitaire: enrollment?.academicYear.label ?? "",
    },
  };
}
