import type { GenerateDocumentInput } from "@isac-erp/shared";
import { getGeneralLedger } from "../../financialReportService.js";
import { formatAmount, formatDateFr, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "GRAND_LIVRE_CAISSE" }>;

// Palette "Registre Émeraude" — retenue le 2026-08-02 après maquette (options Émeraude/Indigo &
// Ambre) : vert profond, dans l'esprit classique d'un livre de comptes. Débit/crédit codés en
// couleur (convention comptable usuelle), lignes zébrées, encadrés pour le compte et le solde de
// clôture. Propre à ce générateur, comme les autres documents à identité visuelle dédiée
// (bulletin de paie, attestation, carte d'étudiant) — n'affecte pas `drawTable`/`ctx.printTheme`,
// toujours utilisés par les autres rapports comptables (Journal, État des recettes...).
const GREEN = "#0E6E4E";
const GREEN_DEEP = "#128A62";
const GREEN_TINT = "#F3FAF6";
const GREEN_LINE = "#E4EFE9";
const DEBIT_COLOR = "#B23A3A";
const DASH_COLOR = "#B6B6B6";
const INK = "#1E2430";

/** Grand livre de caisse (rapports comptables — extension du 2026-07-30) : mouvements d'un compte de trésorerie, avec solde courant. */
export async function generateGrandLivreCaisse(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const result = await getGeneralLedger({ accountId: input.accountId, dateFrom: input.dateFrom, dateTo: input.dateTo });

  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  const periodLabel =
    input.dateFrom && input.dateTo ? `Période du relevé : du ${formatDateFr(input.dateFrom)} au ${formatDateFr(input.dateTo)}` : null;

  drawAccountStrip(doc, x, width, `${result.accountCode} — ${result.accountLabel}`, periodLabel, result.openingBalance);
  doc.moveDown(0.6);

  drawLedgerTable(
    doc,
    x,
    [
      { label: "Date", width: 60 },
      { label: "N° pièce", width: 75 },
      { label: "Libellé", width: 140 },
      { label: "Débit", width: 65 },
      { label: "Crédit", width: 65 },
      { label: "Solde", width: 75 },
    ],
    result.lines.map((l) => ({
      date: formatDateFr(l.entryDate),
      piece: l.entryNumber,
      libelle: l.label,
      debit: l.debit ? formatAmount(l.debit) : null,
      credit: l.credit ? formatAmount(l.credit) : null,
      solde: formatAmount(l.runningBalance),
    }))
  );

  doc.moveDown(0.5);
  drawClosingBalanceBox(doc, x, width, result.closingBalance);
  doc.fillColor(ctx.printTheme.primaryTextColor);

  return {
    relatedEntityType: "ChartAccount",
    relatedEntityId: result.accountId,
    relatedEntityLabel: `${result.accountCode} — ${result.accountLabel}`,
    qrFields: { compte: result.accountCode },
  };
}

/** Bandeau compte + solde d'ouverture, dégradé vert. */
function drawAccountStrip(
  doc: PDFKit.PDFDocument,
  x: number,
  width: number,
  accountLine: string,
  periodLabel: string | null,
  openingBalance: number
): void {
  const height = periodLabel ? 46 : 36;
  const y = doc.y;
  const gradient = doc.linearGradient(x, y, x + width, y);
  gradient.stop(0, GREEN).stop(1, GREEN_DEEP);
  doc.roundedRect(x, y, width, height, 8).fill(gradient);

  const padding = 16;
  doc
    .font("Helvetica-Bold")
    .fontSize(11.5)
    .fillColor("#FFFFFF")
    .text(accountLine, x + padding, y + (periodLabel ? 9 : height / 2 - 6), { width: width * 0.6, lineBreak: false });
  if (periodLabel) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#FFFFFF")
      .opacity(0.85)
      .text(periodLabel, x + padding, y + 26, { width: width * 0.6, lineBreak: false });
    doc.opacity(1);
  }

  const openingX = x + width - padding - 180;
  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .fillColor("#FFFFFF")
    .opacity(0.75)
    .text("SOLDE D'OUVERTURE", openingX, y + 9, { width: 180, align: "right", characterSpacing: 0.3 });
  doc.opacity(1);
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor("#FFFFFF")
    .text(`${formatAmount(openingBalance)} GNF`, openingX, y + 20, { width: 180, align: "right" });

  doc.x = x;
  doc.y = y + height + 10;
}

