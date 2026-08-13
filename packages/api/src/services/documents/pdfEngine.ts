import path from "node:path";
import { existsSync } from "node:fs";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type {
  CampusSettingsDto,
  DocumentSignatoryDto,
  DocumentTemplateDto,
  EstablishmentSettingsDto,
  InstitutionalHeaderSettingsDto,
  OfficialStampDto,
  PrintThemeSettingsDto,
} from "@isac-erp/shared";
import { UPLOADS_DIR } from "../../uploads/storage.js";

/**
 * Primitives de rendu du moteur PDF centralisé (MODULE-09). Un seul point d'accès à `pdfkit` dans
 * tout le monorepo — aucun autre module ne doit importer `pdfkit` directement (§16 contraintes
 * techniques : "aucun module ne devra générer directement ses propres PDF").
 */

const MM_TO_PT = 2.834645669;

export interface DocumentRenderContext {
  header: InstitutionalHeaderSettingsDto;
  printTheme: PrintThemeSettingsDto;
  establishment: EstablishmentSettingsDto;
  campus: CampusSettingsDto;
  template: DocumentTemplateDto;
  stamp: OfficialStampDto;
  signatory: DocumentSignatoryDto | null;
  /**
   * `doc.y` juste après l'en-tête institutionnel, avant le titre du document (renseigné par
   * `documentEngineService.ts` entre les deux appels — 2026-08-06, retour du porteur du projet).
   * Permet à un générateur bespoke de dessiner un cadre qui n'entoure que l'en-tête institutionnel,
   * sans englober le titre (voir contratCddAdministratif.ts et les deux autres contrats).
   */
  headerBottomY?: number;
}

/** Résout un chemin `/uploads/...` renvoyé par le stockage en chemin disque absolu, ou `null` si absent/introuvable. */
export function resolveUploadPath(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  const relative = relativePath.replace(/^\/uploads\//, "");
  const absolute = path.join(UPLOADS_DIR, relative);
  return existsSync(absolute) ? absolute : null;
}

export function createDocument(ctx: DocumentRenderContext): PDFKit.PDFDocument {
  const { printTheme } = ctx;
  return new PDFDocument({
    size: printTheme.paperFormat === "LETTRE" ? "LETTER" : "A4",
    layout: printTheme.orientation === "PAYSAGE" ? "landscape" : "portrait",
    margin: printTheme.marginMm * MM_TO_PT,
    bufferPages: true,
    // `autoFirstPage` par défaut crée déjà une page 1 ; combiné avec le `doc.addPage()` explicite de
    // `renderDocumentToBuffer`, cela produisait systématiquement une page blanche fantôme en tête de
    // chaque document généré (bug constaté par le porteur du projet — corrigé le 2026-07-30).
    autoFirstPage: false,
  });
}

/** Crée le document avec les réglages de mise en page (format/orientation/marges), génère le contenu, et résout le PDF en mémoire. */
export async function renderDocumentToBuffer(
  ctx: DocumentRenderContext,
  build: (doc: PDFKit.PDFDocument, ctx: DocumentRenderContext) => void | Promise<void>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = createDocument(ctx);
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.addPage();
    Promise.resolve(build(doc, ctx))
      .then(() => doc.end())
      .catch(reject);
  });
}

/**
 * En-tête institutionnelle obligatoire (MODULE-09 §3/§4) : République/devise nationale tricolore,
 * nom de l'école, nom de l'institut, slogan — jamais codée en dur, entièrement pilotée par
 * `InstitutionalHeaderSettings`. Place aussi les logos (établissement/ministère/campus) selon le
 * modèle du type de document. Retourne le `doc.y` après l'en-tête pour que l'appelant enchaîne son contenu.
 *
 * Correction du 2026-07-30 (retour du porteur du projet) : le logo de l'école reste complètement à
 * gauche, tout logo secondaire (République/Ministère/campus/institution partenaire) passe désormais
 * complètement à droite — les deux logos encadrent visuellement l'en-tête, jamais regroupés du même
 * côté. Chaque ligne de texte est désormais dessinée avec un `x`/`width` explicites calculés depuis
 * l'empreinte réelle des logos (au lieu de laisser `pdfkit` déduire `doc.x` de l'appel précédent, ce
 * qui rétrécissait silencieusement la zone de texte après le rendu de la devise multicolore et faisait
 * passer "ÉCOLE DE COMMERCE ET DE GESTION ISAC" sur deux lignes) : le texte est ainsi correctement
 * centré entre les deux logos, sur toute la largeur disponible, jamais décalé vers la droite.
 */
