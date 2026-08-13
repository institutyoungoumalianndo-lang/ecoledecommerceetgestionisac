import type { CampusSettingsDto, EstablishmentSettingsDto, InstitutionalHeaderSettingsDto, StudentCardTemplateDto } from "@isac-erp/shared";
import { formatAmount, resolveUploadPath } from "./pdfEngine.js";
import { CARD_HEIGHT_MM, CARD_WIDTH_MM, MM_TO_PT, computeCardLayout, drawStripe, renderFoldAndCropMarks } from "./studentCardEngine.js";

export { CARD_HEIGHT_MM, CARD_WIDTH_MM, MM_TO_PT, computeCardLayout, renderFoldAndCropMarks };

// Palette propre à la carte de paiement (2026-07-30, retour du porteur du projet) — bandeaux et lignes
// de tableau en vert (au lieu du bleu marine de la carte d'étudiant), fond Face A vert clair.
const GREEN_BAND = "#0F6B3A";
const LIGHT_GREEN_BG = "#E8F5E9";

/**
 * Moteur de rendu de la carte de paiement (extension du 2026-07-30, retour du porteur du projet) —
 * "même modèle" que la carte d'étudiant (MODULE-09.1) : mêmes dimensions/couleurs/bandeaux, mais Face A
 * remplace téléphone/date de naissance/date d'inscription par les montants scolarité/inscription, et
 * Face B remplace le cadre de signature du Directeur par un tableau d'échéancier (tranche/montant/
 * signature manuscrite). Aucun cycle de vie propre (contrairement à `StudentCard`) : chaque génération
 * est simplement archivée dans `GeneratedDocument`, la carte physique étant ensuite signée à la main
 * tranche par tranche au fil des paiements.
 */

export interface PaymentCardRenderContext {
  header: InstitutionalHeaderSettingsDto;
  establishment: EstablishmentSettingsDto;
  campus: CampusSettingsDto;
  template: StudentCardTemplateDto;
}

export interface PaymentCardTranche {
  label: string;
  amount: number;
}

export interface PaymentCardRenderData {
  studentLastName: string;
  studentFirstName: string;
  studentMatricule: string;
  studentPhotoPath: string | null;
  filiereName: string;
  levelLabel: string;
  scolariteAmount: number;
  inscriptionAmount: number;
  tranches: PaymentCardTranche[];
  academicYearLabel: string;
}

/**
 * Face A (recto) — identique à la carte d'étudiant (en-tête, bandeau titre, photo/logo, bandeau de
 * contact), à l'exception des champs d'identité : téléphone/date de naissance/date d'inscription sont
 * remplacés par les montants de scolarité et d'inscription (2026-07-30, retour du porteur du projet).
 */
