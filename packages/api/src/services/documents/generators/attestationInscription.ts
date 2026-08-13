import { prisma } from "@isac-erp/db";
import type { GenerateDocumentInput } from "@isac-erp/shared";
import { formatDateFr, resolveUploadPath, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "ATTESTATION_INSCRIPTION" }>;

// Palette "Ruban et sceau" — retenue le 2026-07-31 après maquette (options A à E) : marine/or,
// élégante et sobre, cohérente avec la nature officielle du document. Propre à ce générateur ; les
// autres documents restent sur le thème d'impression configuré (`ctx.printTheme`).
const NAVY = "#1B2A4A";
const GOLD = "#A9812F";
const GOLD_LINE = "#D9C48A";
const INK = "#1E2430";

/**
 * Attestation d'inscription (MODULE-09 §1) : atteste que l'étudiant est régulièrement inscrit.
 * Refonte du 2026-07-31 (retour du porteur du projet, maquette "Ruban et sceau" retenue) : cadre
 * d'identification en carte à liseré doré avec photo de l'étudiant, conclusion développée sur trois
 * paragraphes. Le titre du document ("ATTESTATION D'INSCRIPTION") est rendu en amont par le moteur
 * centralisé (documentEngineService.ts) en Times-Bold — seul ce type de document utilise cette
 * police, pour un rendu plus élégant que le Helvetica-Bold des autres documents.
 */
export async function generateAttestationInscription(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const student = await prisma.student.findUniqueOrThrow({ where: { id: input.studentId } });
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId: input.studentId, cancelledAt: null },
    orderBy: { enrollmentDate: "desc" },
    include: { academicYear: true, class: true, filiere: true, level: true },
  });
  if (!enrollment) {
    throw new Error("Cet étudiant n'a aucune inscription active : impossible de générer une attestation d'inscription.");
  }

  const fullName = `${student.firstName} ${student.lastName}`;
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  // Nom légal de l'établissement pour les mentions administratives officielles — distinct du nom de
  // marque affiché en en-tête (2026-07-30, retour du porteur du projet).
  const legalEstablishmentName = "l'Institut Privé de Formation Technique et Professionnelle YOUNGOU MALIANNDO (IPFTP YMA)";
  const signatoryTitle = ctx.signatory?.title ?? "M. le Directeur des Études";

  // Corps du texte réduit à 10.5pt (contre 13pt avant la refonte) : avec la conclusion développée sur
  // trois paragraphes et la carte d'identification agrandie (davantage d'interligne, retour du
  // porteur du projet), une police plus compacte est nécessaire pour tenir sur une seule page.
  doc.fontSize(12).fillColor(ctx.printTheme.primaryTextColor);
  doc.moveDown(1.3);
  doc.text(
    `Je soussigné ${signatoryTitle} de ${legalEstablishmentName}, certifie que l'étudiant(e) ci-après désigné(e) ` +
      `est régulièrement inscrit(e) dans notre établissement.`,
    x,
    doc.y,
    { align: "justify", width, lineGap: 3 }
  );
  doc.moveDown(1.1);

  const birthLine = `${student.birthDate ? formatDateFr(student.birthDate) : "—"}${student.birthPlace ? ` à ${student.birthPlace}` : ""}`;
  const identificationFields: [string, string][] = [
    ["Nom et prénom(s)", fullName],
    ["Matricule", student.matricule],
    ["Numéro d'inscription", enrollment.registrationNumber ?? "—"],
    ["Sexe", student.gender === "M" ? "Masculin" : "Féminin"],
    ["Date et lieu de naissance", birthLine],
    ...(student.nationality ? ([["Nationalité", student.nationality]] as [string, string][]) : []),
    ["Filière", enrollment.filiere.name],
    ["Niveau", enrollment.level.label],
    ["Classe", enrollment.class.name],
    ["Année universitaire", enrollment.academicYear.label],
    ["Campus", ctx.campus.name],
    ["Date d'inscription", formatDateFr(enrollment.enrollmentDate)],
  ];
  drawIdentificationCard(doc, ctx, x, width, identificationFields, resolveUploadPath(student.photoPath));

  doc.fontSize(12).fillColor(ctx.printTheme.primaryTextColor);
  doc.text(
    `L'intéressé(e) est régulièrement inscrit(e) au titre de l'année universitaire ${enrollment.academicYear.label} et suit ` +
      `avec assiduité les enseignements dispensés en ${enrollment.filiere.name}, conformément au règlement intérieur de ` +
      `${legalEstablishmentName} et aux programmes académiques en vigueur.`,
    x,
    doc.y,
    { align: "justify", width, lineGap: 3 }
  );
  doc.moveDown(1.1);
  doc.text(
    `La présente attestation ne saurait en aucun cas se substituer à une pièce d'identité officielle, ni engager la ` +
      `responsabilité de l'établissement au-delà de la simple confirmation du statut d'inscription de l'intéressé(e) à la ` +
      `date de son émission.`,
    x,
    doc.y,
    { align: "justify", width, lineGap: 3 }
  );
  doc.moveDown(1.1);
  doc.text(
    "En foi de quoi, la présente attestation lui est délivrée à sa demande, pour servir et valoir ce que de droit auprès de qui il/elle appartiendra.",
    x,
    doc.y,
    { align: "justify", width, lineGap: 3 }
  );
  doc.moveDown(2.5);

  return {
    relatedEntityType: "Student",
    relatedEntityId: student.id,
    relatedEntityLabel: fullName,
    qrFields: {
      matricule: student.matricule,
      nomComplet: fullName,
      anneeUniversitaire: enrollment.academicYear.label,
    },
  };
}

