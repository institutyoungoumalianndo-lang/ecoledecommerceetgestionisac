import { prisma } from "@isac-erp/db";
import type { GenerateDocumentInput } from "@isac-erp/shared";
import * as brandingService from "../../brandingService.js";
import { getStudentFeeSummary } from "../../feeSummaryService.js";
import { formatAmount, formatDateFr, resolveUploadPath, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "FICHE_INSCRIPTION_COMPLETEE" }>;

// Style "Vert Institution" — retenu le 2026-08-03 après maquette (options Ruban et Sceau / Vert
// Institution) : émeraude/laiton, distinct de la palette navy/or déjà utilisée par l'attestation
// d'inscription, pour ne pas confondre les deux documents. Propre à ce générateur.
const EMERALD = "#1F4B3F";
const GOLD = "#B8863A";
const GOLD_LINE = "#BFD3C7";
const INK = "#24312C";
const MUTED = "#555555";

const RELATIONSHIP_LABELS: Record<string, string> = {
  PERE: "Père",
  MERE: "Mère",
  TUTEUR_LEGAL: "Tuteur légal",
  FRERE: "Frère",
  SOEUR: "Sœur",
  ONCLE: "Oncle",
  TANTE: "Tante",
  GRAND_PARENT: "Grand-parent",
  AUTRE: "Autre",
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ACTE_NAISSANCE: "Acte de naissance",
  DIPLOME: "Diplôme",
  RELEVE: "Relevés",
  PHOTO: "Photo",
  CARTE_IDENTITE_PASSEPORT: "Carte d'identité / Passeport",
  CERTIFICAT_MEDICAL: "Certificat médical",
  AUTRE: "Autre",
};

/**
 * Fiche d'inscription complétée (MODULE-09 §1) : version remplie de FICHE_INSCRIPTION, générée depuis
 * le dossier réel d'un étudiant déjà inscrit — photo, scolarité, parent/tuteur, pièces effectivement
 * déposées et montant réellement payé, tous tirés des données enregistrées (2026-08-03, retour du
 * porteur du projet). Bouton dédié dans la fiche étudiant, à côté des cartes étudiant/paiement.
 *
 * Rangée de signature propre à ce document (étudiant / Directeur des Études / Directeur) — le cadre
 * institutionnel du moteur partagé est désactivé pour ce type (voir documentEngineService.ts). Le nom
 * du Directeur des Études n'est volontairement jamais affiché (seul le libellé du poste) ; celui du
 * Directeur est le signataire configuré sous le rôle "Directeur de Campus" (retour du porteur du
 * projet : "le directeur ce sera le nom du directeur du campus").
 */
