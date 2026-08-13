import { getTeacherById } from "../../teacherService.js";
import type { GenerateDocumentInput } from "@isac-erp/shared";
import { formatAmount, formatDateFr, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "CONTRAT_CDD_ENSEIGNANT" }>;

const INK = "#000000";
const LINE = "#8A93A6";
const MUTED = "#4B5563";
const SECTION_BG = "#F3F4F6";

/**
 * Contrat à durée déterminée — enseignant, par module d'enseignement (2026-08-06, retour du porteur
 * du projet) : recrutement direct, sans période d'essai ; durée = un module ; renouvelable module par
 * module ; rémunération au taux horaire (modifiable d'un contrat à l'autre). Cadre de signature et QR
 * code du moteur partagé désactivés pour ce type : ce générateur dessine son propre bloc de signature
 * (Employeur/Enseignant).
 *
 * Rédaction : texte de base, non spécialisé — voir la même réserve que contratCddAdministratif.ts
 * (clauses à faire valider par un juriste avant tout usage réel, notamment le renouvellement répété
 * d'un CDD qui peut, selon le Code du travail, entraîner une requalification).
 */
export async function generateContratCddEnseignant(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const teacher = await getTeacherById(input.teacherId);
  const fullName = `${teacher.firstName} ${teacher.lastName}`.trim();

  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  drawHeaderFrame(doc, ctx, x, width);
  drawParties(doc, x, width, ctx.establishment.officialName, input.representantLegalNom, input.representantLegalFonction, fullName, teacher, "l'Enseignant(e)");

  drawArticle(doc, x, width, 1, "Engagement", [
    `L'Employeur engage l'Enseignant(e), qui accepte, pour assurer l'enseignement du module suivant : ${input.intituleModule}, dans le respect de la législation du travail en vigueur en République de Guinée.`,
  ]);
  drawArticle(doc, x, width, 2, "Fonctions", [
    `L'Enseignant(e) est chargé(e) de dispenser les enseignements du module mentionné à l'article 1, dans le respect du programme pédagogique arrêté par la Direction des Études, ainsi que des tâches connexes usuelles (évaluation, correction, participation aux conseils de classe concernant le module).`,
  ]);
  drawArticle(doc, x, width, 3, "Durée", [
    `Le présent contrat est conclu à durée déterminée, pour la durée du module mentionné à l'article 1, à compter du ${formatDateFr(input.dateDebut)} jusqu'au ${formatDateFr(input.dateFin)}. Il n'est assorti d'aucune période d'essai, l'Enseignant(e) étant directement recruté(e) pour ce module.`,
    `Il pourra être renouvelé, par accord exprès des parties, pour un nouveau module d'enseignement, selon les mêmes modalités ou des modalités convenues entre elles.`,
  ]);
  drawArticle(doc, x, width, 4, "Lieu de travail", [
    `L'Enseignant(e) exerce ses fonctions au sein du campus ${ctx.campus.name}${ctx.campus.address ? `, sis à ${ctx.campus.address}` : ""}.`,
  ]);
  drawArticle(doc, x, width, 5, "Rémunération", [
    `L'Enseignant(e) perçoit une rémunération calculée sur la base d'un taux horaire de ${formatAmount(input.tauxHoraire)} francs guinéens (GNF), versée en fonction du nombre d'heures effectivement dispensées et validées, telles que constatées sur la fiche d'émargement mensuelle.`,
  ]);
  drawArticle(doc, x, width, 6, "Avance sur salaire", [
    `Toute avance sur salaire consentie par l'Employeur à l'Enseignant(e), sur sa demande, fait l'objet d'un plan de remboursement établi d'un commun accord entre les parties. Les échéances ainsi convenues sont déduites du salaire net dû au titre des périodes de paie concernées, jusqu'à apurement total de l'avance.`,
  ]);
  drawArticle(doc, x, width, 7, "Obligations de l'Enseignant(e)", [
    `L'Enseignant(e) s'engage à exécuter personnellement et loyalement les enseignements qui lui sont confiés, à respecter le règlement intérieur de l'établissement, le programme pédagogique et le planning communiqué par la Direction des Études.`,
  ]);
  drawArticle(doc, x, width, 8, "Confidentialité", [
    `L'Enseignant(e) s'engage à observer la plus stricte discrétion sur toute information relative aux élèves/étudiants, aux familles et au fonctionnement interne de l'établissement dont il/elle aurait connaissance dans l'exercice de ses fonctions, pendant la durée du contrat et après sa cessation.`,
  ]);
  drawArticle(doc, x, width, 9, "Cessation du contrat", [
    `Le présent contrat prend fin de plein droit à l'échéance du module fixée à l'article 3, sans indemnité.`,
    `Il peut également prendre fin de manière anticipée en cas de non-respect, par l'une ou l'autre des parties, des engagements souscrits au titre du présent contrat, sous réserve d'un préavis écrit de 15 (quinze) jours notifié par la partie qui entend y mettre fin.`,
  ]);
  drawArticle(doc, x, width, 10, "Règlement des litiges", [
    `Tout différend né de l'exécution ou de l'interprétation du présent contrat sera, autant que possible, réglé à l'amiable. À défaut d'accord, il sera porté devant les juridictions compétentes de la République de Guinée.`,
  ]);
  drawArticle(doc, x, width, 11, "Dispositions finales", [
    `Le présent contrat est établi en deux exemplaires originaux, dont un remis à chacune des parties. Il annule et remplace tout accord antérieur, écrit ou verbal, portant sur le même objet.`,
  ]);

  pushDownForSignature(doc);
  drawSignatureBlock(doc, x, width, input.lieuSignature, input.dateSignature, fullName, "L'Enseignant(e)");

  doc.fillColor(ctx.printTheme.primaryTextColor);

  return {
    relatedEntityType: "Teacher",
    relatedEntityId: teacher.id,
    relatedEntityLabel: `${fullName} — ${input.intituleModule}`,
    qrFields: {},
  };
}