export function renderInstitutionalHeader(doc: PDFKit.PDFDocument, ctx: DocumentRenderContext): number {
  const { header, template, establishment, campus } = ctx;
  const marginLeft = doc.page.margins.left;
  const marginRight = doc.page.margins.right;
  const pageWidth = doc.page.width - marginLeft - marginRight;
  const top = doc.page.margins.top;
  const logoY = top;
  const logoSize = 46;
  const logoGutter = 10;

  const logoPrimary = template.showLogoPrimary ? resolveUploadPath(establishment.logoPrimaryPath) : null;
  const logoMinistry = resolveUploadPath(establishment.ministryLogoPath);
  const logoCampus = template.showCampusLogo ? resolveUploadPath(campus.logoPath) : null;
  const logoSecondary = template.showLogoSecondary ? resolveUploadPath(establishment.logoSecondaryPath) : null;

  // Gauche : uniquement le logo officiel de l'école. Droite : République/Ministère/campus/partenaire,
  // dans cet ordre de priorité — jamais mélangés avec le logo de l'école du même côté.
  const rightLogos = [logoMinistry, logoCampus, logoSecondary].filter((p): p is string => Boolean(p));

  if (logoPrimary) {
    doc.image(logoPrimary, marginLeft, logoY, { fit: [logoSize, logoSize] });
  }
  rightLogos.forEach((logoPath, index) => {
    const x = doc.page.width - marginRight - logoSize - index * (logoSize + 8);
    doc.image(logoPath, x, logoY, { fit: [logoSize, logoSize] });
  });

  // Zone de texte calculée entre les deux blocs de logos (pas entre les marges de page) — c'est cette
  // zone, et non la page entière, qui sert de référence pour le centrage exigé par le porteur du projet.
  const leftLogoWidth = logoPrimary ? logoSize + logoGutter : 0;
  const rightLogosWidth = rightLogos.length > 0 ? rightLogos.length * logoSize + (rightLogos.length - 1) * 8 + logoGutter : 0;
  const textAreaX = marginLeft + leftLogoWidth;
  const textAreaWidth = pageWidth - leftLogoWidth - rightLogosWidth;

  doc.font("Helvetica");
  const align = header.alignment === "LEFT" ? "left" : header.alignment === "RIGHT" ? "right" : "center";
  const textOptions = { align, width: textAreaWidth, lineGap: 2 } as const;

  let y = top;
  doc.fontSize(10).fillColor(header.republicColor).text(header.republicLine, textAreaX, y, textOptions);
  doc.moveDown(header.lineSpacing - 1);
  y = doc.y;

  doc.fontSize(10);
  const part1Width = doc.widthOfString(`${header.mottoPart1} – `);
  const part2Width = doc.widthOfString(`${header.mottoPart2} – `);
  const part3Width = doc.widthOfString(header.mottoPart3);
  const totalMottoWidth = part1Width + part2Width + part3Width;
  const mottoStartX =
    align === "center"
      ? textAreaX + Math.max(0, (textAreaWidth - totalMottoWidth) / 2)
      : align === "right"
        ? textAreaX + textAreaWidth - totalMottoWidth
        : textAreaX;

  doc.fillColor(header.mottoPart1Color).text(`${header.mottoPart1} – `, mottoStartX, y, { continued: true, lineBreak: false });
  doc.fillColor(header.mottoPart2Color).text(`${header.mottoPart2} – `, { continued: true, lineBreak: false });
  doc.fillColor(header.mottoPart3Color).text(header.mottoPart3, { lineBreak: false });
  doc.moveDown(header.lineSpacing);
  y = doc.y;

  doc
    .font("Helvetica-Bold")
    .fontSize(header.schoolNameFontSize)
    .fillColor(header.schoolNameColor)
    .text(header.schoolNameLine, textAreaX, y, textOptions);
  doc.font("Helvetica");
  doc.moveDown(header.lineSpacing - 1);
  y = doc.y;

  doc.fontSize(11).fillColor(header.instituteNameColor).text(header.instituteNameLine, textAreaX, y, textOptions);
  doc.moveDown(header.lineSpacing - 1);
  y = doc.y;

  doc
    .font(header.taglineItalic ? "Helvetica-Oblique" : "Helvetica")
    .fontSize(9)
    .fillColor(header.taglineColor)
    .text(header.taglineLine, textAreaX, y, textOptions);
  doc.font("Helvetica");
  doc.moveDown(1);
  y = doc.y;

  doc
    .strokeColor(ctx.printTheme.separatorColor)
    .lineWidth(ctx.printTheme.borderWidthPt)
    .moveTo(marginLeft, y)
    .lineTo(doc.page.width - marginRight, y)
    .stroke();
  doc.moveDown(0.75);
  y = doc.y;

  const bottomOfLogos = logoY + logoSize;
  if (y < bottomOfLogos) y = bottomOfLogos + 8;

  doc.x = marginLeft;
  doc.y = y;
  doc.fillColor(ctx.printTheme.primaryTextColor);
  return doc.y;
}

