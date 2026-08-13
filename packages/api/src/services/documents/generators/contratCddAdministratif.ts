import { getEmployeeById } from "../../employeeService.js";
import type { GenerateDocumentInput } from "@isac-erp/shared";
import { formatAmount, formatDateFr, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "CONTRAT_CDD_ADMINISTRATIF" }>;

// Même style "Sobre Contrasté" que ficheInscription.ts/ficheEmargementEnseignant.ts — monochrome noir
// pur, adapté à un document contractuel à deux signataires plutôt qu'un formulaire à remplir à la main.
const INK = "#000000";
const LINE = "#8A93A6";
const MUTED = "#4B5563";
const SECTION_BG = "#F3F4F6";

/**
 * Contrat à durée déterminée — personnel administratif (2026-08-06, retour du porteur du projet) :
 * l'établissement ne fonctionne qu'en CDD, jamais de CDI. Pour le personnel de direction/administratif
 * à salaire fixe, durée = une année scolaire. Cadre de signature et QR code du moteur partagé
 * désactivés pour ce type (voir documentEngineService.ts) : ce générateur dessine son propre bloc de
 * signature à deux parties (Employeur/Salarié).
 *
 * Rédaction : texte de base, non spécialisé — les clauses (absence d'indemnité de fin de contrat,
 * délai de préavis, renouvellement) reflètent les choix du porteur du projet, mais leur conformité au
 * Code du travail de la République de Guinée n'a pas été vérifiée par un juriste (signalé côté
 * application au moment de la conception, voir CHANGELOG). À faire valider avant tout usage réel.
 */
export async function generateContratCddAdministratif(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const employee = await getEmployeeById(input.employeeId);
  const fullName = `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim();

  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  drawHeaderFrame(doc, ctx, x, width);
  drawParties(doc, x, width, ctx.establishment.officialName, input.representantLegalNom, input.representantLegalFonction, fullName, employee);

  const salaire = employee.fixedMonthlySalary !== null ? `${formatAmount(employee.fixedMonthlySalary)} francs guinéens (GNF)` : "montant à préciser";

  drawArticle(doc, x, width, 1, "Engagement", [
    `L'Employeur engage le/la Salarié(e), qui accepte, aux conditions définies au présent contrat et dans le respect de la législation du travail en vigueur en République de Guinée.`,
  ]);
  drawArticle(doc, x, width, 2, "Poste et fonctions", [
    `Le/la Salarié(e) est engagé(e) en qualité de ${employee.categoryLabel}. Il/elle exerce les missions et responsabilités attachées à cette fonction, sous l'autorité de la Direction Générale, et peut se voir confier des tâches connexes relevant de sa qualification.`,
  ]);
  drawArticle(doc, x, width, 3, "Durée", [
    `Le présent contrat est conclu à durée déterminée, pour la durée d'une année scolaire, à compter du ${formatDateFr(input.dateDebut)} jusqu'au ${formatDateFr(input.dateFin)}.`,
    `Il pourra être renouvelé, pour une nouvelle année scolaire, par accord exprès et écrit des parties, formalisé par un nouveau contrat.`,
  ]);
  drawArticle(doc, x, width, 4, "Lieu de travail", [
    `Le/la Salarié(e) exerce ses fonctions au sein du campus ${ctx.campus.name}${ctx.campus.address ? `, sis à ${ctx.campus.address}` : ""}. L'Employeur se réserve la possibilité de l'affecter temporairement à tout autre site relevant de l'établissement, pour les besoins du service.`,
  ]);
  drawArticle(doc, x, width, 5, "Horaires de travail", [
    `Le/la Salarié(e) est soumis(e) à l'horaire de travail en vigueur au sein de l'établissement, tel que précisé par le règlement intérieur et communiqué par la Direction.`,
  ]);
  drawArticle(doc, x, width, 6, "Rémunération", [
    `En contrepartie de son travail, le/la Salarié(e) perçoit une rémunération mensuelle brute de ${salaire}, payable mensuellement.`,
  ]);
  drawArticle(doc, x, width, 7, "Avance sur salaire", [
    `Toute avance sur salaire consentie par l'Employeur au/à la Salarié(e), sur sa demande, fait l'objet d'un plan de remboursement établi d'un commun accord entre les parties. Les échéances ainsi convenues sont déduites du salaire net dû au titre des périodes de paie concernées, jusqu'à apurement total de l'avance.`,
  ]);
  drawArticle(doc, x, width, 8, "Obligations du/de la Salarié(e)", [
    `Le/la Salarié(e) s'engage à exécuter personnellement et loyalement les tâches qui lui sont confiées, à respecter le règlement intérieur de l'établissement, ainsi que les horaires et consignes de la Direction.`,
  ]);
  drawArticle(doc, x, width, 9, "Confidentialité", [
    `Le/la Salarié(e) s'engage à observer la plus stricte discrétion sur toute information relative aux élèves/étudiants, aux familles, au personnel et au fonctionnement interne de l'établissement dont il/elle aurait connaissance dans l'exercice de ses fonctions, pendant la durée du contrat et après sa cessation.`,
  ]);
  drawArticle(doc, x, width, 10, "Cessation du contrat", [
    `Sauf renouvellement dans les conditions de l'article 3, le présent contrat prend fin de plein droit au terme de l'année scolaire fixée à l'article 3, sans indemnité.`,
    `Il peut également prendre fin de manière anticipée en cas de non-respect, par l'une ou l'autre des parties, des engagements souscrits au titre du présent contrat, sous réserve d'un préavis écrit de 15 (quinze) jours notifié par la partie qui entend y mettre fin.`,
  ]);
  drawArticle(doc, x, width, 11, "Règlement des litiges", [
    `Tout différend né de l'exécution ou de l'interprétation du présent contrat sera, autant que possible, réglé à l'amiable. À défaut d'accord, il sera porté devant les juridictions compétentes de la République de Guinée.`,
  ]);
  drawArticle(doc, x, width, 12, "Dispositions finales", [
    `Le présent contrat est établi en deux exemplaires originaux, dont un remis à chacune des parties. Il annule et remplace tout accord antérieur, écrit ou verbal, portant sur le même objet.`,
  ]);

  pushDownForSignature(doc);
  drawSignatureBlock(doc, x, width, input.lieuSignature, input.dateSignature, fullName, "Le/la Salarié(e)");

  doc.fillColor(ctx.printTheme.primaryTextColor);

  return {
    relatedEntityType: "Employee",
    relatedEntityId: employee.id,
    relatedEntityLabel: fullName,
    qrFields: {},
  };
}

