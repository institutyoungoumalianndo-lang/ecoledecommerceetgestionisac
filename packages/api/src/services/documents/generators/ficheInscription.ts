import { prisma } from "@isac-erp/db";
import type { GenerateDocumentInput } from "@isac-erp/shared";
import type { DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "FICHE_INSCRIPTION" }>;

// Style "Sobre Contrasté" — retenu le 2026-08-02 après maquette (options Indigo Moderne / Sobre
// Contrasté) : monochrome, sans photo (supprimée à la demande du porteur du projet), pensé pour
// être rempli à la main sans assistance. Contrainte impérative : tenir sur une seule page — mise en
// page volontairement dense, propre à ce seul générateur. Texte entièrement en noir pur (retour du
// porteur du projet le 2026-08-03, après un premier essai réel du document) — plus de distinction
// grise pour les libellés, uniquement les lignes de remplissage et le bandeau de section restent gris.
const INK = "#000000";
const LINE = "#8A93A6";
const MUTED = "#000000";
const SECTION_BG = "#F3F4F6";

const PIECES_A_FOURNIR = ["Acte de naissance", "Copie du dernier diplôme", "4 photos", "Certificat de scolarité", "Attestation de niveau"];
const FRAIS_ARTICLES = ["Badge", "Tenue pratique", "Assurance", "Veste"];

interface FieldSpec {
  label: string;
  span?: number;
}

/**
 * Fiche d'inscription et de réinscription (MODULE-09 §1) : formulaire vierge, sans entité liée —
 * aucun étudiant n'existe encore au moment d'une nouvelle inscription (même principe que
 * RAPPORT_CAISSE/ETAT_RECETTES). Le cadre de signature institutionnel du moteur partagé est
 * désactivé pour ce type (voir documentEngineService.ts) : ce générateur dessine sa propre rangée
 * de signature (étudiant/parent), plus pertinente qu'un signataire de l'établissement.
 */
export async function generateFicheInscription(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  _input: Input
): Promise<GeneratorResult> {
  const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });

  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  if (activeYear) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(MUTED)
      .text(`Année universitaire ${activeYear.label}`, x, doc.y, { width, align: "center" });
    doc.moveDown(0.75);
  }

  drawTypeRow(doc, x, width);
  doc.moveDown(0.7);

  drawSection(doc, x, width, "1. INFORMATIONS DE L'ÉTUDIANT(E)", [
    [{ label: "Nom" }, { label: "Prénom(s)" }, { label: "Sexe" }],
    [{ label: "Date de naissance" }, { label: "Lieu de naissance" }, { label: "Nationalité" }],
    [{ label: "Adresse complète", span: 3 }],
    [{ label: "Commune / Ville" }, { label: "Téléphone" }, { label: "Email" }],
    [{ label: "Matricule (réinscription)" }, { label: "Ancienne classe (réinscription)" }, { label: "Situation matrimoniale" }],
  ]);

  drawSection(doc, x, width, "2. SCOLARITÉ SOUHAITÉE", [
    [{ label: "Filière" }, { label: "Niveau" }],
    [{ label: "Programme" }, { label: "Régime (Régulier / Boursier / autre)" }],
  ]);

  drawSection(doc, x, width, "3. PARENT OU TUTEUR RESPONSABLE", [
    [{ label: "Nom complet", span: 2 }, { label: "Lien de parenté" }],
    [{ label: "Téléphone" }, { label: "Profession" }, { label: "Adresse (si différente)" }],
  ]);

  drawSectionHeader(doc, x, width, "4. PIÈCES FOURNIES");
  drawChecklistRow(doc, x, width, PIECES_A_FOURNIR);
  doc.moveDown(0.65);

  drawSectionHeader(doc, x, width, "5. FRAIS ET ARTICLES INCLUS");
  drawFieldRow(doc, x, width, [{ label: "Montant payé", span: 2 }, { label: "" }]);
  drawChecklistRow(doc, x, width, FRAIS_ARTICLES);
  doc.moveDown(0.8);

  drawEngagement(doc, x, width);
  doc.moveDown(1);

  drawSignatureRow(doc, x, width);
  doc.moveDown(0.85);

  drawAdminBox(doc, x, width);

  doc.fillColor(ctx.printTheme.primaryTextColor);

  return {
    relatedEntityType: null,
    relatedEntityId: null,
    relatedEntityLabel: null,
    qrFields: {},
  };
}

/** Case "Nouvelle inscription" / "Réinscription" — vierges, cochées à la main. */
function drawTypeRow(doc: PDFKit.PDFDocument, x: number, width: number): void {
  const y = doc.y;
  const boxSize = 10;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(INK);

  doc.rect(x, y, boxSize, boxSize).lineWidth(0.8).strokeColor(INK).stroke();
  doc.text("Nouvelle inscription", x + boxSize + 6, y + 1, { width: width / 2 - boxSize - 6, lineBreak: false });

  const secondX = x + width / 2;
  doc.rect(secondX, y, boxSize, boxSize).lineWidth(0.8).strokeColor(INK).stroke();
  doc.text("Réinscription", secondX + boxSize + 6, y + 1, { width: width / 2 - boxSize - 6, lineBreak: false });

  doc.font("Helvetica");
  doc.y = y + boxSize + 6;
  doc.x = x;
}

