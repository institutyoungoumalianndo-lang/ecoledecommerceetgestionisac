import { prisma } from "@isac-erp/db";
import type { GenerateDocumentInput } from "@isac-erp/shared";
import { getStudentFeeSummary, SCOLARITE_FEE_TYPE_CODE } from "../../feeSummaryService.js";
import { formatAmount, resolveUploadPath, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "RETARD_PAIEMENT" }>;

const HEADER_COLOR = "#2C3E50";
const ZEBRA_COLOR = "#F4F6F8";
const BORDER_COLOR = "#E1E5EA";
const INK = "#1E2430";

interface ArrearsStudentRow {
  photoPath: string | null;
  matricule: string;
  fullName: string;
  phone: string;
  amountDue: number;
}

/**
 * Retards de paiement (2026-08-09, retour du porteur du projet — "pas un résumé, je veux un document
 * listant les étudiants : photo, matricule, nom complet, téléphone, montant dû") : une ligne par
 * étudiant en retard, jamais une ligne par tranche — même gabarit "propre" (en-tête colorée, lignes
 * zébrées, colonne Photo) que `listeEtudiants.ts`, qui sert de référence visuelle pour tous les
 * documents de type liste. Un étudiant est en retard dès qu'au moins une échéance (`FeeInstallment`)
 * est dépassée et non soldée — même définition que le moteur d'alertes décisionnelles (Module 10, voir
 * `alertEngineService.ts`, métrique IMPAYES_EN_RETARD_MONTANT). "Montant dû" = somme de ses échéances
 * en retard uniquement (jamais son solde global, qui peut inclure des tranches pas encore échues).
 */
export async function generateRetardPaiement(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const [academicYear, filiere, level, enrollments] = await Promise.all([
    prisma.academicYear.findUniqueOrThrow({ where: { id: input.academicYearId } }),
    input.filiereId ? prisma.filiere.findUnique({ where: { id: input.filiereId } }) : null,
    input.levelId ? prisma.level.findUnique({ where: { id: input.levelId } }) : null,
    prisma.studentEnrollment.findMany({
      where: {
        academicYearId: input.academicYearId,
        cancelledAt: null,
        filiereId: input.filiereId,
        levelId: input.levelId,
        classId: input.classId,
      },
      include: { student: true },
      orderBy: [{ student: { lastName: "asc" } }],
    }),
  ]);

  const now = new Date();
  const rows: ArrearsStudentRow[] = [];

  for (const enrollment of enrollments) {
    const summary = await getStudentFeeSummary({ studentId: enrollment.studentId, academicYearId: input.academicYearId });
    let amountDue = 0;
    for (const line of summary.lines) {
      if (line.feeTypeCode !== SCOLARITE_FEE_TYPE_CODE) continue;
      for (const installment of line.installments) {
        if (installment.dueDate >= now || installment.remainingAmount <= 0) continue;
        if (input.installmentOrderIndex && installment.orderIndex !== input.installmentOrderIndex) continue;
        amountDue += installment.remainingAmount;
      }
    }
    if (amountDue <= 0) continue;

    rows.push({
      photoPath: resolveUploadPath(enrollment.student.photoPath),
      matricule: enrollment.student.matricule,
      fullName: `${enrollment.student.lastName} ${enrollment.student.firstName}`,
      phone: enrollment.student.phonePrimary ?? "—",
      amountDue,
    });
  }

  rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
  const totalDue = rows.reduce((sum, r) => sum + r.amountDue, 0);

  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const scopeLabel = [filiere?.name, level?.label].filter(Boolean).join(" — ") || "Tous filières et niveaux confondus";

  doc
    .fontSize(10)
    .fillColor(ctx.printTheme.secondaryTextColor)
    .text(
      `${academicYear.label} — ${scopeLabel}${input.installmentOrderIndex ? ` — Tranche ${input.installmentOrderIndex} uniquement` : ""}`,
      x,
      doc.y,
      { width }
    );
  doc.text(`${rows.length} étudiant(s) en retard — Total dû : ${formatAmount(totalDue)} GNF.`, x, doc.y, { width });
  doc.moveDown(0.75);

  if (rows.length === 0) {
    doc.fontSize(10).fillColor(ctx.printTheme.primaryTextColor).text("Aucun retard de paiement constaté sur ce périmètre.", x, doc.y, { width });
    doc.moveDown(1);
  } else {
    drawArrearsTable(doc, x, width, rows);
  }

  doc.fillColor(ctx.printTheme.primaryTextColor);

  return {
    relatedEntityType: "AcademicYear",
    relatedEntityId: academicYear.id,
    relatedEntityLabel: `Retards de paiement — ${scopeLabel}`,
    qrFields: {},
  };
}

/** Tableau des étudiants en retard — même gabarit que `listeEtudiants.ts` (en-tête colorée, lignes zébrées, colonne Photo). */
function drawArrearsTable(doc: PDFKit.PDFDocument, startX: number, tableWidth: number, rows: ArrearsStudentRow[]): void {
  const columns = [
    { key: "photo", label: "Photo", ratio: 0.08 },
    { key: "matricule", label: "Matricule", ratio: 0.13 },
    { key: "fullName", label: "Nom complet", ratio: 0.28 },
    { key: "phone", label: "Téléphone", ratio: 0.18 },
    { key: "amountDue", label: "Montant dû (GNF)", ratio: 0.33 },
  ] as const;
  const widths = columns.map((c) => c.ratio * tableWidth);

  const rowHeight = 32;
  const photoSize = rowHeight - 8;
  const fontSize = 10;
  const textYOffset = (rowHeight - fontSize) / 2 - 1;
  let y = doc.y;

  const drawHeaderRow = () => {
    let cx = startX;
    doc.rect(startX, y, tableWidth, rowHeight).fill(HEADER_COLOR);
    columns.forEach((col, i) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#FFFFFF")
        .text(col.label.toUpperCase(), cx + 8, y + textYOffset, { width: widths[i]! - 12, characterSpacing: 0.2, lineBreak: false });
      cx += widths[i]!;
    });
    y += rowHeight;
  };

  const ensureSpace = () => {
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 80) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeaderRow();
    }
  };

  drawHeaderRow();

  rows.forEach((row, i) => {
    ensureSpace();
    doc.rect(startX, y, tableWidth, rowHeight).fill(i % 2 === 1 ? ZEBRA_COLOR : "#FFFFFF");
    doc.rect(startX, y, tableWidth, rowHeight).lineWidth(0.5).strokeColor(BORDER_COLOR).stroke();

    let cx = startX;

    const photoY = y + (rowHeight - photoSize) / 2;
    if (row.photoPath) {
      doc.image(row.photoPath, cx + 4, photoY, { fit: [photoSize, photoSize] });
    } else {
      doc.rect(cx + 4, photoY, photoSize, photoSize).lineWidth(0.5).stroke("#9CA3AF");
    }
    cx += widths[0]!;

    const textValues = [row.matricule, row.fullName, row.phone, formatAmount(row.amountDue)];
    textValues.forEach((value, valueIndex) => {
      const colIndex = valueIndex + 1;
      doc
        .font(colIndex === 1 ? "Helvetica-Bold" : "Helvetica")
        .fontSize(fontSize)
        .fillColor(INK)
        .text(value, cx + 8, y + textYOffset, { width: widths[colIndex]! - 12, lineBreak: false, ellipsis: true });
      cx += widths[colIndex]!;
    });

    y += rowHeight;
  });

  doc.x = startX;
  doc.y = y + 12;
}
