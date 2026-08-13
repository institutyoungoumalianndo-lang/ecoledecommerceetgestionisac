import { prisma } from "@isac-erp/db";
import type { GenerateDocumentInput } from "@isac-erp/shared";
import { drawTable, formatAmount, formatDateFr, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "HISTORIQUE_PAIEMENTS" }>;

/** Historique des paiements (MODULE-09 §1 — documents étudiants) : relevé des paiements validés d'un étudiant. */
export async function generateHistoriquePaiements(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const student = await prisma.student.findUniqueOrThrow({ where: { id: input.studentId } });
  const payments = await prisma.payment.findMany({
    where: { studentId: input.studentId, academicYearId: input.academicYearId, status: "VALIDE" },
    include: { academicYear: true, paymentMethod: true },
    orderBy: { createdAt: "asc" },
  });

  const fullName = `${student.firstName} ${student.lastName}`;
  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.fontSize(12).fillColor(ctx.printTheme.primaryTextColor);
  doc.text(`Étudiant : ${fullName} (Matricule ${student.matricule})`, x, doc.y, { width });
  doc
    .fontSize(10)
    .fillColor(ctx.printTheme.secondaryTextColor)
    .text(`${payments.length} paiement(s) — Total : ${formatAmount(total)} GNF.`, x, doc.y, { width });
  doc.moveDown(0.75);

  drawTable(
    doc,
    ctx,
    [
      { label: "N° reçu", width: 100 },
      { label: "Date", width: 80 },
      { label: "Mode", width: 90 },
      { label: "Année universitaire", width: 100 },
      { label: "Montant (GNF)", width: 100 },
    ],
    payments.map((p) => [
      p.receiptNumber,
      formatDateFr(p.createdAt),
      p.paymentMethod.label,
      p.academicYear.label,
      formatAmount(Number(p.amount)),
    ])
  );

  return {
    relatedEntityType: "Student",
    relatedEntityId: student.id,
    relatedEntityLabel: fullName,
    qrFields: { matricule: student.matricule, nomComplet: fullName },
  };
}
