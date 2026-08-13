import type { GenerateDocumentInput } from "@isac-erp/shared";
import { getCashRegisterJournal } from "../../financialReportService.js";
import { amountToFrenchWordsWithCurrency, formatAmount, formatDateFr, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "JOURNAL_CAISSE" }>;

// Palette "Violet Élégant" — retenue le 2026-08-02 après maquette (options Cyan Sessions / Violet
// Élégant) : violet profond + liseré doré, distinct des trois autres documents comptables déjà
// personnalisés (émeraude, ambre, vert/rouge/marine). Propre à ce générateur, n'affecte pas
// `drawTable`/`ctx.printTheme`.
const VIOLET = "#2E1F4D";
const GOLD = "#B08D57";
const GOLD_LIGHT = "#E9D9BC";
const VIOLET_LINE = "#ECE7F2";
const RECETTE_COLOR = "#0E6E4E";
const DEPENSE_COLOR = "#A93A3A";
const DASH_COLOR = "#B6B6B6";
const INK = "#1E2430";
const WORDS_BG = "#FAF8FC";

/** Journal de caisse (rapports comptables — extension du 2026-07-30) : mouvements espèces chronologiques d'une session de caisse précise. */
export async function generateJournalCaisse(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const result = await getCashRegisterJournal({ cashRegisterSessionId: input.cashRegisterSessionId });

  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  drawSessionStrip(doc, x, width, result.cashRegisterName, result.openedAt, result.closedAt, result.openingBalance);
  doc.moveDown(0.6);

  drawJournalTable(
    doc,
    x,
    [
      { label: "Date", width: 75 },
      { label: "Libellé", width: 210 },
      { label: "Recette", width: 80 },
      { label: "Dépense", width: 80 },
      { label: "Solde", width: 75 },
    ],
    result.movements.map((m) => ({
      date: formatDateFr(m.date),
      libelle: m.label,
      recette: m.type === "RECETTE" ? formatAmount(m.amount) : null,
      depense: m.type === "DEPENSE" ? formatAmount(m.amount) : null,
      solde: formatAmount(m.runningBalance),
    }))
  );

  doc.moveDown(0.5);
  drawClosingBalanceBox(doc, x, width, result.closingBalance);
  doc.moveDown(0.7);

  drawAmountInWordsBox(doc, x, width, result.closingBalance);
  doc.fillColor(ctx.printTheme.primaryTextColor);

  return {
    relatedEntityType: "CashRegisterSession",
    relatedEntityId: result.cashRegisterSessionId,
    relatedEntityLabel: result.cashRegisterName,
    qrFields: { caisse: result.cashRegisterName },
  };
}

/** Bandeau session violet, liseré doré, badge EN COURS/CLÔTURÉE. */
function drawSessionStrip(
  doc: PDFKit.PDFDocument,
  x: number,
  width: number,
  cashRegisterName: string,
  openedAt: Date,
  closedAt: Date | null,
  openingBalance: number
): void {
  const height = 46;
  const y = doc.y;
  const barWidth = 5;

  doc.rect(x, y, width, height).fill(VIOLET);
  doc.rect(x, y, barWidth, height).fill(GOLD);

  const padding = 18;
  const sessionLabel = closedAt
    ? `Session du ${formatDateFr(openedAt)} au ${formatDateFr(closedAt)}`
    : `Session du ${formatDateFr(openedAt)}`;
  doc
    .font("Helvetica-Bold")
    .fontSize(11.5)
    .fillColor("#FFFFFF")
    .text(`Caisse : ${cashRegisterName}`, x + padding, y + 9, { width: width * 0.55, lineBreak: false });
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(GOLD_LIGHT)
    .text(sessionLabel, x + padding, y + 24, { width: width * 0.45, lineBreak: false });

  const badgeLabel = closedAt ? "CLÔTURÉE" : "EN COURS";
  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .fillColor(GOLD_LIGHT)
    .text(badgeLabel, x + padding, y + 33, { width: 120, characterSpacing: 0.4, lineBreak: false });

  const openingX = x + width - padding - 180;
  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .fillColor(GOLD_LIGHT)
    .text("SOLDE D'OUVERTURE", openingX, y + 9, { width: 180, align: "right", characterSpacing: 0.3 });
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor("#FFFFFF")
    .text(`${formatAmount(openingBalance)} GNF`, openingX, y + 20, { width: 180, align: "right" });

  doc.x = x;
  doc.y = y + height + 10;
}

