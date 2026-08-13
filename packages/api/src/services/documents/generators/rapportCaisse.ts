import type { GenerateDocumentInput } from "@isac-erp/shared";
import { getReportByCashRegister, getReportByCategory, getReportByPeriod } from "../../financialReportService.js";
import { formatAmount, formatDateFr, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "RAPPORT_CAISSE" }>;

// Style "Balance visuelle" — retenu le 2026-08-02 après maquette (options "Trois cartes" / "Balance
// visuelle"), puis enrichi d'une version détaillée à la demande du porteur du projet : recettes/
// dépenses en barres comparatives + solde, complétés par deux répartitions déjà calculées ailleurs
// dans l'appli (`getReportByCashRegister`, `getReportByCategory`) mais jusqu'ici jamais affichées sur
// ce document. Propre à ce générateur, comme les autres rapports comptables à identité dédiée.
const GREEN = "#0E6E4E";
const GREEN_DEEP = "#128A62";
const RED = "#A93A3A";
const RED_DEEP = "#C24747";
const NAVY = "#16305C";
const GREEN_TINT = "#EAF7F1";
const RED_TINT = "#FBEAEA";
const TRACK_BG = "#F1F2F5";
const INK = "#333333";
const MUTED = "#99AAAA";

export async function generateRapportCaisse(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const result = await getReportByPeriod({ period: input.period, date: input.date });
  const [byCashRegister, byCategory] = await Promise.all([
    getReportByCashRegister(result.dateFrom, result.dateTo),
    getReportByCategory(result.dateFrom, result.dateTo),
  ]);

  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor(ctx.printTheme.secondaryTextColor)
    .text(`Période : ${result.periodLabel} — du ${formatDateFr(result.dateFrom)} au ${formatDateFr(result.dateTo)}`, x, doc.y, {
      width,
      align: "center",
    });
  doc.moveDown(1);

  const maxAmount = Math.max(result.totalRecettes, result.totalDepenses, 1);
  drawComparisonBars(doc, x, width, [
    { label: "Total des recettes", amount: result.totalRecettes, color: GREEN, colorDeep: GREEN_DEEP, ratio: result.totalRecettes / maxAmount },
    { label: "Total des dépenses", amount: result.totalDepenses, color: RED, colorDeep: RED_DEEP, ratio: result.totalDepenses / maxAmount },
  ]);
  doc.moveDown(0.6);

  drawSoldeBox(doc, x, width, result.solde);
  doc.moveDown(0.8);

  if (byCashRegister.rows.length > 0 || byCategory.rows.length > 0) {
    drawDetailPanels(
      doc,
      x,
      width,
      { title: "Recettes par caisse", accent: GREEN, tint: GREEN_TINT, rows: byCashRegister.rows.map((r) => ({ name: r.cashRegisterName, amount: r.total })), emptyLabel: "Aucune recette enregistrée sur la période." },
      { title: "Dépenses par catégorie", accent: RED, tint: RED_TINT, rows: byCategory.rows.map((r) => ({ name: r.categoryName, amount: r.total })), emptyLabel: "Aucune dépense enregistrée sur la période." }
    );
  }

  doc.fillColor(ctx.printTheme.primaryTextColor);

  return {
    relatedEntityType: null,
    relatedEntityId: null,
    relatedEntityLabel: null,
    qrFields: { periode: result.periodLabel, solde: formatAmount(result.solde) },
  };
}

/** Barres comparatives recettes/dépenses, même échelle. */
function drawComparisonBars(
  doc: PDFKit.PDFDocument,
  x: number,
  width: number,
  rows: { label: string; amount: number; color: string; colorDeep: string; ratio: number }[]
): void {
  const padding = 18;
  const barHeight = 13;
  const rowGap = 30;
  const boxHeight = rows.length * rowGap + padding * 2 - (rowGap - barHeight - 20);
  const y = doc.y;

  doc.roundedRect(x, y, width, boxHeight).lineWidth(1).strokeColor("#E5E7EC").stroke();

  let cy = y + padding;
  const innerWidth = width - padding * 2;
  rows.forEach((row) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor(INK)
      .text(row.label, x + padding, cy, { width: innerWidth * 0.6, lineBreak: false });
    doc
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .fillColor(row.color)
      .text(`${formatAmount(row.amount)} GNF`, x + padding, cy, { width: innerWidth, align: "right", lineBreak: false });
    const trackY = cy + 15;
    doc.roundedRect(x + padding, trackY, innerWidth, barHeight, 6).fill(TRACK_BG);
    if (row.ratio > 0) {
      const fillGradient = doc.linearGradient(x + padding, trackY, x + padding + innerWidth, trackY);
      fillGradient.stop(0, row.colorDeep).stop(1, row.color);
      doc.roundedRect(x + padding, trackY, Math.max(innerWidth * row.ratio, barHeight), barHeight, 6).fill(fillGradient);
    }
    cy += rowGap;
  });

  doc.x = x;
  doc.y = y + boxHeight + 12;
}

