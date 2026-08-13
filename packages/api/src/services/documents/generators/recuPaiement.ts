import type { GenerateDocumentInput } from "@isac-erp/shared";
import { getPaymentById } from "../../paymentService.js";
import { getStudentFeeSummary, SCOLARITE_FEE_TYPE_CODE } from "../../feeSummaryService.js";
import { prisma } from "@isac-erp/db";
import {
  amountToFrenchWordsWithCurrency,
  formatAmount,
  resolveUploadPath,
  type DocumentRenderContext,
} from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "RECU_PAIEMENT" }>;

interface ReceiptData {
  logoPath: string | null;
  establishmentName: string;
  campusName: string;
  receiptNumber: string;
  date: string;
  studentName: string;
  matricule: string;
  filiereLevel: string;
  paymentMethodLabel: string;
  recordedByName: string;
  objectLabel: string;
  nextDueDate: string;
  amountPaid: number;
  balanceBefore: number;
  remaining: number;
  amountInWords: string;
}

const BANNER_COLOR = "#6B7280";
const SUBBANNER_COLOR = "#4B5563";

// Hauteurs de ligne fixes de la grille — la carte n'a plus de hauteur imposée (2026-08-10, retour du
// porteur du projet : "je vois un cadre juste après [le pied de page], supprime-le, j'aime bien le
// reçu sans ce cadre") : elle s'arrête exactement après la dernière ligne dessinée, sans reliquat.
const HEADER_H = 32;
const ROW_H = 21;
const SUB_HEADER_H = 17;
const STAT_ROW_H = 30;
const LETTERS_ROW_H = 18;
const SIGNATURE_ROW_H = ROW_H * 2;
const FOOTER_ROW_H = ROW_H;
const RECEIPT_HEIGHT = HEADER_H + ROW_H * 4 + SUB_HEADER_H + STAT_ROW_H + LETTERS_ROW_H + SIGNATURE_ROW_H + FOOTER_ROW_H;

/**
 * Reçu de paiement de scolarité (2026-08-10, retour du porteur du projet — grille/formulaire adaptée
 * d'un modèle fourni, "Exemple F" retenu avec les bandeaux recolorés en gris) : page portrait, 1er
 * exemplaire collé en haut de la page, 2e collé en bas, l'espace laissé libre au milieu (à la place du
 * 3e exemplaire du modèle d'origine) servant de zone de découpe. Ne porte que sur la part Scolarité du
 * paiement (voir SCOLARITE_FEE_TYPE_CODE, feeSummaryService.ts) — un paiement mêlant scolarité et un
 * autre frais n'affiche ici que la portion scolarité.
 */
export async function generateRecuPaiement(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const payment = await getPaymentById(input.paymentId);
  const [feeSummary, scolariteFeeType] = await Promise.all([
    getStudentFeeSummary({ studentId: payment.studentId, academicYearId: payment.academicYearId }),
    prisma.feeType.findUnique({ where: { code: SCOLARITE_FEE_TYPE_CODE } }),
  ]);

  const scolariteAllocations = scolariteFeeType
    ? payment.allocations.filter((a) => a.feeTypeId === scolariteFeeType.id)
    : [];
  const amountPaid = scolariteAllocations.reduce((sum, a) => sum + a.amount, 0);
  const objectLabel =
    scolariteAllocations.length === 1
      ? `Scolarité — ${scolariteAllocations[0]!.feeInstallmentLabel ?? "Versement"}`
      : scolariteAllocations.length > 1
        ? `Scolarité — ${scolariteAllocations.map((a) => a.feeInstallmentLabel ?? "Versement").join(", ")}`
        : "Scolarité";

  const scolariteLine = feeSummary.lines.find((l) => l.feeTypeCode === SCOLARITE_FEE_TYPE_CODE);
  const remaining = scolariteLine?.remainingAmount ?? 0;
  const nextInstallment = (scolariteLine?.installments ?? [])
    .filter((i) => i.remainingAmount > 0)
    .sort((a, b) => a.orderIndex - b.orderIndex)[0];

  const data: ReceiptData = {
    logoPath: resolveUploadPath(ctx.establishment.logoPrimaryPath),
    establishmentName: ctx.establishment.officialName,
    campusName: ctx.campus.name,
    receiptNumber: payment.receiptNumber,
    date: payment.createdAt.toLocaleDateString("fr-FR"),
    studentName: payment.studentName,
    matricule: payment.studentMatricule,
    filiereLevel: `${payment.filiereName}, ${payment.levelLabel}`,
    paymentMethodLabel: payment.paymentMethodLabel,
    recordedByName: payment.recordedByName,
    objectLabel,
    nextDueDate: nextInstallment ? nextInstallment.dueDate.toLocaleDateString("fr-FR") : "—",
    amountPaid,
    balanceBefore: remaining + amountPaid,
    remaining,
    amountInWords: amountToFrenchWordsWithCurrency(amountPaid),
  };

  // Largeur fixe 18 cm (2026-08-10, retour du porteur du projet), hauteur = exactement la hauteur
  // naturelle du contenu de la grille (RECEIPT_HEIGHT, plus de reliquat vide en bas de carte) — 1er
  // exemplaire collé en haut de la page, 2e collé en bas, centrés horizontalement ; l'espace entre les
  // deux (au milieu de la page) sert de zone de découpe.
  const CM_TO_PT = 28.3465;
  const width = 18 * CM_TO_PT;
  const bandHeight = RECEIPT_HEIGHT;
  const x = (doc.page.width - width) / 2;
  const topY = doc.page.margins.top;
  const bottomY = doc.page.height - doc.page.margins.bottom - bandHeight;

  drawReceiptCopy(doc, ctx, x, topY, width, bandHeight, data);
  drawReceiptCopy(doc, ctx, x, bottomY, width, bandHeight, data);

  return {
    relatedEntityType: "Payment",
    relatedEntityId: payment.id,
    relatedEntityLabel: `${payment.studentName} — ${payment.studentMatricule}`,
    qrFields: { etudiant: payment.studentMatricule, montant: formatAmount(amountPaid) },
  };
}