/** Tableau des mouvements — en-tête violet, liseré doré, recette/dépense colorées. */
function drawJournalTable(
  doc: PDFKit.PDFDocument,
  startX: number,
  columns: { label: string; width: number }[],
  rows: { date: string; libelle: string; recette: string | null; depense: string | null; solde: string }[]
): void {
  const rowHeight = 26;
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
    doc.rect(startX, y, tableWidth, rowHeight).fill(VIOLET);
    doc.rect(startX, y + rowHeight - 2, tableWidth, 2).fill(GOLD);
    columns.forEach((col, i) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor(GOLD_LIGHT)
        .text(col.label.toUpperCase(), cx + 8, y + textYOffset, {
          width: col.width - 12,
          align: i >= 2 ? "right" : "left",
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
    doc.rect(startX, y, tableWidth, rowHeight).fill(i % 2 === 1 ? "#F7F5FA" : "#FFFFFF");
    doc.rect(startX, y, tableWidth, rowHeight).lineWidth(0.5).strokeColor(VIOLET_LINE).stroke();

    let cx = startX;
    const cell = (text: string, colIndex: number, color: string, bold = false) => {
      const col = columns[colIndex];
      if (!col) return;
      doc
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(fontSize)
        .fillColor(color)
        .text(text, cx + 8, y + textYOffset, { width: col.width - 12, align: colIndex >= 2 ? "right" : "left", lineBreak: false, ellipsis: true });
      cx += col.width;
    };

    cell(row.date, 0, INK);
    cell(row.libelle, 1, INK);
    cell(row.recette ?? "—", 2, row.recette ? RECETTE_COLOR : DASH_COLOR, Boolean(row.recette));
    cell(row.depense ?? "—", 3, row.depense ? DEPENSE_COLOR : DASH_COLOR, Boolean(row.depense));
    cell(row.solde, 4, VIOLET, true);

    y += rowHeight;
  });

  doc.x = startX;
  doc.y = y + 14;
}

/** Encadré solde de clôture, violet avec liseré doré. */
function drawClosingBalanceBox(doc: PDFKit.PDFDocument, x: number, width: number, closingBalance: number): void {
  const boxWidth = 220;
  const boxHeight = 40;
  const boxX = x + width - boxWidth;
  const barWidth = 4;
  const y = doc.y;

  doc.rect(boxX, y, boxWidth, boxHeight).fill(VIOLET);
  doc.rect(boxX, y, barWidth, boxHeight).fill(GOLD);
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(GOLD_LIGHT)
    .text("SOLDE DE CLÔTURE", boxX + barWidth, y + 8, { width: boxWidth - barWidth, align: "center", characterSpacing: 0.3 });
  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .fillColor("#FFFFFF")
    .text(`${formatAmount(closingBalance)} GNF`, boxX + barWidth, y + 20, { width: boxWidth - barWidth, align: "center" });

  doc.x = x;
  doc.y = y + boxHeight + 14;
}

/**
 * Encadré "Arrêté... à la somme de" (montant en toutes lettres) — élément attendu sur tout journal
 * de caisse professionnel (2026-08-02, retour du porteur du projet : "c'est très important").
 */
function drawAmountInWordsBox(doc: PDFKit.PDFDocument, x: number, width: number, closingBalance: number): void {
  const label = "Arrêté le présent journal de caisse à la somme de :";
  const words = `${amountToFrenchWordsWithCurrency(closingBalance)}.`;
  const padding = 14;
  const barWidth = 3;
  const innerWidth = width - padding * 2 - barWidth;

  doc.font("Helvetica-Oblique").fontSize(9.5);
  const labelHeight = doc.heightOfString(label, { width: innerWidth });
  doc.font("Helvetica-Bold").fontSize(11);
  const wordsHeight = doc.heightOfString(words, { width: innerWidth });
  const boxHeight = padding * 2 + labelHeight + 4 + wordsHeight;

  const y = doc.y;
  doc.rect(x, y, width, boxHeight).fill(WORDS_BG);
  doc.rect(x, y, barWidth, boxHeight).fill(GOLD);

  doc.font("Helvetica-Oblique").fontSize(9.5).fillColor("#6A6A7A");
  doc.text(label, x + barWidth + padding, y + padding, { width: innerWidth });
  doc.font("Helvetica-Bold").fontSize(11).fillColor(VIOLET);
  doc.text(words, x + barWidth + padding, y + padding + labelHeight + 4, { width: innerWidth });

  doc.font("Helvetica");
  doc.x = x;
  doc.y = y + boxHeight + 10;
}
