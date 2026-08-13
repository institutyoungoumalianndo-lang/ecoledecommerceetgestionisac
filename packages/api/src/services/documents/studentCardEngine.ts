import { randomInt } from "node:crypto";
import type {
  CampusSettingsDto,
  DocumentSignatoryDto,
  EstablishmentSettingsDto,
  InstitutionalHeaderSettingsDto,
  OfficialStampDto,
  StudentCardTemplateDto,
} from "@isac-erp/shared";
import { formatDateFr, humanizeSignatoryRole, resolveUploadPath } from "./pdfEngine.js";

/**
 * Moteur de rendu de la carte d'étudiant (MODULE-09.1) — mise en page fixe et dédiée, distincte de
 * `pdfEngine.renderInstitutionalHeader`/`renderDocumentTitle` (archétype recto/verso compact, format
 * carte 54×86mm, fidèle à la maquette validée le 2026-07-30, voir MODULE-09.1 §1.4/§6). Aucun autre
 * module ne dessine cette carte directement — `studentCardService.ts` est le seul point d'entrée.
 */

export const MM_TO_PT = 2.834645669;
export const CARD_WIDTH_MM = 54;
export const CARD_HEIGHT_MM = 86;
// Écart réduit au minimum (2026-07-30, retour du porteur du projet) — juste assez pour la ligne de
// pliage pointillée, les deux faces doivent presque se toucher.
const GAP_MM = 3;

const GUINEA_COLORS = ["#CE1126", "#FCD116", "#009460"];

export interface StudentCardRenderContext {
  header: InstitutionalHeaderSettingsDto;
  establishment: EstablishmentSettingsDto;
  campus: CampusSettingsDto;
  template: StudentCardTemplateDto;
  stamp: OfficialStampDto;
  signatory: DocumentSignatoryDto | null;
}

export interface StudentCardRenderData {
  studentLastName: string;
  studentFirstName: string;
  studentMatricule: string;
  studentPhotoPath: string | null;
  filiereName: string;
  levelLabel: string;
  studentBirthDate: Date | null;
  enrollmentDate: Date;
  studentPhone: string | null;
  /** Année scolaire de l'inscription active — affichée sur le bandeau du bas du recto (2026-07-31,
   * retour du porteur du projet : "devra afficher l'année scolaire concernée"). */
  academicYearLabel: string;
  cardNumber: string;
  issuedAt: Date;
  expiresAt: Date;
  qrImageBuffer: Buffer;
}

/** Code de vérification haute entropie (MODULE-09.1 §2), distinct du numéro séquentiel — pour une saisie manuelle sans scanner. Alphabet sans caractères ambigus (0/O, 1/I). */
export function generateVerificationCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[randomInt(alphabet.length)];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Calcule la position (en points) des deux faces sur une page A4 portrait, centrées horizontalement,
 * avec une pliure quasi inexistante entre les deux. Placées dans la première moitié de la feuille
 * (2026-07-30, retour du porteur du projet), pas centrées sur toute la hauteur de page.
 */
export function computeCardLayout(pageWidthPt: number, pageHeightPt: number) {
  const cardWidthPt = CARD_WIDTH_MM * MM_TO_PT;
  const cardHeightPt = CARD_HEIGHT_MM * MM_TO_PT;
  const gapPt = GAP_MM * MM_TO_PT;
  const totalWidthPt = cardWidthPt * 2 + gapPt;
  const startX = (pageWidthPt - totalWidthPt) / 2;
  const startY = (pageHeightPt / 2 - cardHeightPt) / 2;
  return {
    cardWidthPt,
    cardHeightPt,
    gapPt,
    frontX: startX,
    backX: startX + cardWidthPt + gapPt,
    y: startY,
    foldX: startX + cardWidthPt + gapPt / 2,
  };
}

/** Repères de pliage/découpe (§ "Format d'impression") — ligne pointillée verticale + petits traits aux coins des cartes. */
export function renderFoldAndCropMarks(doc: PDFKit.PDFDocument, layout: ReturnType<typeof computeCardLayout>): void {
  const { foldX, y, cardHeightPt, cardWidthPt, frontX, backX } = layout;
  doc
    .save()
    .strokeColor("#9CA3AF")
    .lineWidth(0.5)
    .dash(3, { space: 2 })
    .moveTo(foldX, y - 10)
    .lineTo(foldX, y + cardHeightPt + 10)
    .stroke()
    .undash()
    .restore();

  const tick = 6;
  const corners: [number, number][] = [
    [frontX, y],
    [frontX + cardWidthPt, y],
    [frontX, y + cardHeightPt],
    [frontX + cardWidthPt, y + cardHeightPt],
    [backX, y],
    [backX + cardWidthPt, y],
    [backX, y + cardHeightPt],
    [backX + cardWidthPt, y + cardHeightPt],
  ];
  doc.save().strokeColor("#9CA3AF").lineWidth(0.5);
  for (const [cx, cy] of corners) {
    doc.moveTo(cx - tick, cy).lineTo(cx + tick, cy).stroke();
    doc.moveTo(cx, cy - tick).lineTo(cx, cy + tick).stroke();
  }
  doc.restore();
}