interface CellOptions {
  fill?: string;
  textColor?: string;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  fontSize?: number;
  sub?: string;
  subColor?: string;
}

/** Une cellule de la grille — bordure systématique, remplissage/texte optionnels (gabarit "grille formulaire" fourni par le porteur du projet). */
function cell(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  border: string,
  text: string,
  options: CellOptions = {}
): void {
  if (options.fill) doc.rect(x, y, w, h).fill(options.fill);
  doc.rect(x, y, w, h).lineWidth(0.5).strokeColor(border).stroke();

  const padX = 6;
  const align = options.align ?? "left";
  const hasSub = Boolean(options.sub);
  const textY = hasSub ? y + h / 2 - (options.fontSize ?? 9.5) - 1 : y + (h - (options.fontSize ?? 9.5)) / 2;

  doc
    .font(options.bold ? "Helvetica-Bold" : options.italic ? "Helvetica-Oblique" : "Helvetica")
    .fontSize(options.fontSize ?? 9.5)
    .fillColor(options.textColor ?? "#1E2430")
    .text(text, x + padX, textY, { width: w - padX * 2, align, lineBreak: false, ellipsis: true });

  if (options.sub) {
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(options.subColor ?? "#6B7280")
      .text(options.sub, x + padX, y + h / 2 + 1, { width: w - padX * 2, align, lineBreak: false, ellipsis: true });
  }
}