function renderFront(
  doc: PDFKit.PDFDocument,
  ctx: PaymentCardRenderContext,
  data: PaymentCardRenderData,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const { header, establishment, template } = ctx;
  doc.rect(x, y, w, h).lineWidth(1).stroke("#B91C1C");
  doc.save().rect(x, y, w, h).clip();

  // Fond vert clair propre à la Face A de la carte de paiement (2026-07-30, retour du porteur du projet).
  doc.rect(x, y, w, h).fill(LIGHT_GREEN_BG);

  const stripeWidth = template.showGuineaStripes ? 3 * MM_TO_PT : 0;
  if (template.showGuineaStripes) drawStripe(doc, x, y, stripeWidth, h);

  const contentX = x + stripeWidth + 3;
  const contentW = w - stripeWidth - 6;

  let cy = y + 4;
  doc.font("Helvetica-Bold").fontSize(4.8).fillColor(header.republicColor).text(header.republicLine, contentX, cy, {
    width: contentW,
    align: "center",
    lineBreak: false,
  });
  cy += 5.5;
  doc.font("Helvetica").fontSize(4.2);
  const mottoParts = [
    { text: header.mottoPart1, color: header.mottoPart1Color },
    { text: " – ", color: "#374151" },
    { text: header.mottoPart2, color: header.mottoPart2Color },
    { text: " – ", color: "#374151" },
    { text: header.mottoPart3, color: header.mottoPart3Color },
  ];
  const mottoWidth = mottoParts.reduce((sum, part) => sum + doc.widthOfString(part.text), 0);
  let mottoX = contentX + (contentW - mottoWidth) / 2;
  for (const part of mottoParts) {
    doc.fillColor(part.color).text(part.text, mottoX, cy, { lineBreak: false, continued: false });
    mottoX += doc.widthOfString(part.text);
  }
  cy += 5;
  doc
    .font("Helvetica-Bold")
    .fontSize(5.8)
    .fillColor(header.schoolNameColor)
    .text(header.schoolNameLine, contentX, cy, { width: contentW, align: "center", lineGap: 0.5 });
  cy = doc.y + 0.5;
  doc
    .font("Helvetica")
    .fontSize(4.8)
    .fillColor(header.instituteNameColor)
    .text(header.instituteNameLine, contentX, cy, { width: contentW, align: "center", lineGap: 0.5 });
  cy = doc.y + 0.5;
  doc
    .font("Helvetica-Oblique")
    .fontSize(4.2)
    .fillColor(header.taglineColor)
    .text(header.taglineLine, contentX, cy, { width: contentW, align: "center" });
  cy = doc.y + 3;

  const titleBarHeight = 13 * 1.3 * 1.2;
  doc.rect(x, cy, w, titleBarHeight).fill(GREEN_BAND);
  doc
    .font("Helvetica-Bold")
    .fontSize(8 * 1.2 * 1.25)
    .fillColor("#FFFFFF")
    .text("CARTE DE PAIEMENT", x, cy + titleBarHeight * 0.28, { width: w, align: "center" });
  cy += titleBarHeight + 5;

  const photoSize = contentW * 0.4 * 1.3;
  const logo = resolveUploadPath(establishment.logoSecondaryPath) ?? resolveUploadPath(establishment.logoPrimaryPath);
  const photoPath = resolveUploadPath(data.studentPhotoPath);
  if (photoPath) {
    doc.image(photoPath, contentX, cy, { fit: [photoSize, photoSize] });
  } else {
    doc.rect(contentX, cy, photoSize, photoSize).stroke("#9CA3AF");
  }
  if (logo) {
    doc.image(logo, contentX + contentW - photoSize, cy, { fit: [photoSize, photoSize] });
  }
  const photoBottomY = cy + photoSize + 8;

  const bottomBarHeight = 11 * 1.3 * 1.2;
  const bottomBarY = y + h - bottomBarHeight;

  // Champs identité — mêmes police/interligne que la carte d'étudiant, mais téléphone/date de
  // naissance/date d'inscription remplacés par les montants scolarité/inscription (2026-07-30, retour
  // du porteur du projet).
  const fieldFontSize = 4.6 * 1.2 * 1.2;
  const fieldRowHeight = 6 * 1.02 * 1.15 * 1.2 * 1.15;
  const fieldCount = 7;
  const fieldsBlockHeight = fieldCount * fieldRowHeight;
  cy = Math.max(photoBottomY, bottomBarY - fieldsBlockHeight - 4);
  const field = (label: string, value: string) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(fieldFontSize)
      .fillColor("#0B1F44")
      .text(`${label}`, contentX, cy, { width: contentW * 0.42, lineBreak: false });
    doc
      .font("Helvetica")
      .fontSize(fieldFontSize)
      .fillColor("#111827")
      .text(`: ${value}`, contentX + contentW * 0.42, cy, { width: contentW * 0.58, lineBreak: false, ellipsis: true });
    cy += fieldRowHeight;
  };
  field("NOM", data.studentLastName);
  field("PRÉNOM(S)", data.studentFirstName);
  field("MATRICULE", data.studentMatricule);
  field("FILIÈRE", data.filiereName);
  field("NIVEAU", data.levelLabel);
  field("SCOLARITÉ", formatAmount(data.scolariteAmount));
  field("INSCRIPTION", formatAmount(data.inscriptionAmount));
  doc.rect(x, bottomBarY, w, bottomBarHeight).fill(GREEN_BAND);
  // Mention légale remplaçant les coordonnées de contact sur cette carte (2026-07-30, retour du porteur du projet).
  doc
    .font("Helvetica")
    .fontSize(3.8 * 1.2)
    .fillColor("#FFFFFF")
    .text("(Tout paiement effectué est non remboursable)", x + 3, bottomBarY + bottomBarHeight * 0.32, { width: w - 6, align: "center" });

  // Le remplissage des bandeaux (x à x+w, pleine largeur) empiète légèrement sur le contour rouge de la
  // carte — on le redessine par-dessus pour qu'il reste toujours visible (2026-07-30, retour du porteur
  // du projet).
  doc.rect(x, y, w, h).lineWidth(1).stroke("#B91C1C");

  doc.restore();
  doc.fillColor("#000000");
}

/**
 * Face B (verso) — identique à la carte d'étudiant (bandeau campus, adresse, bandeau bas), à
 * l'exception du cadre de signature du Directeur : remplacé par un tableau d'échéancier à 3 colonnes
 * (Tranche/Montant/Signature), la colonne Signature restant volontairement vide pour une signature
 * manuscrite à chaque tranche payée. Le QR code est retiré et le tableau est étiré pour occuper tout
 * l'espace ainsi libéré ; la mention "LE SERVICE SCOLARITÉ" (rouge) est insérée entre le bandeau du
 * campus et le tableau (2026-07-30, retour du porteur du projet). Le bandeau bas affiche l'année
 * universitaire plutôt qu'une date d'expiration, non pertinente pour ce type de carte.
 */