/** Bande tricolore guinéenne — réutilisée telle quelle par `paymentCardEngine.ts` (même modèle visuel). */
export function drawStripe(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number): void {
  const bandHeight = height / GUINEA_COLORS.length;
  GUINEA_COLORS.forEach((color, i) => {
    doc.rect(x, y + i * bandHeight, width, bandHeight + 0.5).fill(color);
  });
}

/**
 * Fond "carte bombée" (2026-07-31, retour du porteur du projet — maquette "Carte bombée" retenue
 * parmi plusieurs pistes "plus 3D") : dégradé radial clair au lieu d'un fond blanc plat, plus une
 * vignette (dégradé radial marine très translucide) qui assombrit légèrement les bords — donne
 * l'impression d'une carte plastique légèrement bombée. Peint avant le contenu de la face, à
 * l'intérieur de la zone déjà découpée (`clip()`), donc sans affecter le contour rouge existant.
 */
function drawBombedBackground(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number): void {
  const base = doc
    .radialGradient(x + w * 0.32, y + h * 0.16, 0, x + w * 0.32, y + h * 0.16, Math.max(w, h) * 0.95)
    .stop(0, "#FFFFFF")
    .stop(0.55, "#F4F6FA")
    .stop(1, "#E4E8F1");
  doc.rect(x, y, w, h).fill(base);
  const vignette = doc
    .radialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.35, x + w / 2, y + h / 2, Math.max(w, h) * 0.8)
    .stop(0, "#12213F", 0)
    .stop(1, "#12213F", 0.16);
  doc.rect(x, y, w, h).fill(vignette);
}

/**
 * Filigrane discret du logo du ministère (2026-07-31, retour du porteur du projet, verso uniquement)
 * — opacité très faible, centré, dessiné avant le contenu du verso pour rester en arrière-plan.
 * Silencieux si aucun logo de ministère n'est configuré (`EstablishmentSettingsDto.ministryLogoPath`).
 */
function drawMinistryWatermark(doc: PDFKit.PDFDocument, logoPath: string | null, x: number, y: number, w: number, h: number): void {
  if (!logoPath) return;
  const size = Math.min(w, h) * 0.62;
  doc.save();
  // Opacité relevée de 0.06 à 0.15 le 2026-07-31, puis à 0.32 le 2026-08-02 (retour du porteur du
  // projet, encore "trop transparent" au second tirage).
  doc.opacity(0.32);
  doc.image(logoPath, x + (w - size) / 2, y + (h - size) / 2, { fit: [size, size] });
  doc.opacity(1);
  doc.restore();
}

/**
 * Rectangle à coins arrondis asymétriques (2026-07-31, retour du porteur du projet, cadre de
 * signature du verso) : `pdfkit` n'accepte qu'un seul rayon pour les 4 coins via `.roundedRect()` —
 * tracé manuel du contour pour n'arrondir que les coins haut-droit et bas-gauche, les deux autres
 * restant nets.
 */
function strokeDiagonalRoundedRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, radius: number): void {
  doc
    .moveTo(x, y)
    .lineTo(x + w - radius, y)
    .quadraticCurveTo(x + w, y, x + w, y + radius)
    .lineTo(x + w, y + h)
    .lineTo(x + radius, y + h)
    .quadraticCurveTo(x, y + h, x, y + h - radius)
    .lineTo(x, y)
    .closePath()
    .stroke();
}

/**
 * Face A (recto) — refonte du 2026-07-30 sur la base de la seconde maquette validée : en-tête
 * institutionnelle centrée (sans logo dans l'en-tête), bandeau titre "CARTE ÉTUDIANT", photo et logo
 * côte à côte, champs identité (dont date de naissance et date d'inscription, réintégrées), bandeau
 * de contact en bas. Le numéro de carte n'est plus affiché en évidence sur cette face (voir verso).
 */
