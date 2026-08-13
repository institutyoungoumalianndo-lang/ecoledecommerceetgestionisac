import { prisma } from "@isac-erp/db";
import type { GenerateDocumentInput } from "@isac-erp/shared";
import type { DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "FICHE_EMARGEMENT_ENSEIGNANT" }>;

// Même style "Sobre Contrasté" que ficheInscription.ts — monochrome noir pur, pensé pour être
// rempli à la main, cohérent avec l'autre formulaire vierge de l'application.
const INK = "#000000";
const LINE = "#8A93A6";
const MUTED = "#000000";
const SECTION_BG = "#F3F4F6";

const MOIS_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

/**
 * Une séance dure 3 heures (2026-08-03, retour du porteur du projet, après premier essai réel du
 * document : "12h correspond à 4 séances de 3h et 15h à 5 séances") — le nombre de lignes du tableau
 * d'émargement et le récapitulatif ("prévues") se déduisent du volume horaire prévu plutôt que d'être
 * fixés à 5 quel que soit le volume choisi.
 */
const HEURES_PAR_SEANCE = 3;

/**
 * Fiche d'émargement mensuelle des enseignants (2026-08-03, retour du porteur du projet) : remplace
 * le suivi numérique des séances/pointage (Module 5.1/5.2), abandonné — un document par (enseignant,
 * mois), formulaire à remplir à la main (dates/heures/signatures). Mois/matière/volume horaire prévu
 * sont choisis à la génération, pas liés à une entité stockée (voir generatedDocument.ts). Cadre de
 * signature et QR code du moteur partagé désactivés pour ce type (voir documentEngineService.ts) :
 * ce générateur dessine son propre bloc de validation.
 */
export async function generateFicheEmargementEnseignant(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const [teacher, academicYear] = await Promise.all([
    prisma.teacher.findUniqueOrThrow({ where: { id: input.teacherId } }),
    prisma.academicYear.findUniqueOrThrow({ where: { id: input.academicYearId } }),
  ]);
  const teacherName = `${teacher.lastName} ${teacher.firstName}`;
  const moisLabel = MOIS_LABELS[input.month - 1] ?? String(input.month);
  const nombreInterventionsPrevues = Math.round(input.volumeHorairePrevu / HEURES_PAR_SEANCE);

  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(MUTED)
    .text(`Campus ${ctx.campus.name} — Année scolaire ${academicYear.label}`, x, doc.y, { width, align: "center" });
  doc.moveDown(1);

  drawLabeledLine(doc, x, width, "Mois", moisLabel);
  drawLabeledLine(doc, x, width, "Nom et prénom de l'enseignant", teacherName);
  drawLabeledLine(doc, x, width, "Filière");
  drawLabeledLine(doc, x, width, "Niveau");
  drawLabeledLine(doc, x, width, "Classe");
  drawLabeledLine(doc, x, width, "Matière / Module", input.matiere);
  drawLabeledLine(doc, x, width, "Volume horaire prévu", `${input.volumeHorairePrevu} heures`);
  doc.moveDown(0.6);

  drawEmargementTable(doc, x, width, nombreInterventionsPrevues);
  doc.moveDown(0.8);

  drawSectionHeader(doc, x, width, "RÉCAPITULATIF");
  drawLabeledLine(doc, x, width, "Nombre d'interventions prévues", String(nombreInterventionsPrevues));
  drawLabeledLine(doc, x, width, "Nombre d'interventions effectuées");
  drawLabeledLine(doc, x, width, "Volume horaire réalisé (heures)");
  drawLabeledLine(doc, x, width, "Volume horaire restant (heures)");
  doc.moveDown(0.5);

  drawSectionHeader(doc, x, width, "OBSERVATIONS");
  drawBlankLines(doc, x, width, 3);
  doc.moveDown(0.5);

  drawValidationRow(doc, x, width, teacherName);

  doc.fillColor(ctx.printTheme.primaryTextColor);

  return {
    relatedEntityType: "Teacher",
    relatedEntityId: teacher.id,
    relatedEntityLabel: `${teacherName} — ${moisLabel} ${academicYear.label}`,
    qrFields: {},
  };
}

/** En-tête de section — bandeau gris clair, texte en gras (repris de ficheInscription.ts). */
function drawSectionHeader(doc: PDFKit.PDFDocument, x: number, width: number, title: string): void {
  const y = doc.y;
  const height = 16;
  doc.rect(x, y, width, height).fill(SECTION_BG);
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(INK)
    .text(title, x + 6, y + 4, { width: width - 12, characterSpacing: 0.2, lineBreak: false });
  doc.y = y + height + 6;
  doc.x = x;
}

