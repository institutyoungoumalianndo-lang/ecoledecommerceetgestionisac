import type { GenerateDocumentInput } from "@isac-erp/shared";
import { getBilan } from "../../financialReportService.js";
import { drawTable, formatAmount, formatDateFr, renderIdentificationBox, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "BILAN" }>;

const COLUMNS = [
  { label: "Code", width: 70 },
  { label: "Compte", width: 300 },
  { label: "Solde", width: 90 },
];

function renderSection(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  title: string,
  lines: { accountCode: string; accountLabel: string; balance: number }[],
  extraRow: [string, number] | null,
  total: number
): void {
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.font("Helvetica-Bold").fontSize(11).fillColor(ctx.printTheme.primaryTextColor).text(title, x, doc.y, { width });
  doc.moveDown(0.3);
  doc.font("Helvetica");

  const rows = lines.map((l) => [l.accountCode, l.accountLabel, `${formatAmount(l.balance)} GNF`]);
  if (extraRow) rows.push(["", extraRow[0], `${formatAmount(extraRow[1])} GNF`]);
  if (rows.length === 0) rows.push(["", "Aucun mouvement", "0 GNF"]);
  drawTable(doc, ctx, COLUMNS, rows);

  doc.moveDown(0.4);
  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor(ctx.printTheme.primaryTextColor)
    .text(`Total ${title} : ${formatAmount(total)} GNF`, x, doc.y, { width, align: "right" });
  doc.font("Helvetica");
  doc.moveDown(0.8);
}

/**
 * Bilan mensuel/semestriel/annuel (rapports comptables — extension du 2026-07-30, voir ADR-053) :
 * Actif = Passif + Capitaux propres + Résultat de l'exercice, sur année civile (OHADA/SYSCOHADA).
 */
export async function generateBilan(doc: PDFKit.PDFDocument, ctx: DocumentRenderContext, input: Input): Promise<GeneratorResult> {
  const result = await getBilan({ period: input.period, date: input.date });

  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc
    .fontSize(12)
    .fillColor(ctx.printTheme.primaryTextColor)
    .text(`Période : ${result.periodLabel} — arrêté au ${formatDateFr(result.balanceDate)}`, x, doc.y, { width, align: "center" });
  doc.moveDown(1);

  renderSection(doc, ctx, "ACTIF", result.actifLines, null, result.totalActif);
  renderSection(doc, ctx, "PASSIF", result.passifLines, null, result.totalPassif);
  renderSection(
    doc,
    ctx,
    "CAPITAUX PROPRES",
    result.capitauxPropresLines,
    ["Résultat de l'exercice", result.resultatExercice],
    result.totalCapitauxPropres
  );

  renderIdentificationBox(doc, ctx, [
    ["Total Actif", `${formatAmount(result.totalActif)} GNF`],
    ["Total Passif + Capitaux propres", `${formatAmount(result.totalPassif + result.totalCapitauxPropres)} GNF`],
    ["Bilan équilibré", result.isBalanced ? "Oui" : "Non"],
  ]);

  return {
    relatedEntityType: null,
    relatedEntityId: null,
    relatedEntityLabel: null,
    qrFields: { periode: result.periodLabel, totalActif: formatAmount(result.totalActif) },
  };
}