function renderFront(
  doc: PDFKit.PDFDocument,
  ctx: StudentCardRenderContext,
  data: StudentCardRenderData,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const { header, establishment, template } = ctx;
  doc.rect(x, y, w, h).lineWidth(1).stroke("#B91C1C");
  doc.save().rect(x, y, w, h).clip();
  drawBombedBackground(doc, x, y, w, h);

  const stripeWidth = template.showGuineaStripes ? 3 * MM_TO_PT : 0;
  if (template.showGuineaStripes) drawStripe(doc, x, y, stripeWidth, h);

  const contentX = x + stripeWidth + 3;
  const contentW = w - stripeWidth - 6;

  // En-tête institutionnelle — centrée, sans logo (le logo apparaît plus bas, à côté de la photo).
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

  // Bandeau titre "CARTE ÉTUDIANT" — hauteur +30% puis +20% (2026-07-30), police +20% puis +25% (2026-07-30, retour du porteur du projet).
  // Corrigé le 2026-07-31 (retour du porteur du projet) : le bandeau démarrait à `x` sur toute la
  // largeur `w`, peignant du marine par-dessus la bande tricolore — recadré pour commencer après elle.
  const titleBarHeight = 13 * 1.3 * 1.2;
  doc.rect(x + stripeWidth, cy, w - stripeWidth, titleBarHeight).fill("#0B1F44");
  doc
    .font("Helvetica-Bold")
    .fontSize(8 * 1.2 * 1.25)
    .fillColor("#FFFFFF")
    .text("CARTE ÉTUDIANT", x + stripeWidth, cy + titleBarHeight * 0.28, { width: w - stripeWidth, align: "center" });
  cy += titleBarHeight + 5;

  // Photo à l'extrémité gauche, logo à l'extrémité droite — encore agrandis de 30% (2026-07-30, retour
  // du porteur du projet), largeur et hauteur toutes deux augmentées.
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

  // Bandeau de contact bas — hauteur +30% puis +20%, police +20%.
  const bottomBarHeight = 11 * 1.3 * 1.2;
  const bottomBarY = y + h - bottomBarHeight;

  // Champs identité — police +20% puis +20% (soit x1.44 cumulé), interligne +2% puis +15% puis +20% puis
  // +15%, un numéro de champs supplémentaire (nom et prénom séparés), renvoyés vers le bas de la face pour
  // occuper l'espace inférieur (2026-07-30, retour du porteur du projet). Encore +15% le 2026-07-31
  // (retour du porteur du projet, maquette "Carte bombée").
  const fieldFontSize = 4.6 * 1.2 * 1.2 * 1.15;
  const fieldRowHeight = 6 * 1.02 * 1.15 * 1.2 * 1.15;
  const fieldCount = 8;
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
  field("NÉ(E) LE", data.studentBirthDate ? formatDateFr(data.studentBirthDate) : "—");
  field("INSCRIT(E) LE", formatDateFr(data.enrollmentDate));
  field("TÉLÉPHONE", data.studentPhone ?? "—");
  // Corrigé le 2026-07-31 (retour du porteur du projet) : recadré après la bande tricolore (même
  // correction que le bandeau titre) ; affiche désormais l'année scolaire concernée plutôt que les
  // coordonnées de contact (déjà présentes ailleurs dans les documents administratifs).
  doc.rect(x + stripeWidth, bottomBarY, w - stripeWidth, bottomBarHeight).fill("#0B1F44");
  const contactText = `Année scolaire ${data.academicYearLabel}`;
  doc
    .font("Helvetica-Bold")
    // Police doublée le 2026-08-02 (retour du porteur du projet : "trop petite").
    .fontSize(3.8 * 1.2 * 2)
    .fillColor("#FFFFFF")
    .text(contactText, x + stripeWidth + 3, bottomBarY + bottomBarHeight * 0.32, { width: w - stripeWidth - 6, align: "center" });

  doc.restore();
  doc.fillColor("#000000");
}

/**
 * Face B (verso) — refonte du 2026-07-30 : nom du campus en grand bandeau, adresse, cadre de
 * signature du Directeur de Campus, QR code centré, mention de validité en bas. Les mentions légales
 * détaillées de la première maquette sont retirées (portée réduite, conforme à la seconde maquette).
 */
