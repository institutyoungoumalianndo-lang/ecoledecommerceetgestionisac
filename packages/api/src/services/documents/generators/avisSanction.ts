import { prisma } from "@isac-erp/db";
import type { GenerateDocumentInput, SanctionType } from "@isac-erp/shared";
import { formatDateFr, renderIdentificationBox, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "SANCTION" }>;

const LEGAL_ESTABLISHMENT_NAME = "l'Institut Privé de Formation Technique et Professionnelle YOUNGOU MALIANNDO (IPFTP YMA)";

const SANCTION_TYPE_LABELS: Record<SanctionType, string> = {
  AVERTISSEMENT: "un avertissement",
  BLAME: "un blâme",
  RETENUE: "une retenue",
  EXCLUSION_TEMPORAIRE: "une exclusion temporaire",
  EXCLUSION_DEFINITIVE: "une exclusion définitive",
  AUTRE: "une sanction disciplinaire",
};

/**
 * Avis de sanction disciplinaire (2026-08-03, retour du porteur du projet) — document officiel lié à
 * un étudiant et à la sanction enregistrée (`services/sanctionService.ts`). Utilise le cadre de
 * signature institutionnel partagé (`renderSignatureAndStamp`, appelé automatiquement par le moteur) —
 * contrairement à FICHE_INSCRIPTION/_COMPLETEE, ce document est bien signé par l'établissement, pas
 * par l'étudiant/le parent.
 */
export async function generateAvisSanction(doc: PDFKit.PDFDocument, ctx: DocumentRenderContext, input: Input): Promise<GeneratorResult> {
  const [student, sanction] = await Promise.all([
    prisma.student.findUniqueOrThrow({ where: { id: input.studentId } }),
    prisma.sanction.findUniqueOrThrow({ where: { id: input.sanctionId } }),
  ]);
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId: input.studentId, cancelledAt: null },
    orderBy: { enrollmentDate: "desc" },
    include: { class: true, filiere: true, level: true },
  });

  const fullName = `${student.firstName} ${student.lastName}`;
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.fontSize(12).fillColor(ctx.printTheme.primaryTextColor);
  doc.moveDown(1.3);
  doc.text(
    `Je soussigné, M. le Directeur de ${LEGAL_ESTABLISHMENT_NAME}, porte à la connaissance de l'étudiant(e) ci-après désigné(e) ` +
      `qu'${SANCTION_TYPE_LABELS[sanction.type]} lui a été notifié(e) le ${formatDateFr(sanction.date)}.`,
    x,
    doc.y,
    { align: "justify", width, lineGap: 3 }
  );
  doc.moveDown(1.1);

  renderIdentificationBox(doc, ctx, [
    ["Nom et prénom(s)", fullName],
    ["Matricule", student.matricule],
    ["Filière", enrollment?.filiere.name ?? "—"],
    ["Niveau", enrollment?.level.label ?? "—"],
    ["Classe", enrollment?.class.name ?? "—"],
    ["Date de la sanction", formatDateFr(sanction.date)],
  ]);

  doc.fontSize(12).fillColor(ctx.printTheme.primaryTextColor);
  doc.text(`Motif : ${sanction.motif}`, x, doc.y, { align: "justify", width, lineGap: 3 });
  doc.moveDown(0.6);
  if (sanction.description) {
    doc.text(sanction.description, x, doc.y, { align: "justify", width, lineGap: 3 });
    doc.moveDown(0.6);
  }
  if (sanction.dureeJours) {
    doc.text(`Durée : ${sanction.dureeJours} jour(s).`, x, doc.y, { align: "justify", width, lineGap: 3 });
    doc.moveDown(0.6);
  }
  doc.moveDown(0.5);
  doc.text(
    "Le présent avis est porté à la connaissance de l'intéressé(e) et de son/ses parent(s) ou tuteur(s), conformément au " +
      "règlement intérieur en vigueur au sein de l'établissement.",
    x,
    doc.y,
    { align: "justify", width, lineGap: 3 }
  );
  doc.moveDown(2.5);

  return {
    relatedEntityType: "Student",
    relatedEntityId: student.id,
    relatedEntityLabel: fullName,
    qrFields: { matricule: student.matricule, nomComplet: fullName, typeSanction: sanction.type },
  };
}