function renderBack(doc: PDFKit.PDFDocument, ctx: PaymentCardRenderContext, data: PaymentCardRenderData, x: number, y: number, w: number, h: number): void {
  const { campus } = ctx;
  doc.rect(x, y, w, h).lineWidth(1).stroke("#B91C1C");
  doc.save().rect(x, y, w, h).clip();

  const topBarHeight = 20 * 1.3 * 1.2;
  doc.rect(x, y, w, topBarHeight).fill(GREEN_BAND);
  doc
    .font("Helvetica-Bold")
    .fontSize(8 * 1.2 * 1.25)
    .fillColor("#FFFFFF")
    .text(campus.name.toUpperCase(), x + 3, y + topBarHeight * 0.35, { width: w - 6, align: "center" });

  const contentX = x + 6;
  const contentW = w - 12;
  let cy = y + topBarHeight + 8;

  if (campus.address) {
    doc.font("Helvetica").fontSize(4.5).fillColor("#111827").text(campus.address, contentX, cy, { width: contentW, align: "center" });
    cy = doc.y + 8;
  }

  doc.font("Helvetica-Bold").fontSize(5).fillColor("#B91C1C").text("LE SERVICE SCOLARITÉ", contentX, cy, { width: contentW, align: "center" });
  cy = doc.y + 6;

  const bottomBarHeight = 11 * 1.3 * 1.2;
  const bottomBarY = y + h - bottomBarHeight;

  // Tableau d'échéancier — étiré pour occuper tout l'espace jusqu'au bandeau bas, y compris la place
  // libérée par le retrait du QR code (2026-07-30, retour du porteur du projet).
  const tableHeight = bottomBarY - cy;
  const rowCount = data.tranches.length + 1;
  const rowHeight = tableHeight / rowCount;
  const col1W = contentW * 0.34;
  const col2W = contentW * 0.34;
  const col3W = contentW - col1W - col2W;
  const tableFontSize = 4.6;

  doc.rect(contentX, cy, contentW, rowHeight).fill(GREEN_BAND);
  doc.font("Helvetica-Bold").fontSize(tableFontSize).fillColor("#FFFFFF");
  doc.text("TRANCHE", contentX, cy + rowHeight * 0.32, { width: col1W, align: "center" });
  doc.text("MONTANT", contentX + col1W, cy + rowHeight * 0.32, { width: col2W, align: "center" });
  doc.text("SIGNATURE", contentX + col1W + col2W, cy + rowHeight * 0.32, { width: col3W, align: "center" });

  let rowY = cy + rowHeight;
  for (const tranche of data.tranches) {
    doc.rect(contentX, rowY, contentW, rowHeight).fillAndStroke("#FFFFFF", GREEN_BAND);
    doc
      .font("Helvetica-Bold")
      .fontSize(tableFontSize)
      .fillColor(GREEN_BAND)
      .text(tranche.label, contentX, rowY + rowHeight * 0.32, { width: col1W, align: "center" });
    doc
      .font("Helvetica")
      .fontSize(tableFontSize)
      .fillColor("#111827")
      .text(formatAmount(tranche.amount), contentX + col1W, rowY + rowHeight * 0.32, { width: col2W, align: "center", ellipsis: true });
    // Colonne Signature volontairement vide (2026-07-30, retour du porteur du projet).
    rowY += rowHeight;
  }
  doc
    .save()
    .lineWidth(0.5)
    .strokeColor(GREEN_BAND)
    .moveTo(contentX + col1W, cy)
    .lineTo(contentX + col1W, cy + tableHeight)
    .stroke()
    .moveTo(contentX + col1W + col2W, cy)
    .lineTo(contentX + col1W + col2W, cy + tableHeight)
    .stroke()
    .rect(contentX, cy, contentW, tableHeight)
    .stroke()
    .restore();

  doc.rect(x, bottomBarY, w, bottomBarHeight).fill(GREEN_BAND);
  doc
    .font("Helvetica-Bold")
    .fontSize(4.5 * 1.2 * 1.25)
    .fillColor("#FFFFFF")
    .text(`Année universitaire : ${data.academicYearLabel}`, x, bottomBarY + 3.5, { width: w, align: "center" });

  // Même correction que sur la Face A : le contour rouge est redessiné par-dessus les bandeaux pour ne
  // jamais être masqué (2026-07-30, retour du porteur du projet).
  doc.rect(x, y, w, h).lineWidth(1).stroke("#B91C1C");

  doc.restore();
  doc.fillColor("#000000");
}

/** Dessine une paire recto/verso complète sur la page courante du document, à l'emplacement calculé par `computeCardLayout`. */
export function renderPaymentCardPage(doc: PDFKit.PDFDocument, ctx: PaymentCardRenderContext, data: PaymentCardRenderData): void {
  const layout = computeCardLayout(doc.page.width, doc.page.height);
  renderFront(doc, ctx, data, layout.frontX, layout.y, layout.cardWidthPt, layout.cardHeightPt);
  renderBack(doc, ctx, data, layout.backX, layout.y, layout.cardWidthPt, layout.cardHeightPt);
  renderFoldAndCropMarks(doc, layout);
}