function renderBack(doc: PDFKit.PDFDocument, ctx: StudentCardRenderContext, data: StudentCardRenderData, x: number, y: number, w: number, h: number): void {
  const { establishment, campus, signatory } = ctx;
  doc.rect(x, y, w, h).lineWidth(1).stroke("#B91C1C");
  doc.save().rect(x, y, w, h).clip();
  drawBombedBackground(doc, x, y, w, h);
  drawMinistryWatermark(doc, resolveUploadPath(establishment.ministryLogoPath), x, y, w, h);

  // Bandeau nom du campus — même bleu que le bandeau "CARTE ÉTUDIANT" du recto (déjà #0B1F44 des deux
  // côtés) — hauteur +30% puis +20%, police +20% puis +25% (2026-07-30, retour du porteur du projet).
  const topBarHeight = 20 * 1.3 * 1.2;
  doc.rect(x, y, w, topBarHeight).fill("#0B1F44");
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

  // Bandeau validité — étiré une nouvelle fois le 2026-07-31 (retour du porteur du projet : "on doit y
  // écrire quelque chose") en plus des augmentations du 2026-07-30 (+30% puis +20%, police +20% puis +25%).
  const bottomBarHeight = 11 * 1.3 * 1.2 * 1.3;
  const bottomBarY = y + h - bottomBarHeight;

  // Cadre signature = 50% de la hauteur de la face (2026-07-30, retour du porteur du projet) — contenu
  // réparti proportionnellement pour occuper tout le cadre, pas seulement des décalages fixes. Épaissi et
  // recoloré au bleu du bandeau d'entête, coins haut-droit/bas-gauche arrondis à 40%, coins haut-gauche/
  // bas-droit nets (2026-07-31, retour du porteur du projet — pdfkit ne supporte qu'un rayon unique via
  // `.roundedRect()`, d'où le tracé manuel de `strokeDiagonalRoundedRect`).
  const sigBoxHeight = h * 0.5;
  doc.lineWidth(2).strokeColor("#0B1F44");
  strokeDiagonalRoundedRect(doc, contentX, cy, contentW, sigBoxHeight, Math.min(contentW, sigBoxHeight) * 0.4);
  // Titre du signataire — mention simplifiée "Le Directeur" (au lieu de "Le Directeur de Campus", qui
  // reste inchangée sur les autres documents, non concernés par cette demande), police +15% puis +20%
  // (2026-07-30, retour du porteur du projet).
  const signatoryTitle = signatory
    ? (signatory.title ?? (signatory.roleCode === "DIRECTEUR_CAMPUS" ? "Le Directeur" : humanizeSignatoryRole(signatory.roleCode)))
    : "Le Directeur";
  doc
    .font("Helvetica-Bold")
    .fontSize(5.2 * 1.15 * 1.2)
    .fillColor("#0B1F44")
    .text(signatoryTitle, contentX, cy + sigBoxHeight * 0.1, {
      width: contentW,
      align: "center",
    });
  const signatureImage = signatory ? resolveUploadPath(signatory.signatureImagePath) : null;
  if (signatureImage) {
    // Hauteur et largeur de la signature +20% puis +30% (2026-07-30, retour du porteur du projet).
    const sigImgWidth = contentW * 0.6 * 1.2 * 1.3;
    const sigImgHeight = sigBoxHeight * 0.35 * 1.2 * 1.3;
    doc.image(signatureImage, contentX + (contentW - sigImgWidth) / 2, cy + sigBoxHeight * 0.32, {
      fit: [sigImgWidth, sigImgHeight],
    });
  }
  if (signatory?.displayName) {
    doc.font("Helvetica-Bold").fontSize(5.2).fillColor("#111827").text(signatory.displayName, contentX, cy + sigBoxHeight * 0.85, {
      width: contentW,
      align: "center",
    });
  }

  // QR redescendu — collé près du bandeau du bas plutôt que centré dans l'espace restant (2026-07-31,
  // retour du porteur du projet : "fais redescendre le code QR en bas"). Hauteur et largeur du QR code
  // +25% puis +20% (2026-07-30, retour du porteur du projet).
  const qrSize = 24 * 1.25 * 1.2;
  const qrBlockHeight = qrSize + 8;
  const qrY = bottomBarY - qrBlockHeight - 4;
  doc.image(data.qrImageBuffer, contentX + contentW / 2 - qrSize / 2, qrY, { fit: [qrSize, qrSize] });
  doc
    .font("Helvetica")
    .fontSize(3.4)
    .fillColor("#6B7280")
    .text(data.cardNumber, contentX, qrY + qrSize + 3, { width: contentW, align: "center" });
  doc.rect(x, bottomBarY, w, bottomBarHeight).fill("#0B1F44");
  doc
    .font("Helvetica-Bold")
    .fontSize(4.5 * 1.2 * 1.25)
    .fillColor("#FFFFFF")
    .text(`Expire le : ${formatDateFr(data.expiresAt)}`, x, bottomBarY + 3.5, { width: w, align: "center" });

  doc.restore();
  doc.fillColor("#000000");
}

/** Dessine une paire recto/verso complète sur la page courante du document, à l'emplacement calculé par `computeCardLayout`. */
export function renderStudentCardPage(
  doc: PDFKit.PDFDocument,
  ctx: StudentCardRenderContext,
  data: StudentCardRenderData
): void {
  const layout = computeCardLayout(doc.page.width, doc.page.height);
  renderFront(doc, ctx, data, layout.frontX, layout.y, layout.cardWidthPt, layout.cardHeightPt);
  renderBack(doc, ctx, data, layout.backX, layout.y, layout.cardWidthPt, layout.cardHeightPt);
  renderFoldAndCropMarks(doc, layout);
}