/**
 * Titre du document — sous l'en-tête, avant le corps spécifique au type. Centré sur toute la largeur
 * utile de la page (marge à marge), avec un `x`/`width` explicites pour ne jamais hériter d'un
 * positionnement résiduel d'un appel précédent (corrigé le 2026-07-30 — le titre apparaissait décalé
 * vers la droite).
 */
export function renderDocumentTitle(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  title: string,
  subtitle?: string,
  // Police du titre — "Times-Bold" (police standard PDFKit, aucun fichier à intégrer) pour
  // l'attestation d'inscription depuis le 2026-07-31 (retour du porteur du projet, style "Ruban et
  // sceau" — titre en serif plus élégant). Par défaut Helvetica-Bold pour tous les autres documents.
  titleFont: "Helvetica-Bold" | "Times-Bold" = "Helvetica-Bold"
): void {
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc
    .font(titleFont)
    .fontSize(14)
    .fillColor(ctx.printTheme.titleColor)
    .text(title.toUpperCase(), x, doc.y, { align: "center", width });
  if (subtitle) {
    doc.font("Helvetica").fontSize(10).fillColor(ctx.printTheme.secondaryTextColor).text(subtitle, x, doc.y, { align: "center", width });
  }
  doc.moveDown(1);
  doc.x = x;
  doc.font("Helvetica").fillColor(ctx.printTheme.primaryTextColor);
}

/**
 * Cachet + signature du signataire configuré pour ce type de document (§10/§11). Placé en bas de la
 * dernière page.
 *
 * Règle générale (2026-07-30, retour du porteur du projet) : la zone de signature est **toujours**
 * réservée avec un cadre visible, que le signataire soit configuré ou non — seul le contenu du cadre
 * change, jamais la mise en page. Cela évite que l'apparence des documents déjà émis change
 * rétroactivement le jour où une signature est enfin configurée dans les paramètres. S'applique à tous
 * les documents officiels (moteur centralisé).
 *
 * Le cadre reste volontairement vide (aucune mention "Signature non configurée") lorsqu'aucun
 * signataire n'est configuré : plusieurs signataires (ex. Directeur des Études) signent physiquement à
 * la main sur le document imprimé plutôt que via une image de signature numérisée — le cadre sert donc
 * autant d'espace de signature manuscrite que de placeholder (2026-07-30, retour du porteur du projet).
 */