export async function generateFicheInscriptionCompletee(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const student = await prisma.student.findUniqueOrThrow({ where: { id: input.studentId } });
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId: input.studentId, cancelledAt: null },
    orderBy: { enrollmentDate: "desc" },
    include: { academicYear: true, class: true, filiere: true, level: true, regime: true },
  });
  if (!enrollment) {
    throw new Error("Cet étudiant n'a aucune inscription active : impossible de générer la fiche d'inscription complétée.");
  }
  const enrollmentCount = await prisma.studentEnrollment.count({ where: { studentId: input.studentId } });
  const primaryGuardian = await prisma.studentGuardian.findFirst({
    where: { studentId: input.studentId },
    orderBy: [{ isPrimaryContact: "desc" }, { createdAt: "asc" }],
    include: { guardian: true },
  });
  const documents = await prisma.studentDocument.findMany({ where: { studentId: input.studentId }, orderBy: { uploadedAt: "asc" } });
  const feeSummary = await getStudentFeeSummary({ studentId: input.studentId, academicYearId: enrollment.academicYearId });
  const signatories = await brandingService.listDocumentSignatories();
  const campusDirector = signatories.find((s) => s.roleCode === "DIRECTEUR_CAMPUS");

  const fullName = `${student.firstName} ${student.lastName}`;
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  drawBadge(doc, x, width, enrollmentCount > 1 ? "RÉINSCRIPTION" : "NOUVELLE INSCRIPTION");
  doc.moveDown(0.75);

  const birthLine = `${student.birthDate ? formatDateFr(student.birthDate) : "—"}${student.birthPlace ? ` à ${student.birthPlace}` : ""}`;
  drawIdentificationCard(
    doc,
    x,
    width,
    [
      ["Nom et prénom(s)", fullName],
      ["Matricule", student.matricule],
      ["INA", student.ina ?? "—"],
      ["Sexe", student.gender === "M" ? "Masculin" : "Féminin"],
      ["Date et lieu de naissance", birthLine],
      ["Nationalité", student.nationality ?? "—"],
      ["Situation matrimoniale", maritalStatusLabel(student.maritalStatus)],
    ],
    resolveUploadPath(student.photoPath)
  );
  doc.moveDown(0.75);

  drawSectionTitle(doc, x, width, "SCOLARITÉ");
  drawFieldGrid(doc, x, width, [
    ["Filière", enrollment.filiere.name],
    ["Programme", student.programme ?? "—"],
    ["Niveau", enrollment.level.label],
    ["Classe", enrollment.class.name],
    ["Régime", enrollment.regime?.label ?? "—"],
    ["N° d'inscription", enrollment.registrationNumber ?? "—"],
    ["Date d'inscription", formatDateFr(enrollment.enrollmentDate)],
  ]);
  doc.moveDown(0.6);

  drawSectionTitle(doc, x, width, "PARENT OU TUTEUR RESPONSABLE");
  if (primaryGuardian) {
    const relationshipLabel = primaryGuardian.relationshipOther ?? RELATIONSHIP_LABELS[primaryGuardian.relationship] ?? primaryGuardian.relationship;
    drawFieldGrid(doc, x, width, [
      ["Nom complet", `${primaryGuardian.guardian.firstName} ${primaryGuardian.guardian.lastName}`],
      ["Lien de parenté", relationshipLabel],
      ["Téléphone", primaryGuardian.guardian.phonePrimary ?? "—"],
    ]);
  } else {
    doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(MUTED).text("Aucun parent ou tuteur enregistré.", x, doc.y, { width });
    doc.font("Helvetica").fillColor(INK);
    doc.moveDown(0.6);
  }
  doc.moveDown(0.6);

  drawSectionTitle(doc, x, width, "PIÈCES FOURNIES");
  if (documents.length > 0) {
    drawChecklist(
      doc,
      x,
      width,
      documents.map((d) => DOCUMENT_TYPE_LABELS[d.type] ?? d.type)
    );
  } else {
    doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(MUTED).text("Aucune pièce enregistrée dans le dossier.", x, doc.y, { width });
    doc.font("Helvetica").fillColor(INK);
    doc.moveDown(0.6);
  }
  doc.moveDown(0.6);

  drawSectionTitle(doc, x, width, "FRAIS");
  drawFieldGrid(doc, x, width, [["Montant payé à ce jour", `${formatAmount(feeSummary.totalPaid)} GNF`]]);
  doc.moveDown(1.2);

  doc
    .font("Helvetica-Oblique")
    .fontSize(8)
    .fillColor(MUTED)
    .text(
      "Je soussigné(e) certifie l'exactitude des informations mentionnées ci-dessus. Je reconnais que tout montant versé au titre " +
        "des frais d'inscription et/ou de scolarité n'est en aucun cas remboursable, et je déclare, par ma signature, consentir " +
        "expressément à cette condition ainsi qu'à me conformer au règlement intérieur en vigueur au sein de l'établissement.",
      x,
      doc.y,
      { width, align: "justify", lineGap: 4.5 }
    );
  doc.font("Helvetica").fillColor(INK);
  doc.moveDown(2);

  // Le QR code (documentEngineService.ts) est toujours placé en bas à gauche de la page, quelle que
  // soit la position du contenu (voir pdfEngine.ts renderQrCode) — sur ce document au contenu
  // relativement court, la rangée de signatures atterrit dans la même bande verticale et la
  // première cellule ("L'étudiant(e)"), au ras de la marge gauche, se retrouvait masquée par le QR
  // (signalé par le porteur du projet, 2026-08-03). On réserve donc l'angle bas-gauche (largeur du
  // QR + marge) en décalant toute la rangée vers la droite, bord droit inchangé.
  const qrReservedGutter = 95;
  drawSignatureRow(doc, x + qrReservedGutter, width - qrReservedGutter, [
    { role: "L'étudiant(e)", name: fullName },
    { role: "Le Directeur des Études", name: "" },
    { role: "Le Directeur", name: campusDirector?.displayName ?? "" },
  ]);

  doc.fillColor(ctx.printTheme.primaryTextColor);

  return {
    relatedEntityType: "Student",
    relatedEntityId: student.id,
    relatedEntityLabel: fullName,
    qrFields: { matricule: student.matricule, nomComplet: fullName, anneeUniversitaire: enrollment.academicYear.label },
  };
}

