import { prisma } from "@isac-erp/db";
import type { GenerateDocumentInput } from "@isac-erp/shared";
import { formatDateFr, resolveUploadPath, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "CERTIFICAT_SCOLARITE" }>;

// Style "Diplôme Marine & Or" — retenu le 2026-08-02 après maquette (options Marine & Or / Émeraude
// Impériale) : le porteur du projet voulait un document qui "épate son lecteur" — double cadre façon
// diplôme, bandeau dégradé, filigrane du logo de l'école, fiche d'identité aussi complète que
// possible. Propre à ce générateur, comme les autres documents à identité visuelle dédiée.
const NAVY = "#16305C";
const NAVY_DEEP = "#234A85";
const GOLD = "#B8860B";
const GOLD_LINE = "#E3CE9C";
const INK = "#2a2a2a";
const LABEL_COLOR = "#8a6d1f";
const VALUE_COLOR = "#1a1a1a";

const LEGAL_ESTABLISHMENT_NAME = "l'Institut Privé de Formation Technique et Professionnelle YOUNGOU MALIANNDO (IPFTP YMA)";
const MM_TO_PT = 2.834645669;

async function loadStudentWithEnrollment(studentId: string) {
  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId } });
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId, cancelledAt: null },
    orderBy: { enrollmentDate: "desc" },
    include: { academicYear: true, class: true, filiere: true, level: true, regime: true },
  });
  return { student, enrollment };
}