export function renderSignatureAndStamp(doc: PDFKit.PDFDocument, ctx: DocumentRenderContext, campusLabel: string): void {
  const { template, stamp, signatory, printTheme } = ctx;
  const boxWidth = 180;
  const boxHeight = 78;
  const rightX = doc.page.width - doc.page.margins.right - boxWidth;
  const dateY = doc.y + 20;

  doc.fontSize(9).fillColor(printTheme.secondaryTextColor).text(`Fait à ${campusLabel}, le ${formatDateFr(new Date())}`, rightX, dateY, {
    width: boxWidth,
    align: "center",
  });

  const boxY = dateY + 16;
  doc.roundedRect(rightX, boxY, boxWidth, boxHeight, 3).lineWidth(0.5).strokeColor(printTheme.borderColor).stroke();

  if (signatory) {
    const title = signatory.title ?? humanizeSignatoryRole(signatory.roleCode);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(printTheme.primaryTextColor).text(title, rightX, boxY + 8, { width: boxWidth, align: "center" });
    doc.font("Helvetica");
    const signatureImage = resolveUploadPath(signatory.signatureImagePath);
    if (signatureImage) {
      doc.image(signatureImage, rightX + (boxWidth - 100) / 2, boxY + 22, { fit: [100, 36] });
    }
    if (signatory.displayName) {
      doc.fontSize(9).text(signatory.displayName, rightX, boxY + 62, { width: boxWidth, align: "center" });
    }
  }

  if (template.showStamp) {
    const stampImage = resolveUploadPath(stamp.imagePath);
    if (stampImage) {
      const stampWidth = stamp.widthMm ? stamp.widthMm * MM_TO_PT : 80;
      const stampHeight = stamp.heightMm ? stamp.heightMm * MM_TO_PT : 80;
      doc.image(stampImage, rightX - stampWidth - 10, boxY, { fit: [stampWidth, stampHeight] });
    }
  }

  doc.fillColor(printTheme.primaryTextColor);
}

export function humanizeSignatoryRole(role: string): string {
  const labels: Record<string, string> = {
    DIRECTEUR_GENERAL: "Le Directeur Général",
    DIRECTEUR_CAMPUS: "Le Directeur de Campus",
    DIRECTEUR_ETUDES: "Le Directeur des Études",
    COMPTABLE: "Le Comptable",
    RESPONSABLE_ADMINISTRATIF: "Le Responsable Administratif",
  };
  return labels[role] ?? role;
}