/** Un exemplaire du reçu : grille/formulaire (gabarit fourni par le porteur du projet, bandeaux recolorés en gris). */
function drawReceiptCopy(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  x: number,
  y: number,
  w: number,
  h: number,
  data: ReceiptData
): void {
  const border = ctx.printTheme.borderColor;
  const ink = ctx.printTheme.primaryTextColor;
  void h; // la carte utilise désormais sa hauteur naturelle (RECEIPT_HEIGHT), plus de reliquat à combler

  // Colonne A élargie (2026-08-10, retour du porteur du projet : "mode de paiement" et "montant en
  // lettres" ne s'affichaient pas sur une seule ligne) — assez large pour ces deux libellés les plus
  // longs à 9pt gras.
  const w1 = w * 0.25;
  const w2 = w * 0.3;
  const w3 = w * 0.2;
  const w4 = w - w1 - w2 - w3;
  const xA = x;
  const xB = x + w1;
  const xC = xB + w2;
  const xD = xC + w3;

  let ry = y;

  // Bandeau d'en-tête — logo, nom de l'école, campus, titre. Bordure propre (fillAndStroke) puisque le
  // grand rectangle englobant a été retiré — chaque bandeau/ligne porte désormais sa propre bordure.
  const headerH = HEADER_H;
  doc.rect(x, ry, w, headerH).lineWidth(0.5).fillAndStroke(BANNER_COLOR, border);
  const logoSize = 22;
  const logoY = ry + (headerH - logoSize) / 2;
  if (data.logoPath) {
    doc.image(data.logoPath, x + 10, logoY, { fit: [logoSize, logoSize] });
  } else {
    doc.circle(x + 10 + logoSize / 2, ry + headerH / 2, logoSize / 2).lineWidth(1).strokeColor("#FFFFFF").stroke();
  }
  doc
    .font("Helvetica-Bold")
    .fontSize(11.5)
    .fillColor("#FFFFFF")
    .text(`${data.establishmentName} — ${data.campusName}`, x, ry + 6, { width: w, align: "center", lineBreak: false });
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#FFFFFF")
    .text("Reçu de paiement", x, ry + 19, { width: w, align: "center", lineBreak: false });
  ry += headerH;

  const rowH = ROW_H;
  const pairRow = (labelA: string, valueA: string, labelB: string, valueB: string, colorA?: string, colorB?: string) => {
    cell(doc, xA, ry, w1, rowH, border, labelA, { fill: "#F1F2F4", bold: true, fontSize: 9 });
    cell(doc, xB, ry, w2, rowH, border, valueA, { fontSize: 9.5, textColor: colorA });
    cell(doc, xC, ry, w3, rowH, border, labelB, { fill: "#F1F2F4", bold: true, fontSize: 9 });
    cell(doc, xD, ry, w4, rowH, border, valueB, { fontSize: 9.5, textColor: colorB });
    ry += rowH;
  };

  pairRow("Payé à", data.establishmentName, "Date de règlement", data.date);
  pairRow("Numéro de reçu", data.receiptNumber, "Montant payé", `${formatAmount(data.amountPaid)} GNF`, ink, "#1E7A4C");
  pairRow("Mode de paiement", data.paymentMethodLabel, "Reçu par (caissier)", data.recordedByName);

  cell(doc, xA, ry, w1, rowH, border, "Reçu de", { fill: "#F1F2F4", bold: true, fontSize: 9 });
  cell(doc, xB, ry, w2 + w3 + w4, rowH, border, `${data.studentName} — ${data.matricule} — ${data.filiereLevel}`, {
    fontSize: 9.5,
  });
  ry += rowH;

  const subHeaderH = SUB_HEADER_H;
  cell(doc, xA, ry, w1 + w2 + w3, subHeaderH, border, "INFO SUR LE COMPTE", {
    fill: SUBBANNER_COLOR,
    textColor: "#FFFFFF",
    bold: true,
    align: "center",
    fontSize: 8.5,
  });
  cell(doc, xD, ry, w4, subHeaderH, border, "PAIEMENT POUR", {
    fill: SUBBANNER_COLOR,
    textColor: "#FFFFFF",
    bold: true,
    align: "center",
    fontSize: 8.5,
  });
  ry += subHeaderH;

  const statRowH = STAT_ROW_H;
  const statW = (w1 + w2 + w3) / 3;
  cell(doc, xA, ry, statW, statRowH, border, formatAmount(data.balanceBefore), {
    align: "center",
    bold: true,
    sub: "Solde avant",
    subColor: "#6B7280",
  });
  cell(doc, xA + statW, ry, statW, statRowH, border, formatAmount(data.amountPaid), {
    align: "center",
    bold: true,
    textColor: "#1E7A4C",
    sub: "Ce paiement",
  });
  cell(doc, xA + statW * 2, ry, statW, statRowH, border, formatAmount(data.remaining), {
    align: "center",
    bold: true,
    textColor: "#B3261E",
    sub: "Solde dû",
  });
  cell(doc, xD, ry, w4, statRowH, border, data.objectLabel, {
    fontSize: 9,
    sub: `Prochaine échéance : ${data.nextDueDate}`,
  });
  ry += statRowH;

  const lettersRowH = LETTERS_ROW_H;
  cell(doc, xA, ry, w1, lettersRowH, border, "Montant en lettres", { fill: "#F1F2F4", bold: true, fontSize: 9 });
  doc.rect(xB, ry, w2 + w3 + w4, lettersRowH).lineWidth(0.5).strokeColor(border).stroke();
  doc
    .font("Helvetica-Oblique")
    .fontSize(9)
    .fillColor(ink)
    .text(data.amountInWords, xB + 6, ry + (lettersRowH - 9) / 2, { width: w2 + w3 + w4 - 12, lineBreak: false, ellipsis: true });
  ry += lettersRowH;

  // Case signature = exactement 2 lignes standard, pas plus (2026-08-10, retour du porteur du
  // projet) ; le pied de page "Aucune somme versée..." reprend lui aussi la hauteur d'une ligne
  // standard au lieu d'un cadre disproportionné — la carte s'arrête juste après, sans reliquat vide.
  const signatureRowH = SIGNATURE_ROW_H;
  cell(doc, xA, ry, w1, signatureRowH, border, "Signature et cachet", { fill: "#F1F2F4", bold: true, fontSize: 9 });
  doc.rect(xB, ry, w2 + w3 + w4, signatureRowH).lineWidth(0.5).strokeColor(border).stroke();
  ry += signatureRowH;

  cell(doc, xA, ry, w, rowH, border, "Aucune somme versée n'est remboursable.", {
    align: "center",
    italic: true,
    fontSize: 8.5,
    textColor: "#6B7280",
  });

  doc.fillColor(ink);
}