/** Une ligne "Libellé : valeur" (auto-remplie si fournie) ou "Libellé : ________" (ligne à remplir à la main). */
function drawLabeledLine(doc: PDFKit.PDFDocument, x: number, width: number, label: string, value?: string): void {
  const y = doc.y;
  const labelText = `${label} :`;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(INK).text(labelText, x, y, { lineBreak: false });
  const labelWidth = doc.widthOfString(labelText);
  const contentX = x + labelWidth + 6;
  const contentWidth = width - labelWidth - 6;

  if (value) {
    doc.font("Helvetica").fillColor(INK).text(value, contentX, y, { width: contentWidth, lineBreak: false });
  } else {
    doc
      .moveTo(contentX, y + 11)
      .lineTo(x + width, y + 11)
      .lineWidth(0.6)
      .strokeColor(LINE)
      .stroke();
  }
  doc.font("Helvetica");
  doc.y = y + 20;
  doc.x = x;
}

/** Tableau d'émargement — une ligne vierge par intervention prévue (N°/Date/Heure début/Heure fin/Durée/Signature), remplies à la main. */
function drawEmargementTable(doc: PDFKit.PDFDocument, x: number, width: number, nombreLignes: number): void {
  const numWidth = 26;
  const restWidth = width - numWidth;
  const columns = [
    { label: "N°", width: numWidth },
    { label: "Date", width: restWidth * 0.22 },
    { label: "Heure de début", width: restWidth * 0.19 },
    { label: "Heure de fin", width: restWidth * 0.19 },
    { label: "Durée", width: restWidth * 0.15 },
    { label: "Signature de l'enseignant", width: restWidth * 0.25 },
  ];
  const rowHeight = 24;
  let y = doc.y;

  let cx = x;
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(INK);
  columns.forEach((col) => {
    doc.rect(cx, y, col.width, rowHeight).lineWidth(0.7).strokeColor(INK).stroke();
    doc.text(col.label, cx + 3, y + 8, { width: col.width - 6, align: "center", lineBreak: false });
    cx += col.width;
  });
  y += rowHeight;

  doc.font("Helvetica").fontSize(8);
  for (let i = 1; i <= nombreLignes; i++) {
    cx = x;
    columns.forEach((col, idx) => {
      doc.rect(cx, y, col.width, rowHeight).lineWidth(0.5).strokeColor(LINE).stroke();
      if (idx === 0) {
        doc.fillColor(INK).text(String(i), cx, y + 7, { width: col.width, align: "center", lineBreak: false });
      }
      cx += col.width;
    });
    y += rowHeight;
  }

  doc.y = y;
  doc.x = x;
}

/** Lignes vierges pour texte libre (observations). */
function drawBlankLines(doc: PDFKit.PDFDocument, x: number, width: number, count: number): void {
  let y = doc.y;
  for (let i = 0; i < count; i++) {
    doc
      .moveTo(x, y + 14)
      .lineTo(x + width, y + 14)
      .lineWidth(0.6)
      .strokeColor(LINE)
      .stroke();
    y += 18;
  }
  doc.y = y;
  doc.x = x;
}

/** Bloc de validation — 3 signatures (Enseignant / Chef de département / Direction des Études), jamais liées à une donnée enregistrée sauf le nom de l'enseignant. */
function drawValidationRow(doc: PDFKit.PDFDocument, x: number, width: number, teacherName: string): void {
  drawSectionHeader(doc, x, width, "VALIDATION");
  const y = doc.y;
  const colWidth = width / 3;
  const gap = 12;
  const cells: Array<{ role: string; name?: string }> = [
    { role: "Enseignant", name: teacherName },
    { role: "Chef de département / Coordinateur" },
    { role: "Direction des Études" },
  ];

  cells.forEach((cell, i) => {
    const cx = x + i * colWidth;
    if (cell.name) {
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(INK)
        .text(cell.name, cx, y, { width: colWidth - gap, align: "center", lineBreak: false });
    }
    doc
      .moveTo(cx, y + 34)
      .lineTo(cx + colWidth - gap, y + 34)
      .lineWidth(0.6)
      .strokeColor(LINE)
      .stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .fillColor(INK)
      .text(cell.role, cx, y + 39, { width: colWidth - gap, lineBreak: false });
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(MUTED)
      .text("Nom et signature", cx, y + 50, { width: colWidth - gap, lineBreak: false });
  });

  doc.y = y + 62;
  doc.x = x;
}