export function formatDateFr(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

/**
 * Formate un montant avec un séparateur de milliers "." (ex. 3.230.000) — ne jamais utiliser
 * `toLocaleString("fr-FR")` dans un document PDF : sa police Helvetica standard (WinAnsi) ne contient
 * pas le caractère espace fine insécable que Node insère comme séparateur, ce qui l'affichait comme un
 * "/" à l'impression (2026-07-30, retour du porteur du projet).
 */
export function formatAmount(value: number): string {
  const [intPart, decPart] = Math.abs(value).toFixed(2).split(".") as [string, string];
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = value < 0 ? "-" : "";
  return decPart === "00" ? `${sign}${grouped}` : `${sign}${grouped},${decPart}`;
}

const UNITS_0_19 = [
  "zéro",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
  "dix-sept",
  "dix-huit",
  "dix-neuf",
];
const TENS_WORDS: Record<number, string> = { 2: "vingt", 3: "trente", 4: "quarante", 5: "cinquante", 6: "soixante", 8: "quatre-vingt" };

function convertTensToWords(n: number): string {
  if (n < 20) return UNITS_0_19[n] as string;
  const ten = Math.floor(n / 10);
  const unit = n % 10;
  // 70-79 et 90-99 se forment sur la base de "soixante"/"quatre-vingt" + le nombre 10-19 correspondant
  // ("soixante-dix", "quatre-vingt-onze"...) — seule l'irrégularité de 71 ("soixante-et-onze") sort de
  // ce schéma, les autres composés en -1 (91, 81...) ne prennent jamais "et".
  if (ten === 7 || ten === 9) {
    const base = ten === 7 ? "soixante" : "quatre-vingt";
    if (ten === 7 && unit === 1) return `${base}-et-onze`;
    return `${base}-${UNITS_0_19[10 + unit]}`;
  }
  if (unit === 0) return ten === 8 ? "quatre-vingts" : (TENS_WORDS[ten] as string);
  if (unit === 1 && ten !== 8) return `${TENS_WORDS[ten]}-et-un`;
  return `${TENS_WORDS[ten]}-${UNITS_0_19[unit]}`;
}

function convertHundredsToWords(n: number): string {
  if (n < 100) return convertTensToWords(n);
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  let words = hundred === 1 ? "cent" : `${UNITS_0_19[hundred]}-cent`;
  if (rest === 0) {
    // "cent(s)" ne prend le pluriel que multiplié par un nombre > 1 ET non suivi d'un autre nombre
    // (deux-cents mais deux-cent-un) — jamais au singulier ("cent" seul, jamais "un cent").
    if (hundred > 1) words += "s";
  } else {
    words += `-${convertTensToWords(rest)}`;
  }
  return words;
}

/**
 * Montant entier converti en toutes lettres (français, orthographe rectifiée 1990 — tirets entre
 * tous les mots numéraux). Utilisé sur les documents comptables officiels ("Arrêté le présent
 * journal de caisse à la somme de : ...", MODULE-09 §rapports comptables, 2026-08-02, retour du
 * porteur du projet : élément attendu sur tout document comptable professionnel).
 */
export function amountToFrenchWords(amount: number): string {
  const value = Math.round(Math.abs(amount));
  if (value === 0) return "Zéro";

  const milliards = Math.floor(value / 1_000_000_000);
  const millions = Math.floor((value % 1_000_000_000) / 1_000_000);
  const milliers = Math.floor((value % 1_000_000) / 1_000);
  const units = value % 1_000;

  const parts: string[] = [];
  if (milliards > 0) parts.push(`${convertHundredsToWords(milliards)} ${milliards > 1 ? "milliards" : "milliard"}`);
  if (millions > 0) parts.push(`${convertHundredsToWords(millions)} ${millions > 1 ? "millions" : "million"}`);
  // "mille" est invariable et ne se dit jamais "un mille" — contrairement à million/milliard, qui
  // restent des noms précédés de "un".
  if (milliers > 0) parts.push(milliers === 1 ? "mille" : `${convertHundredsToWords(milliers)}-mille`);
  if (units > 0) parts.push(convertHundredsToWords(units));

  const words = parts.join(" ");
  return (words.charAt(0).toUpperCase() + words.slice(1)) as string;
}

/**
 * Montant en toutes lettres suivi de la devise — "de francs guinéens" uniquement quand le montant
 * est un multiple rond du million (ou du milliard), sinon la devise s'accole directement au nombre
 * (règle grammaticale : "million"/"milliard" ne prennent "de" que lorsqu'ils sont le dernier élément
 * numéral, jamais lorsqu'un chiffre plus précis suit).
 */
export function amountToFrenchWordsWithCurrency(amount: number, currency = "francs guinéens"): string {
  const value = Math.round(Math.abs(amount));
  const words = amountToFrenchWords(value);
  const isRoundMillionOrMore = value >= 1_000_000 && value % 1_000_000 === 0;
  return isRoundMillionOrMore ? `${words} de ${currency}` : `${words} ${currency}`;
}

/**
 * Payload minimal du QR code (§12) : numéro de document, campus, date de génération, plus les champs
 * propres au type (matricule/nom complet/année universitaire...). Jamais une URL — l'application est
 * hors-ligne (voir ADR-007) ; l'authenticité se vérifie par comparaison directe avec l'archive.
 * Fonction pure, extraite pour rester testable sans base de données ni rendu PDF.
 */
export function buildQrPayload(
  documentNumber: string,
  campusName: string,
  generationDate: Date,
  extraFields: Record<string, string>
): Record<string, string> {
  return {
    numero: documentNumber,
    campus: campusName,
    dateGeneration: formatDateFr(generationDate),
    ...extraFields,
  };
}

/**
 * Encode un payload en image PNG de QR code (buffer réutilisable par `doc.image`, ex. carte
 * d'étudiant — MODULE-09.1). Un objet est encodé en JSON ; une chaîne est encodée telle quelle —
 * utilisé par la carte d'étudiant depuis le 2026-08-02 (retour du porteur du projet) pour un texte
 * brut sans étiquettes ni accolades, plus court à scanner qu'un objet JSON équivalent.
 */
export async function generateQrImageBuffer(payload: Record<string, string> | string): Promise<Buffer> {
  const data = typeof payload === "string" ? payload : JSON.stringify(payload);
  const dataUrl = await QRCode.toDataURL(data, { margin: 0, width: 200 });
  const base64 = dataUrl.split(",")[1] ?? "";
  return Buffer.from(base64, "base64");
}

/**
 * Encode le payload en QR code et le place en bas à gauche de la page courante. Le `verificationCode`
 * (le numéro de document — déjà unique, généré par le moteur de numérotation) est imprimé juste en
 * dessous pour permettre une vérification manuelle sans scanner (2026-07-30, retour du porteur du
 * projet). Même précaution que `renderFooterOnAllPages` pour ce texte situé au-delà de `page.maxY()` :
 * la marge basse est neutralisée le temps de l'appel `.text()` pour éviter un saut de page automatique.
 *
 * Déplacé du coin bas-droit vers le coin bas-gauche le 2026-07-31 (retour du porteur du projet) :
 * `renderSignatureAndStamp` place aussi sa zone à droite, et n'est jamais ancré au bas de la page
 * (juste en dessous du contenu du générateur) — sur un document au contenu long (ex. attestation
 * avec conclusion développée), les deux finissaient par se chevaucher. Le bas-gauche reste
 * naturellement libre sur tous les types de documents.
 */
export async function renderQrCode(doc: PDFKit.PDFDocument, payload: Record<string, string>, verificationCode?: string): Promise<void> {
  const buffer = await generateQrImageBuffer(payload);
  const size = 70;
  const x = doc.page.margins.left;
  const y = doc.page.height - doc.page.margins.bottom - size;
  doc.image(buffer, x, y, { fit: [size, size] });
  if (verificationCode) {
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .fontSize(6)
      .fillColor("#6B7280")
      .text(verificationCode, x, y + size + 2, { width: size, align: "center", lineBreak: false });
    doc.page.margins.bottom = originalBottomMargin;
  }
}

/**
 * Pied de page — numéro de page + mention personnalisée du modèle (§7). Appelé une fois, en fin de
 * génération, sur toutes les pages bufferisées (`doc.switchToPage`).
 *
 * Correction du 2026-07-30 (bug des pages blanches) : la position `y` du pied de page se situe dans
 * la marge basse, donc **au-delà** de `page.height - margins.bottom` (la limite que `pdfkit` utilise
 * pour déclencher automatiquement un saut de page dès qu'un texte dépasserait le bas de la zone de
 * contenu). Dessiner le pied de page sans précaution y déclenchait donc systématiquement l'ajout
 * silencieux d'une page vierge supplémentaire à la fin de chaque page existante — vérifié
 * empiriquement (un document d'une page devenait 2 pages, dont 1 vide, avant même le double
 * exemplaire). `margins.bottom` est mis à zéro le temps du seul appel `.text()`, pour rester dans la
 * zone imprimable réelle sans franchir la limite qui déclenche la pagination automatique.
 */
export function renderFooterOnAllPages(doc: PDFKit.PDFDocument, ctx: DocumentRenderContext, documentNumber: string): void {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const originalBottomMargin = doc.page.margins.bottom;
    const y = doc.page.height - originalBottomMargin + 10;
    doc.page.margins.bottom = 0;
    doc
      .fontSize(7)
      .fillColor(ctx.printTheme.footerColor)
      .text(
        `${ctx.template.customFooterText ?? ""}${ctx.template.customFooterText ? " — " : ""}Document n° ${documentNumber} — Page ${i + 1}/${range.count}`,
        doc.page.margins.left,
        y,
        { width: doc.page.width - doc.page.margins.left - doc.page.margins.right, align: "center", lineBreak: false }
      );
    doc.page.margins.bottom = originalBottomMargin;
  }
}