/**
 * Cadre professionnel autour de l'en-tête institutionnel seul, sans le titre du document (2026-08-06,
 * retour du porteur du projet — corrige une première version qui englobait aussi le titre). Utilise
 * `ctx.headerBottomY`, renseigné par `documentEngineService.ts` juste après l'en-tête institutionnel
 * et avant le rendu du titre — la seule façon d'obtenir cette limite, puisque `doc.y` a déjà avancé
 * jusqu'après le titre au moment où ce générateur démarre. Le cadre est tracé en creux (outset de 8pt)
 * pour englober logos et texte sans jamais les chevaucher ; `doc.y` n'est jamais modifié par cet appel
 * — le tracé se fait "en arrière" sur une zone déjà remplie plus haut sur la page.
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

/**
 * Pousse le bloc de signature vers le bas de page quand il reste de la place (2026-08-06, retour du
 * porteur du projet — éviter un contrat qui s'arrête à mi-page avec un grand vide sous les
 * signatures). Ne force jamais un dépassement : si le contenu occupe déjà tout l'espace disponible,
 * le bloc s'enchaîne normalement à la suite (et peut déborder sur une page suivante comme avant).
 */
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

/** Identification des deux parties — établissement représenté par un signataire, employé(e) identifié(e). */
function drawParties(
  doc: PDFKit.PDFDocument,
  x: number,
  width: number,
  establishmentName: string,
  representantNom: string,
  representantFonction: string,
  fullName: string,
  employee: { matricule: string; birthDate: Date | null; birthPlace: string | null; nationality: string | null; idNumber: string | null; address: string | null }
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
  const naissance = employee.birthDate
    ? `né(e) le ${formatDateFr(employee.birthDate)}${employee.birthPlace ? ` à ${employee.birthPlace}` : ""}, `
    : "";
  const nationalite = employee.nationality ? `de nationalité ${employee.nationality}, ` : "";
  const piece = employee.idNumber ? `titulaire de la pièce d'identité n° ${employee.idNumber}, ` : "";
  const adresse = employee.address ? `domicilié(e) à ${employee.address}, ` : "";
  doc.text(
    `${fullName}, ${naissance}${nationalite}${piece}${adresse}matricule ${employee.matricule}, ci-après désigné(e) « le/la Salarié(e) »,`,
    x,
    doc.y,
    { width, align: "justify", lineGap: 4 }
  );
  doc.text("d'autre part,", x, doc.y, { width });
  doc.moveDown(0.4);

  doc.text("Il a été convenu et arrêté ce qui suit :", x, doc.y, { width });
  doc.moveDown(0.6);
}

/** Un article numéroté — titre en gras suivi d'un ou plusieurs paragraphes justifiés. */
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

/** Bloc de signature à deux parties — Employeur / employé(e), avec mention manuscrite requise. */
function drawSignatureBlock(
  doc: PDFKit.PDFDocument,
  x: number,
  width: number,
  lieu: string,
  date: Date,
  employeeName: string,
  employeeRole: string
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
    { role: employeeRole, name: employeeName },
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