/** Certificat de scolarité (MODULE-09 §1 — documents étudiants) : atteste l'inscription en cours de l'étudiant. */
export async function generateCertificatScolarite(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const { student, enrollment } = await loadStudentWithEnrollment(input.studentId);
  if (!enrollment) {
    throw new Error("Cet étudiant n'a aucune inscription active : impossible de générer un certificat de scolarité.");
  }

  const fullName = `${student.firstName} ${student.lastName}`;
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  drawDoubleFrame(doc);
  drawWatermark(doc, ctx);

  doc.fontSize(11.5).fillColor(INK);
  doc.moveDown(1.2);
  doc.text(
    `Je soussigné, M. le Directeur de ${LEGAL_ESTABLISHMENT_NAME}, certifie que l'étudiant(e) ci-après désigné(e) est ` +
      `régulièrement inscrit(e) au sein de notre établissement pour l'année universitaire en cours.`,
    x,
    doc.y,
    { align: "justify", width, lineGap: 3 }
  );
  doc.moveDown(0.9);

  drawNameBanner(doc, x, width, fullName);
  doc.moveDown(0.7);

  const birthLine = `${student.birthDate ? formatDateFr(student.birthDate) : "—"}${student.birthPlace ? ` à ${student.birthPlace}` : ""}`;
  const addressLine = [student.address, student.commune, student.city].filter(Boolean).join(", ");
  drawIdentitySection(doc, ctx, x, width, resolveUploadPath(student.photoPath), [
    ["Matricule", student.matricule],
    ["Sexe", student.gender === "M" ? "Masculin" : "Féminin"],
    ["Né(e) le", birthLine],
    ["Nationalité", student.nationality ?? "—"],
    ["Adresse", addressLine || "—"],
    ["Téléphone", student.phonePrimary ?? "—"],
    ["Filière", enrollment.filiere.name],
    ["Niveau", enrollment.level.label],
    ["Classe", enrollment.class.name],
    ["Régime", enrollment.regime?.label ?? "—"],
    ["Année universitaire", enrollment.academicYear.label],
    ["N° / date d'inscription", `${enrollment.registrationNumber ?? "—"} — ${formatDateFr(enrollment.enrollmentDate)}`],
  ]);
  doc.moveDown(0.9);

  doc.fontSize(11.5).fillColor(INK);
  doc.text(
    "Le présent certificat est délivré à l'intéressé(e) pour servir et valoir ce que de droit, notamment auprès de toute " +
      "administration, ambassade ou organisme qui pourrait en avoir besoin.",
    x,
    doc.y,
    { align: "justify", width, lineGap: 3 }
  );
  doc.moveDown(2.2);

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

/** Double cadre façon diplôme — liseré fin doré à l'extérieur, cadre épais marine à l'intérieur. */
function drawDoubleFrame(doc: PDFKit.PDFDocument): void {
  const outerInset = 8 * MM_TO_PT;
  const innerInset = 11 * MM_TO_PT;
  const w = doc.page.width;
  const h = doc.page.height;

  doc
    .rect(outerInset, outerInset, w - outerInset * 2, h - outerInset * 2)
    .lineWidth(1.2)
    .strokeColor(GOLD)
    .stroke();
  doc
    .rect(innerInset, innerInset, w - innerInset * 2, h - innerInset * 2)
    .lineWidth(2.8)
    .strokeColor(NAVY)
    .stroke();
}

/** Logo de l'école en filigrane très pâle, centré sur la page. */
function drawWatermark(doc: PDFKit.PDFDocument, ctx: DocumentRenderContext): void {
  const logoPath = resolveUploadPath(ctx.establishment.logoPrimaryPath);
  if (!logoPath) return;
  const size = Math.min(doc.page.width, doc.page.height) * 0.4;
  const cx = doc.page.width / 2 - size / 2;
  const cy = doc.page.height / 2 - size / 2;
  doc.save();
  doc.opacity(0.06);
  doc.image(logoPath, cx, cy, { fit: [size, size] });
  doc.opacity(1);
  doc.restore();
}

/** Bandeau dégradé marine → or portant le nom de l'étudiant. */
function drawNameBanner(doc: PDFKit.PDFDocument, x: number, width: number, fullName: string): void {
  const height = 30;
  const y = doc.y;
  const gradient = doc.linearGradient(x, y, x + width, y);
  gradient.stop(0, NAVY).stop(0.6, NAVY_DEEP).stop(1, GOLD);
  doc.roundedRect(x, y, width, height, 4).fill(gradient);
  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .fillColor("#FFFFFF")
    .text(fullName.toUpperCase(), x, y + 8, { width, align: "center", characterSpacing: 0.5 });

  doc.x = x;
  doc.y = y + height + 10;
}

/** Photo (toujours réservée) + fiche d'identité complète, sur 2 colonnes. */
function drawIdentitySection(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  x: number,
  width: number,
  photoPath: string | null,
  fields: [string, string][]
): void {
  const photoSize = 80;
  const photoGutter = 18;
  const columns = 2;
  const gridX = x + photoSize + photoGutter;
  const gridWidth = width - photoSize - photoGutter;
  const colWidth = gridWidth / columns;
  const rowHeight = 24;
  const rows = Math.ceil(fields.length / columns);
  const sectionHeight = Math.max(rows * rowHeight, photoSize + 16);
  const y = doc.y;

  doc
    .rect(x, y, width, sectionHeight)
    .lineWidth(0.75)
    .strokeColor(GOLD_LINE)
    .stroke();

  const photoY = y + (sectionHeight - photoSize) / 2;
  doc.roundedRect(x + 8, photoY, photoSize, photoSize, 4).lineWidth(0.75).strokeColor(GOLD_LINE).stroke();
  if (photoPath) {
    doc.image(photoPath, x + 8, photoY, { fit: [photoSize, photoSize] });
  } else {
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(GOLD_LINE)
      .text("Photo", x + 8, photoY + photoSize / 2 - 4, { width: photoSize, align: "center" });
  }

  const gridPadding = 8;
  fields.forEach(([label, value], i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const cx = gridX + col * colWidth;
    const cy = y + gridPadding + row * rowHeight;
    doc
      .font("Helvetica-Bold")
      .fontSize(6.5)
      .fillColor(LABEL_COLOR)
      .text(label.toUpperCase(), cx, cy, { width: colWidth - 10, characterSpacing: 0.2, lineBreak: false });
    doc
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor(VALUE_COLOR)
      .text(value, cx, cy + 10, { width: colWidth - 10, lineBreak: false, ellipsis: true });
  });

  doc.x = x;
  doc.y = y + sectionHeight + 14;
  doc.fillColor(ctx.printTheme.primaryTextColor);
}
