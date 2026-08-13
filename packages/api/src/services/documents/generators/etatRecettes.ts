import type { GenerateDocumentInput } from "@isac-erp/shared";
import { getRevenueSummary } from "../../financialReportService.js";
import { formatAmount, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "ETAT_RECETTES" }>;

// Palette "Ambre & Or" — retenue le 2026-08-02 après maquette (options Ambre & Or / Bleu Corail),
// volontairement distincte du vert "Registre Émeraude" du grand livre de caisse (même famille de
// documents comptables, mais identité visuelle propre à chacun, comme les autres documents à
// palette dédiée). N'affecte ni `drawTable` ni `ctx.printTheme`, toujours utilisés ailleurs.
const GOLD_DARK = "#B8860B";
const GOLD_LIGHT = "#E0A526";
const GOLD_TRACK = "#FBF3DE";
const GOLD_LINE = "#F1E6C8";
const INK = "#333333";

/** État des recettes (rapports comptables — extension du 2026-07-30) : paiements validés sur la période, répartis par type de frais. */
export async function generateEtatRecettes(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const result = await getRevenueSummary({ dateFrom: input.dateFrom, dateTo: input.dateTo });

  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  drawHero(doc, x, width, result.total, result.count);
  doc.moveDown(0.7);

  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor(GOLD_DARK)
    .text("RÉPARTITION PAR TYPE DE FRAIS", x, doc.y, { width, characterSpacing: 0.3 });
  doc.moveDown(0.4);

  drawFeeTypeBars(
    doc,
    x,
    width,
    result.byFeeType.map((f) => ({ label: f.feeTypeName, amount: f.total })),
    result.total
  );

  doc.fillColor(ctx.printTheme.primaryTextColor);

  return {
    relatedEntityType: null,
    relatedEntityId: null,
    relatedEntityLabel: null,
    qrFields: { totalRecettes: formatAmount(result.total) },
  };
}

/** Bandeau total en dégradé doré + nombre de paiements validés. */
function drawHero(doc: PDFKit.PDFDocument, x: number, width: number, total: number, count: number): void {
  const height = 54;
  const y = doc.y;
  const gradient = doc.linearGradient(x, y, x + width, y);
  gradient.stop(0, GOLD_DARK).stop(1, GOLD_LIGHT);
  doc.roundedRect(x, y, width, height, 10).fill(gradient);

  const padding = 20;
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#FFFFFF")
    .opacity(0.85)
    .text("TOTAL DES RECETTES", x + padding, y + 13, { width: width * 0.6, characterSpacing: 0.3 });
  doc.opacity(1);
  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor("#FFFFFF")
    .text(`${formatAmount(total)} GNF`, x + padding, y + 25, { width: width * 0.6 });

  const countWidth = 180;
  const countX = x + width - padding - countWidth;
  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor("#FFFFFF")
    .text(String(count), countX, y + 13, { width: countWidth, align: "right" });
  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor("#FFFFFF")
    .opacity(0.85)
    .text(count > 1 ? "paiements validés" : "paiement validé", countX, y + 36, { width: countWidth, align: "right" });
  doc.opacity(1);

  doc.x = x;
  doc.y = y + height + 10;
}

/** Répartition par type de frais — une barre horizontale proportionnelle par ligne. */
function drawFeeTypeBars(doc: PDFKit.PDFDocument, x: number, width: number, lines: { label: string; amount: number }[], total: number): void {
  const rowHeight = 26;
  const barHeight = 12;
  const nameWidth = 130;
  const amountWidth = 90;
  const pctWidth = 36;
  const gap = 10;
  const trackWidth = width - nameWidth - amountWidth - pctWidth - gap * 3;
  const trackX = x + nameWidth + gap;

  let y = doc.y;

  lines.forEach((line) => {
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 80) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    const ratio = total > 0 ? Math.max(0, Math.min(1, line.amount / total)) : 0;
    const barY = y + (rowHeight - barHeight) / 2;

    doc
      .font("Helvetica")
      .fontSize(10.5)
      .fillColor(INK)
      .text(line.label, x, y + (rowHeight - 10.5) / 2 - 1, { width: nameWidth - gap, lineBreak: false, ellipsis: true });

    doc.roundedRect(trackX, barY, trackWidth, barHeight, 6).fill(GOLD_TRACK);
    if (ratio > 0) {
      const fillGradient = doc.linearGradient(trackX, barY, trackX + trackWidth, barY);
      fillGradient.stop(0, GOLD_LIGHT).stop(1, GOLD_DARK);
      doc.roundedRect(trackX, barY, Math.max(trackWidth * ratio, barHeight), barHeight, 6).fill(fillGradient);
    }

    const amountX = trackX + trackWidth + gap;
    doc
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .fillColor(GOLD_DARK)
      .text(formatAmount(line.amount), amountX, y + (rowHeight - 10.5) / 2 - 1, { width: amountWidth, align: "right" });

    const pctX = amountX + amountWidth + gap;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#B09346")
      .text(`${Math.round(ratio * 100)}%`, pctX, y + (rowHeight - 9) / 2 - 1, { width: pctWidth, align: "right" });

    doc
      .strokeColor(GOLD_LINE)
      .lineWidth(0.75)
      .moveTo(x, y + rowHeight)
      .lineTo(x + width, y + rowHeight)
      .stroke();

    y += rowHeight;
  });

  doc.x = x;
  doc.y = y + 12;
}