function maritalStatusLabel(status: string): string {
  const labels: Record<string, string> = { CELIBATAIRE: "Célibataire", MARIE: "Marié(e)", DIVORCE: "Divorcé(e)", VEUF: "Veuf(ve)" };
  return labels[status] ?? status;
}

/** Bandeau centré "NOUVELLE INSCRIPTION" / "RÉINSCRIPTION" — déterminé automatiquement selon le nombre d'inscriptions du dossier. */
function drawBadge(doc: PDFKit.PDFDocument, x: number, width: number, label: string): void {
  doc.font("Helvetica-Bold").fontSize(9);
  const textWidth = doc.widthOfString(label, { characterSpacing: 0.5 });
  const paddingX = 12;
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = 16;
  const boxX = x + (width - boxWidth) / 2;
  const y = doc.y;

  doc.roundedRect(boxX, y, boxWidth, boxHeight, 3).fill(EMERALD);
  doc.fillColor("#EFE6D2").text(label, boxX, y + 4, { width: boxWidth, align: "center", characterSpacing: 0.5, lineBreak: false });

  doc.font("Helvetica").fillColor(INK);
  doc.y = y + boxHeight + 6;
  doc.x = x;
}

/**
 * Carte d'identification à liseré émeraude, grille 2 colonnes à libellé + valeur, photo de l'étudiant
 * sur le bord droit. Libellés remis en place le 2026-08-03 (retour du porteur du projet, après un aller-
 * retour : le cadre du haut garde ses titres, seules d'autres zones du document en sont dépourvues) —
 * mêmes couleurs que la section Scolarité (MUTED pour le libellé, INK pour la valeur) plutôt que la
 * couleur d'accent émeraude/or utilisée dans la toute première version.
 */
function drawIdentificationCard(doc: PDFKit.PDFDocument, x: number, width: number, fields: [string, string][], photoPath: string | null): void {
  const photoSize = 82;
  const photoGutter = 16;
  const padding = 16;
  const accentWidth = 4;
  const columns = 2;
  const rowHeight = 28;
  const gridX = x + accentWidth + padding;
  const gridWidth = width - accentWidth - padding * 2 - photoSize - photoGutter;
  const colWidth = gridWidth / columns;
  const rows = Math.ceil(fields.length / columns);
  const gridHeight = rows * rowHeight;
  const cardHeight = Math.max(gridHeight, photoSize) + padding * 2;
  const y = doc.y;

  doc.roundedRect(x, y, width, cardHeight, 5).lineWidth(0.75).strokeColor(GOLD_LINE).stroke();
  doc.rect(x, y + 3, accentWidth, cardHeight - 6).fillColor(EMERALD).fill();

  fields.forEach(([label, value], i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const cx = gridX + col * colWidth;
    const cy = y + padding + row * rowHeight;
    doc
      .font("Helvetica")
      .fontSize(6.8)
      .fillColor(MUTED)
      .text(label.toUpperCase(), cx, cy, { width: colWidth - 10, characterSpacing: 0.15, lineBreak: false });
    doc
      .font("Helvetica-Bold")
      .fontSize(9.8)
      .fillColor(INK)
      .text(value, cx, cy + 11, { width: colWidth - 10, lineBreak: false, ellipsis: true });
  });

  const photoX = x + width - padding - photoSize;
  const photoY = y + (cardHeight - photoSize) / 2;
  doc.roundedRect(photoX, photoY, photoSize, photoSize, 4).lineWidth(0.75).strokeColor(GOLD_LINE).stroke();
  if (photoPath) {
    doc.image(photoPath, photoX, photoY, { fit: [photoSize, photoSize] });
  } else {
    doc.font("Helvetica").fontSize(7).fillColor(GOLD_LINE).text("Photo", photoX, photoY + photoSize / 2 - 4, { width: photoSize, align: "center" });
  }

  doc.font("Helvetica").fontSize(10).fillColor(INK);
  doc.x = x;
  doc.y = y + cardHeight + 4;
}