/** Tableau des écritures — en-tête vert plein, lignes zébrées, débit/crédit colorés. */
function drawLedgerTable(
  doc: PDFKit.PDFDocument,
  startX: number,
  columns: { label: string; width: number }[],
  rows: { date: string; piece: string; libelle: string; debit: string | null; credit: string | null; solde: string }[]
): void {
  // Hauteur de ligne augmentée 24 → 32 le 2026-08-02 (retour du porteur du projet).
  const rowHeight = 32;
  const fontSize = 9.5;
  const textYOffset = (rowHeight - fontSize) / 2 - 1;
  const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);
  let y = doc.y;

  const ensureSpace = () => {
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 80) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeaderRow();
    }
  };

  const drawHeaderRow = () => {
    let cx = startX;
    doc.rect(startX, y, tableWidth, rowHeight).fill(GREEN);
    columns.forEach((col, i) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor("#FFFFFF")
        .text(col.label.toUpperCase(), cx + 8, y + textYOffset, {
          width: col.width - 12,
          align: i >= 3 ? "right" : "left",
          characterSpacing: 0.2,
          lineBreak: false,
        });
      cx += col.width;
    });
    y += rowHeight;
  };

  drawHeaderRow();

  rows.forEach((row, i) => {
    ensureSpace();
    doc.rect(startX, y, tableWidth, rowHeight).fill(i % 2 === 1 ? GREEN_TINT : "#FFFFFF");
    doc.rect(startX, y, tableWidth, rowHeight).lineWidth(0.5).strokeColor(GREEN_LINE).stroke();

    let cx = startX;
    const cell = (text: string, colIndex: number, color: string, bold = false) => {
      const col = columns[colIndex];
      if (!col) return;
      doc
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(fontSize)
        .fillColor(color)
        .text(text, cx + 8, y + textYOffset, { width: col.width - 12, align: colIndex >= 3 ? "right" : "left", lineBreak: false, ellipsis: true });
      cx += col.width;
    };

    cell(row.date, 0, INK);
    cell(row.piece, 1, INK);
    cell(row.libelle, 2, INK);
    cell(row.debit ?? "—", 3, row.debit ? DEBIT_COLOR : DASH_COLOR, Boolean(row.debit));
    cell(row.credit ?? "—", 4, row.credit ? GREEN : DASH_COLOR, Boolean(row.credit));
    cell(row.solde, 5, INK, true);

    y += rowHeight;
  });

  doc.x = startX;
  doc.y = y + 14;
}

/** Encadré solde de clôture, aligné à droite. */
function drawClosingBalanceBox(doc: PDFKit.PDFDocument, x: number, width: number, closingBalance: number): void {
  const boxWidth = 220;
  const boxHeight = 40;
  const boxX = x + width - boxWidth;
  const y = doc.y;

  doc.roundedRect(boxX, y, boxWidth, boxHeight, 6).lineWidth(1.5).fillAndStroke(GREEN_TINT, GREEN);
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(GREEN)
    .text("SOLDE DE CLÔTURE", boxX, y + 8, { width: boxWidth, align: "center", characterSpacing: 0.3 });
  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .fillColor(GREEN)
    .text(`${formatAmount(closingBalance)} GNF`, boxX, y + 20, { width: boxWidth, align: "center" });

  doc.x = x;
  doc.y = y + boxHeight + 14;
}
