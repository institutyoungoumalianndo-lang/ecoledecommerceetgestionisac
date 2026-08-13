import { getEmployeeById } from "../../employeeService.js";
import type { GenerateDocumentInput } from "@isac-erp/shared";
import { formatDateFr, resolveUploadPath, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "ATTESTATION_TRAVAIL" }>;

// Style "Ruban Tricolore" — retenu le 2026-08-02 après maquette (options Sceau Doré / Ruban
// Tricolore) : ruban aux couleurs du drapeau guinéen tout en haut de la page (bandes verticales
// rouge-jaune-vert), logo de l'école en filigrane très pâle, encadré d'identité à liseré tricolore.
// Propre à ce générateur, comme les autres documents à identité visuelle dédiée.
const GUINEA_COLORS = ["#CE1126", "#FCD116", "#009460"];
const INK = "#2a2a2a";
const CARD_BG = "#FAFAFA";
const META_COLOR = "#555555";

// Nom légal de l'établissement pour les mentions administratives officielles — même formulation que
// `attestationInscription.ts`, pour rester identique d'un document à l'autre.
const LEGAL_ESTABLISHMENT_NAME = "l'Institut Privé de Formation Technique et Professionnelle YOUNGOU MALIANNDO (IPFTP YMA)";

/** Attestation de travail (MODULE-09 §1 — documents du personnel). Réutilise `employeeService.getEmployeeById`
 * (identité déjà résolue depuis `teachers` si l'employé est un enseignant payé — MODULE-08 §1.1). */
export async function generateAttestationTravail(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const employee = await getEmployeeById(input.employeeId);
  const fullName = `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim();

  drawTopRibbon(doc);
  drawWatermark(doc, ctx);

  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.fontSize(13).fillColor(INK);
  doc.moveDown(1.5);
  // Formule d'ouverture fixe (2026-08-02, retour du porteur du projet) — le poste du responsable de
  // l'établissement était absent de l'intitulé ; remplace l'ancien texte dynamique basé sur
  // `ctx.signatory?.title`, qui pouvait afficher un intitulé différent de "Directeur".
  doc.text(`Je soussigné, M. le Directeur de ${LEGAL_ESTABLISHMENT_NAME}, atteste que :`, x, doc.y, {
    align: "justify",
    width,
    lineGap: 3,
  });
  doc.moveDown(1.1);

  drawIdentityCard(doc, x, width, fullName, employee.matricule, employee.categoryLabel);
  doc.moveDown(1.1);

  doc.fontSize(13).fillColor(INK);
  const since = employee.hireDate ? ` depuis le ${formatDateFr(employee.hireDate)}` : "";
  doc.text(
    `est employé(e) au sein de notre établissement${since}, au poste de ${employee.department ?? employee.categoryLabel}, ` +
      `au campus de ${ctx.campus.name}.`,
    x,
    doc.y,
    { align: "justify", width, lineGap: 3 }
  );
  doc.moveDown(1.1);
  doc.text(
    "La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit, notamment auprès de toute " +
      "administration, institution bancaire ou organisme qui pourrait en avoir besoin.",
    x,
    doc.y,
    { align: "justify", width, lineGap: 3 }
  );
  doc.moveDown(2.5);

  // Le cadre de signature (`renderSignatureAndStamp`, moteur partagé, appelé automatiquement après ce
  // générateur) affiche par défaut le titre du signataire configuré (ex. "Directeur des Campus") en
  // gras au-dessus de son nom. Retour du porteur du projet (2026-08-02) : sur cette attestation, seul
  // le nom complet doit apparaître, pas l'intitulé du poste — vidé ici plutôt que dans le moteur
  // partagé, qui reste inchangé pour tous les autres documents. Le choix du signataire lui-même
  // (rôle "Directeur des Campus" plutôt que "Directeur Général") se règle dans Paramètres → Modèles
  // de documents, pas dans le code.
  if (ctx.signatory) ctx.signatory.title = "";

  return {
    relatedEntityType: "Employee",
    relatedEntityId: employee.id,
    relatedEntityLabel: fullName,
    qrFields: { matricule: employee.matricule, nomComplet: fullName },
  };
}

/** Ruban aux couleurs du drapeau guinéen, pleine largeur, tout en haut de la page (jamais superposé
 * aux logos de l'entête institutionnelle, qui démarrent nettement plus bas). */
function drawTopRibbon(doc: PDFKit.PDFDocument): void {
  const height = 6;
  const bandWidth = doc.page.width / GUINEA_COLORS.length;
  GUINEA_COLORS.forEach((color, i) => {
    doc.rect(i * bandWidth, 0, bandWidth + 0.5, height).fill(color);
  });
}

/** Logo de l'école en filigrane très pâle, centré sur le corps du document (sous l'entête déjà rendue). */
function drawWatermark(doc: PDFKit.PDFDocument, ctx: DocumentRenderContext): void {
  const logoPath = resolveUploadPath(ctx.establishment.logoPrimaryPath);
  if (!logoPath) return;
  const size = Math.min(doc.page.width, doc.page.height) * 0.42;
  const cx = doc.page.width / 2 - size / 2;
  const cy = doc.page.height / 2 - size / 2;
  doc.save();
  doc.opacity(0.06);
  doc.image(logoPath, cx, cy, { fit: [size, size] });
  doc.opacity(1);
  doc.restore();
}

/** Encadré d'identité — liseré tricolore vertical sur le bord gauche, nom + matricule + fonction. */
function drawIdentityCard(doc: PDFKit.PDFDocument, x: number, width: number, fullName: string, matricule: string, functionLabel: string): void {
  const padding = 16;
  const barWidth = 4;
  const height = 54;
  const y = doc.y;

  doc.rect(x, y, width, height).fill(CARD_BG);
  const bandHeight = height / GUINEA_COLORS.length;
  GUINEA_COLORS.forEach((color, i) => {
    doc.rect(x, y + i * bandHeight, barWidth, bandHeight + 0.5).fill(color);
  });

  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .fillColor("#1a1a1a")
    .text(fullName.toUpperCase(), x + barWidth, y + 12, { width: width - barWidth, align: "center" });
  doc
    .font("Helvetica")
    .fontSize(10.5)
    .fillColor(META_COLOR)
    .text(`Matricule : ${matricule}    •    Fonction : ${functionLabel}`, x + barWidth, y + 32, {
      width: width - barWidth,
      align: "center",
    });

  doc.x = x;
  doc.y = y + height + padding;
}