/**
 * Cadre professionnel autour de l'en-tête institutionnel seul, sans le titre — voir
 * contratCddAdministratif.ts pour la justification complète.
 */
function drawHeaderFrame(doc: PDFKit.PDFDocument, ctx: DocumentRenderContext, x: number, width: number): void {
  const startY = doc.y;
  const top = doc.page.margins.top - 8;
  const bottom = (ctx.headerBottomY ?? startY) + 4;
  doc
    .roundedRect(x - 8, top, width + 16, bottom - top, 3)
    .lineWidth(0.8)
    .strokeColor(LINE)
    .stroke();
  doc.x = x;
  doc.y = startY;
}

/** Pousse le bloc de signature vers le bas de page quand il reste de la place — voir contratCddAdministratif.ts. */
function pushDownForSignature(doc: PDFKit.PDFDocument): void {
  // 130 + 5 lignes (~13pt chacune) — remonté le 2026-08-06 (retour du porteur du projet, la version à
  // 130 laissait le bloc de signature trop bas sur la page).
  const SIGNATURE_RESERVED_HEIGHT = 195;
  const bottomLimit = doc.page.height - doc.page.margins.bottom;
  const target = bottomLimit - SIGNATURE_RESERVED_HEIGHT;
  if (doc.y < target) {
    doc.y = target;
  }
}

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