/** En-tête de section — bandeau gris clair, texte en gras. */
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

/** Section complète : bandeau de titre puis grille de champs à remplir. */
function drawSection(doc: PDFKit.PDFDocument, x: number, width: number, title: string, rows: FieldSpec[][]): void {
  drawSectionHeader(doc, x, width, title);
  rows.forEach((row) => drawFieldRow(doc, x, width, row));
  doc.moveDown(0.6);
}

/** Une rangée de champs (libellé + ligne à remplir), colonnes réparties selon `span` (sur 3 colonnes). */
function drawFieldRow(doc: PDFKit.PDFDocument, x: number, width: number, fields: FieldSpec[]): void {
  const y = doc.y;
  const rowHeight = 23;
  const totalSpan = fields.reduce((sum, f) => sum + (f.span ?? 1), 0) || 3;
  const colWidth = width / totalSpan;
  const gap = 10;

  let cx = x;
  fields.forEach((field) => {
    const span = field.span ?? 1;
    const fieldWidth = colWidth * span - gap;
    if (field.label) {
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(MUTED)
        .text(field.label.toUpperCase(), cx, y, { width: fieldWidth, characterSpacing: 0.15, lineBreak: false });
      doc
        .moveTo(cx, y + 16)
        .lineTo(cx + fieldWidth, y + 16)
        .lineWidth(0.6)
        .strokeColor(LINE)
        .stroke();
    }
    cx += colWidth * span;
  });

  doc.y = y + rowHeight;
  doc.x = x;
}

/** Liste de cases à cocher sur une seule ligne — items courts uniquement (pièces fournies, articles). */
function drawChecklistRow(doc: PDFKit.PDFDocument, x: number, width: number, items: string[]): void {
  const y = doc.y;
  const boxSize = 8;
  const colWidth = width / items.length;

  doc.font("Helvetica").fontSize(7.5).fillColor(INK);
  items.forEach((item, i) => {
    const cx = x + i * colWidth;
    doc.rect(cx, y + 1, boxSize, boxSize).lineWidth(0.7).strokeColor(INK).stroke();
    doc.text(item, cx + boxSize + 4, y, { width: colWidth - boxSize - 8, lineBreak: false });
  });

  doc.y = y + 22;
  doc.x = x;
}

/** Paragraphe d'engagement — irrécouvrable des frais versés + consentement au règlement intérieur. */
function drawEngagement(doc: PDFKit.PDFDocument, x: number, width: number): void {
  doc
    .font("Helvetica-Oblique")
    .fontSize(7.5)
    .fillColor(MUTED)
    .text(
      "Je soussigné(e) certifie l'exactitude des informations fournies ci-dessus. Je reconnais que tout montant versé au titre " +
        "des frais d'inscription et/ou de scolarité n'est en aucun cas remboursable, et je déclare, par ma signature, consentir " +
        "expressément à cette condition ainsi qu'à me conformer au règlement intérieur en vigueur au sein de l'établissement.",
      x,
      doc.y,
      { width, align: "justify", lineGap: 3 }
    );
  doc.font("Helvetica").fillColor(INK);
  doc.x = x;
}

/** Rangée de signature — date + deux signatures (étudiant/parent), remplace le cadre institutionnel du moteur partagé. */
function drawSignatureRow(doc: PDFKit.PDFDocument, x: number, width: number): void {
  const y = doc.y;
  const colWidth = width / 3;
  const gap = 12;
  const labels = ["Fait à Conakry, le _____________", "Signature de l'étudiant(e)", "Signature du parent / tuteur"];

  labels.forEach((label, i) => {
    const cx = x + i * colWidth;
    doc
      .moveTo(cx, y + 30)
      .lineTo(cx + colWidth - gap, y + 30)
      .lineWidth(0.6)
      .strokeColor(LINE)
      .stroke();
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(label, cx, y + 35, { width: colWidth - gap, lineBreak: false });
  });

  doc.y = y + 52;
  doc.x = x;
}

/** Encadré "Réservé à l'administration" — bordure pointillée, grille 2x2, rempli par l'agent lors du dépôt. */
function drawAdminBox(doc: PDFKit.PDFDocument, x: number, width: number): void {
  const y = doc.y;
  const height = 62;
  const padding = 8;

  doc.dash(3, { space: 2 }).rect(x, y, width, height).lineWidth(0.8).strokeColor(INK).stroke();
  doc.undash();

  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .fillColor(INK)
    .text("RÉSERVÉ À L'ADMINISTRATION", x + padding, y + 7, { width: width - padding * 2, characterSpacing: 0.3, lineBreak: false });

  const innerWidth = width - padding * 2;
  doc.y = y + 24;
  doc.x = x + padding;
  drawFieldRow(doc, x + padding, innerWidth, [{ label: "Matricule attribué" }, { label: "Classe affectée" }]);

  doc.y = y + 43;
  doc.x = x + padding;
  drawFieldRow(doc, x + padding, innerWidth, [{ label: "Reçu par (agent)" }, { label: "Date de réception" }]);

  doc.y = y + height + 6;
  doc.x = x;
}
