import type { GenerateDocumentInput } from "@isac-erp/shared";
import { getDailyCashPosition } from "../../financialReportService.js";
import { formatAmount, formatDateFr, renderIdentificationBox, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "SITUATION_CAISSE_JOURNALIERE" }>;

/** Situation de caisse journalière (rapports comptables — extension du 2026-07-30) : position d'une caisse physique précise pour un jour donné. */
export async function generateSituationCaisseJournaliere(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const result = await getDailyCashPosition({ cashRegisterId: input.cashRegisterId, date: input.date });

  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc
    .fontSize(12)
    .fillColor(ctx.printTheme.primaryTextColor)
    .text(`Caisse : ${result.cashRegisterName} — Journée du ${formatDateFr(result.date)}`, x, doc.y, { width, align: "center" });
  doc.moveDown(1);

  const fields: [string, string][] = [
    ["Solde d'ouverture", `${formatAmount(result.openingBalance)} GNF`],
    ["Total des recettes", `${formatAmount(result.totalRecettes)} GNF`],
    ["Total des dépenses", `${formatAmount(result.totalDepenses)} GNF`],
    ["Solde théorique", `${formatAmount(result.closingBalanceTheorique)} GNF`],
  ];
  if (result.sessionDeclaredBalance !== null) {
    fields.push(["Solde déclaré (comptage)", `${formatAmount(result.sessionDeclaredBalance)} GNF`]);
  }
  if (result.sessionVariance !== null) {
    fields.push(["Écart", `${formatAmount(result.sessionVariance)} GNF`]);
  }
  renderIdentificationBox(doc, ctx, fields);

  return {
    relatedEntityType: "CashRegister",
    relatedEntityId: result.cashRegisterId,
    relatedEntityLabel: result.cashRegisterName,
    qrFields: { caisse: result.cashRegisterName, solde: formatAmount(result.closingBalanceTheorique) },
  };
}