function drawParties(
  doc: PDFKit.PDFDocument,
  x: number,
  width: number,
  establishmentName: string,
  representantNom: string,
  representantFonction: string,
  fullName: string,
  teacher: { matricule: string; birthDate: Date | null; birthPlace: string | null; nationality: string | null; idNumber: string | null; address: string | null },
  partyLabel: string
): void {
  doc.font("Helvetica").fontSize(9.5).fillColor(INK);
  doc.text("Entre les soussignés :", x, doc.y, { width });
  doc.moveDown(0.4);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED).text("L'EMPLOYEUR", x, doc.y, { width, characterSpacing: 0.2 });
  doc.font("Helvetica").fontSize(9.5).fillColor(INK);
  doc.text(`${establishmentName}, représenté par ${representantNom}, en qualité de ${representantFonction}, ci-après désigné « l'Employeur »,`, x, doc.y, {
    width,
    align: "justify",
    lineGap: 4,
  });
  doc.text("d'une part,", x, doc.y, { width });
  doc.moveDown(0.4);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED).text("ET", x, doc.y, { width, characterSpacing: 0.2 });
  doc.font("Helvetica").fontSize(9.5).fillColor(INK);
  const naissance = teacher.birthDate ? `né(e) le ${formatDateFr(teacher.birthDate)}${teacher.birthPlace ? ` à ${teacher.birthPlace}` : ""}, ` : "";
  const nationalite = teacher.nationality ? `de nationalité ${teacher.nationality}, ` : "";
  const piece = teacher.idNumber ? `titulaire de la pièce d'identité n° ${teacher.idNumber}, ` : "";
  const adresse = teacher.address ? `domicilié(e) à ${teacher.address}, ` : "";
  doc.text(
    `${fullName}, ${naissance}${nationalite}${piece}${adresse}matricule ${teacher.matricule}, ci-après désigné(e) « ${partyLabel} »,`,
    x,
    doc.y,
    { width, align: "justify", lineGap: 4 }
  );
  doc.text("d'autre part,", x, doc.y, { width });
  doc.moveDown(0.4);

  doc.text("Il a été convenu et arrêté ce qui suit :", x, doc.y, { width });
  doc.moveDown(0.6);
}

function drawArticle(doc: PDFKit.PDFDocument, x: number, width: number, num: number, title: string, paragraphs: string[]): void {
  const y = doc.y;
  doc
    .moveTo(x, y)
    .lineTo(x + width, y)
    .lineWidth(0.5)
    .strokeColor(LINE)
    .stroke();
  doc.y = y + 10;
  doc.x = x;

  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK).text(`Article ${num} — ${title}`, x, doc.y, { width });
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(9);
  for (const p of paragraphs) {
    doc.text(p, x, doc.y, { width, align: "justify", lineGap: 4 });
    doc.moveDown(0.5);
  }
}

function drawSignatureBlock(
  doc: PDFKit.PDFDocument,
  x: number,
  width: number,
  lieu: string,
  date: Date,
  teacherName: string,
  teacherRole: string
): void {
  doc.moveDown(0.4);
  drawSectionHeader(doc, x, width, "SIGNATURES");

  doc
    .font("Helvetica-Oblique")
    .fontSize(9)
    .fillColor(INK)
    .text(`Fait à ${lieu}, le ${formatDateFr(date)}, en deux exemplaires originaux.`, x, doc.y, { width });
  doc.moveDown(1);

  const y = doc.y;
  const colWidth = width / 2;
  const gap = 16;
  const cells: Array<{ role: string; name?: string }> = [
    { role: "L'Employeur" },
    { role: teacherRole, name: teacherName },
  ];

  cells.forEach((cell, i) => {
    const cx = x + i * colWidth;
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(MUTED)
      .text("Précédé de la mention manuscrite « Lu et approuvé, bon pour accord »", cx, y, { width: colWidth - gap });
    doc
      .moveTo(cx, y + 34)
      .lineTo(cx + colWidth - gap, y + 34)
      .lineWidth(0.6)
      .strokeColor(LINE)
      .stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(INK)
      .text(cell.role, cx, y + 39, { width: colWidth - gap, lineBreak: false });
    if (cell.name) {
      doc.font("Helvetica").fontSize(8).fillColor(INK).text(cell.name, cx, y + 51, { width: colWidth - gap, lineBreak: false });
    }
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(MUTED)
      .text("Nom et signature", cx, y + (cell.name ? 62 : 51), { width: colWidth - gap, lineBreak: false });
  });

  doc.y = y + 74;
  doc.x = x;
}