/**
 * Cadre d'identification (attestations/certificats — §1 documents administratifs) : regroupe les
 * informations d'un étudiant/employé dans un encadré à libellés en gras, sur deux colonnes remplies
 * verticalement (colonne 1 puis colonne 2), plutôt qu'une simple liste de paragraphes — plus lisible et
 * plus professionnel (2026-07-30, retour du porteur du projet). Avance `doc.y` après le cadre.
 */
export function renderIdentificationBox(doc: PDFKit.PDFDocument, ctx: DocumentRenderContext, fields: [string, string][]): void {
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columns = 2;
  const rowHeight = 18;
  const rows = Math.ceil(fields.length / columns);
  const boxHeight = rows * rowHeight + 16;
  const boxY = doc.y;

  doc.roundedRect(x, boxY, width, boxHeight, 3).lineWidth(0.5).strokeColor(ctx.printTheme.borderColor).stroke();

  const colWidth = width / columns;
  const labelWidth = colWidth * 0.42;
  const valueWidth = colWidth * 0.58 - 14;

  fields.forEach(([label, value], i) => {
    const col = Math.floor(i / rows);
    const row = i % rows;
    const cx = x + 10 + col * colWidth;
    const cy = boxY + 10 + row * rowHeight;
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(ctx.printTheme.primaryTextColor).text(label, cx, cy, { width: labelWidth, lineBreak: false });
    doc
      .font("Helvetica")
      .fontSize(9.5)
      .text(`: ${value}`, cx + labelWidth, cy, { width: valueWidth, lineBreak: false, ellipsis: true });
  });

  doc.x = x;
  doc.y = boxY + boxHeight + 12;
  doc.font("Helvetica").fillColor(ctx.printTheme.primaryTextColor);
}