/** Bandeau solde marine, avec pastille Excédentaire/Déficitaire/Équilibré. */
function drawSoldeBox(doc: PDFKit.PDFDocument, x: number, width: number, solde: number): void {
  const height = 44;
  const y = doc.y;
  doc.roundedRect(x, y, width, height, 10).fill(NAVY);

  const padding = 18;
  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor("#FFFFFF")
    .opacity(0.75)
    .text("SOLDE", x + padding, y + 10, { width: 200, characterSpacing: 0.3 });
  doc.opacity(1);
  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .fillColor("#FFFFFF")
    .text(`${formatAmount(solde)} GNF`, x + padding, y + 21, { width: 300 });

  const badgeLabel = solde > 0 ? "Excédentaire" : solde < 0 ? "Déficitaire" : "Équilibré";
  const badgeWidth = 100;
  doc.opacity(0.15);
  doc.roundedRect(x + width - padding - badgeWidth, y + height / 2 - 11, badgeWidth, 22, 11).fill("#FFFFFF");
  doc.opacity(1);
  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor("#FFFFFF")
    .text(badgeLabel, x + width - padding - badgeWidth, y + height / 2 - 5, { width: badgeWidth, align: "center" });

  doc.x = x;
  doc.y = y + height + 10;
}

interface DetailPanelSpec {
  title: string;
  accent: string;
  tint: string;
  rows: { name: string; amount: number }[];
  emptyLabel: string;
}

/** Deux panneaux de répartition côte à côte (recettes par caisse / dépenses par catégorie). */
function drawDetailPanels(doc: PDFKit.PDFDocument, x: number, width: number, left: DetailPanelSpec, right: DetailPanelSpec): void {
  const gap = 16;
  const panelWidth = (width - gap) / 2;
  const rowHeight = 20;
  const headHeight = 22;
  const emptyHeight = 30;
  const contentHeight = (spec: DetailPanelSpec) => (spec.rows.length > 0 ? spec.rows.length * rowHeight : emptyHeight);
  const panelHeight = headHeight + Math.max(contentHeight(left), contentHeight(right));
  const y = doc.y;

  const drawPanel = (spec: DetailPanelSpec, panelX: number) => {
    doc.rect(panelX, y, panelWidth, headHeight).fill(spec.tint);
    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(spec.accent)
      .text(spec.title.toUpperCase(), panelX + 12, y + 7, { width: panelWidth - 24, characterSpacing: 0.2, lineBreak: false });

    doc.rect(panelX, y + headHeight, panelWidth, panelHeight - headHeight).lineWidth(1).strokeColor("#E5E7EC").stroke();

    if (spec.rows.length === 0) {
      doc
        .font("Helvetica-Oblique")
        .fontSize(8.5)
        .fillColor(MUTED)
        .text(spec.emptyLabel, panelX + 12, y + headHeight + 10, { width: panelWidth - 24 });
      return;
    }

    let ry = y + headHeight + 5;
    spec.rows.forEach((row) => {
      doc
        .font("Helvetica")
        .fontSize(9.5)
        .fillColor(INK)
        .text(row.name, panelX + 12, ry, { width: panelWidth * 0.6, lineBreak: false, ellipsis: true });
      doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor(spec.accent)
        .text(`${formatAmount(row.amount)} GNF`, panelX + 12, ry, { width: panelWidth - 24, align: "right", lineBreak: false });
      ry += rowHeight;
    });
  };

  drawPanel(left, x);
  drawPanel(right, x + panelWidth + gap);

  doc.x = x;
  doc.y = y + panelHeight + 14;
}