/**
 * Carte d'identification "Ruban et sceau" : liseré doré sur le bord gauche de la carte, grille de
 * champs sur 2 colonnes, cadre photo de l'étudiant sur le bord droit. Remplace `renderIdentificationBox`
 * (cadre gris générique) pour ce seul document — les autres documents administratifs (attestations
 * diverses, certificats) continuent d'utiliser le cadre partagé.
 *
 * Historique des retours du porteur du projet (2026-07-31) : (1) cadre photo invisible sans photo
 * renseignée → toujours réservé désormais, même vide (même principe que `renderSignatureAndStamp`) ;
 * (2) interligne insuffisant → `rowHeight` augmenté ; (3) photo déplacée du bord gauche vers le bord
 * droit de la carte, carte légèrement rentrée par rapport aux marges du texte (plus "centrée" qu'une
 * bande pleine largeur), tailles de police et de photo augmentées pour mieux occuper la page.
 */
function drawIdentificationCard(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  x: number,
  width: number,
  fields: [string, string][],
  photoPath: string | null
): void {
  const cardInset = 8;
  const cardX = x + cardInset;
  const cardWidth = width - cardInset * 2;
  const photoSize = 85;
  const photoGutter = 16;
  const padding = 16;
  const accentWidth = 4;
  const columns = 2;
  const gridX = cardX + accentWidth + padding;
  const gridWidth = cardWidth - accentWidth - padding * 2 - photoSize - photoGutter;
  const colWidth = gridWidth / columns;
  const rowHeight = 32;
  const rows = Math.ceil(fields.length / columns);
  const gridHeight = rows * rowHeight;
  const cardHeight = Math.max(gridHeight, photoSize) + padding * 2;
  const y = doc.y;

  doc.roundedRect(cardX, y, cardWidth, cardHeight, 6).lineWidth(0.75).strokeColor(GOLD_LINE).stroke();
  doc.rect(cardX, y + 3, accentWidth, cardHeight - 6).fillColor(GOLD).fill();

  fields.forEach(([label, value], i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const cx = gridX + col * colWidth;
    const cy = y + padding + row * rowHeight + (rowHeight - 22) / 2;
    doc
      .font("Helvetica-Bold")
      .fontSize(7)
      .fillColor(GOLD)
      .text(label.toUpperCase(), cx, cy, { width: colWidth - 10, characterSpacing: 0.2, lineBreak: false });
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(NAVY)
      .text(value, cx, cy + 11, { width: colWidth - 10, lineBreak: false, ellipsis: true });
  });

  const photoX = cardX + cardWidth - padding - photoSize;
  const photoY = y + (cardHeight - photoSize) / 2;
  doc.roundedRect(photoX, photoY, photoSize, photoSize, 4).lineWidth(0.75).strokeColor(GOLD_LINE).stroke();
  if (photoPath) {
    doc.image(photoPath, photoX, photoY, { fit: [photoSize, photoSize] });
  } else {
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(GOLD_LINE)
      .text("Photo", photoX, photoY + photoSize / 2 - 4, { width: photoSize, align: "center" });
  }

  doc.font("Helvetica").fontSize(12).fillColor(INK);
  doc.x = x;
  doc.y = y + cardHeight + 14;
  doc.fillColor(ctx.printTheme.primaryTextColor);
}