/** Bandeau de titre de section — libellé en gras sur fond clair, liseré doré à gauche. */
function drawSectionTitle(doc: PDFKit.PDFDocument, x: number, width: number, title: string): void {
  const y = doc.y;
  const height = 18;
  doc.rect(x, y, width, height).fill("#EAF0EC");
  doc.rect(x, y, 3, height).fill(GOLD);
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(EMERALD)
    .text(title, x + 8, y + 5, { width: width - 14, characterSpacing: 0.25, lineBreak: false });
  doc.y = y + height + 8;
  doc.x = x;
}

/** Grille de champs libellé/valeur sur 3 colonnes (2 si un seul champ occupe toute la largeur). */
function drawFieldGrid(doc: PDFKit.PDFDocument, x: number, width: number, fields: [string, string][]): void {
  const columns = fields.length === 1 ? 1 : 3;
  const colWidth = width / columns;
  const rowHeight = 28;
  const rows = Math.ceil(fields.length / columns);
  const y = doc.y;

  fields.forEach(([label, value], i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const cx = x + col * colWidth;
    const cy = y + row * rowHeight;
    doc
      .font("Helvetica")
      .fontSize(6.6)
      .fillColor(MUTED)
      .text(label.toUpperCase(), cx, cy, { width: colWidth - 12, characterSpacing: 0.15, lineBreak: false });
    doc
      .font("Helvetica-Bold")
      .fontSize(9.3)
      .fillColor(INK)
      .text(value, cx, cy + 12, { width: colWidth - 12, lineBreak: false, ellipsis: true });
  });

  doc.y = y + rows * rowHeight;
  doc.x = x;
}

/** Liste de pièces cochées — une ligne, réparties uniformément sur la largeur disponible. */
function drawChecklist(doc: PDFKit.PDFDocument, x: number, width: number, items: string[]): void {
  const y = doc.y;
  const boxSize = 7.5;
  const colWidth = width / items.length;

  doc.font("Helvetica").fontSize(7.8).fillColor(INK);
  items.forEach((item, i) => {
    const cx = x + i * colWidth;
    doc.rect(cx, y + 2, boxSize, boxSize).fill(GOLD);
    doc.text(item, cx + boxSize + 4, y + 1, { width: colWidth - boxSize - 8, lineBreak: false });
  });

  doc.y = y + 24;
  doc.x = x;
}

/** Rangée à trois signatures — étudiant(e), Directeur des Études (nom jamais imprimé), Directeur (signataire "Directeur de Campus"). */
function drawSignatureRow(doc: PDFKit.PDFDocument, x: number, width: number, cells: { role: string; name: string }[]): void {
  const y = doc.y;
  const colWidth = width / cells.length;
  const gap = 14;

  cells.forEach((cell, i) => {
    const cx = x + i * colWidth;
    doc
      .moveTo(cx, y + 36)
      .lineTo(cx + colWidth - gap, y + 36)
      .lineWidth(0.6)
      .strokeColor(GOLD_LINE)
      .stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(7.8)
      .fillColor(EMERALD)
      .text(cell.role, cx, y + 41, { width: colWidth - gap, align: "center", lineBreak: false });
    if (cell.name) {
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(MUTED)
        .text(cell.name, cx, y + 53, { width: colWidth - gap, align: "center", lineBreak: false });
    }
  });

  doc.y = y + 64;
  doc.x = x;
}