/**
 * Bandeau de tuiles statistiques (rapports financiers — RETARD_PAIEMENT/SITUATION_FINANCIERE,
 * 2026-08-09, retour du porteur du projet : "de façon globale bien structuré") : une valeur clé par
 * tuile, réparties à parts égales sur la largeur utile de la page. Couleur reprise de
 * `printTheme.headerColor` (déjà utilisée pour les en-têtes de tableau) plutôt qu'une couleur codée en
 * dur, pour rester cohérent avec le thème d'impression choisi par l'établissement.
 */
export function renderStatTiles(doc: PDFKit.PDFDocument, ctx: DocumentRenderContext, tiles: { label: string; value: string }[]): void {
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const gap = 10;
  const tileWidth = (width - gap * (tiles.length - 1)) / tiles.length;
  const tileHeight = 46;
  const y = doc.y;

  tiles.forEach((tile, i) => {
    const tx = x + i * (tileWidth + gap);
    doc.roundedRect(tx, y, tileWidth, tileHeight, 4).fill(ctx.printTheme.headerColor);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#FFFFFF")
      .text(tile.label.toUpperCase(), tx + 10, y + 9, { width: tileWidth - 20, lineBreak: false, ellipsis: true });
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#FFFFFF")
      .text(tile.value, tx + 10, y + 24, { width: tileWidth - 20, lineBreak: false, ellipsis: true });
  });

  doc.x = x;
  doc.y = y + tileHeight + 14;
  doc.font("Helvetica").fillColor(ctx.printTheme.primaryTextColor);
}

/** Tableau simple (listes/rapports — §1 documents administratifs) : en-têtes + lignes, bordures selon le thème. */
export function drawTable(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  columns: { label: string; width: number }[],
  rows: string[][],
  options?: { rowHeight?: number; fontSize?: number }
): void {
  const startX = doc.page.margins.left;
  // Police et hauteur de ligne augmentées le 2026-07-30 (retour du porteur du projet) — sauf en-tête
  // et cartes (étudiant/paiement), le contenu doit se répartir plus largement sur la page.
  const fontSize = options?.fontSize ?? 10;
  const rowHeight = options?.rowHeight ?? 26;
  const textYOffset = Math.max(4, (rowHeight - fontSize) / 2 - 1);
  let y = doc.y;
  const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);

  const drawRow = (values: string[], isHeader: boolean) => {
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 80) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    let x = startX;
    doc
      .rect(startX, y, tableWidth, rowHeight)
      .fillAndStroke(isHeader ? ctx.printTheme.headerColor : "#FFFFFF", ctx.printTheme.borderColor);
    doc.fillColor(isHeader ? "#FFFFFF" : ctx.printTheme.primaryTextColor);
    columns.forEach((col, i) => {
      doc.font(isHeader ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize).text(values[i] ?? "", x + 6, y + textYOffset, {
        width: col.width - 10,
        align: "left",
        ellipsis: true,
        lineBreak: false,
      });
      x += col.width;
    });
    y += rowHeight;
  };

  drawRow(
    columns.map((c) => c.label),
    true
  );
  for (const row of rows) {
    drawRow(row, false);
  }
  doc.x = startX;
  doc.y = y + 12;
  doc.fillColor(ctx.printTheme.primaryTextColor);
}
