import { prisma } from "@isac-erp/db";
import type { GenerateDocumentInput } from "@isac-erp/shared";
import type { DocumentRenderContext } from "../pdfEngine.js";
import { resolveUploadPath } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "LISTE_ETUDIANTS" }>;

// Document désormais généré en paysage (voir `documentEngineService.ts`, `generateDocument` —
// override d'orientation propre à ce seul type de document) : la colonne Matricule manquait de
// place en portrait, où les matricules longs passaient à la ligne (2026-08-02, retour du porteur
// du projet). Tableau redessiné dans le même esprit "propre" que les rapports comptables déjà
// personnalisés (en-tête colorée, lignes zébrées) plutôt que le `drawTable` générique.
const HEADER_COLOR = "#2C3E50";
const ZEBRA_COLOR = "#F4F6F8";
const BORDER_COLOR = "#E1E5EA";
const INK = "#1E2430";

interface StudentRow {
  photoPath: string | null;
  matricule: string;
  fullName: string;
  phone: string;
  filiereName: string;
  levelLabel: string;
}

/** Liste des étudiants (MODULE-09 §1 — documents administratifs) : archétype tableau, filtrable par classe/filière/niveau. */
export async function generateListeEtudiants(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      academicYearId: input.academicYearId,
      cancelledAt: null,
      classId: input.classId,
      filiereId: input.filiereId,
      levelId: input.levelId,
    },
    include: { student: true, class: true, filiere: true, level: true },
    orderBy: [{ class: { name: "asc" } }, { student: { lastName: "asc" } }],
  });

  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc
    .fontSize(10)
    .fillColor(ctx.printTheme.secondaryTextColor)
    .text(`${enrollments.length} étudiant(s) inscrit(s).`, x, doc.y, { width });
  doc.moveDown(0.75);

  drawStudentTable(
    doc,
    x,
    width,
    enrollments.map((e) => ({
      photoPath: resolveUploadPath(e.student.photoPath),
      matricule: e.student.matricule,
      fullName: `${e.student.lastName} ${e.student.firstName}`,
      phone: e.student.phonePrimary ?? "—",
      filiereName: e.filiere.name,
      levelLabel: e.level.label,
    }))
  );

  const label = input.classId
    ? (enrollments[0]?.class.name ?? "Classe")
    : input.filiereId
      ? (enrollments[0]?.filiere.name ?? "Filière")
      : "Établissement";

  doc.fillColor(ctx.printTheme.primaryTextColor);

  return {
    relatedEntityType: "AcademicYear",
    relatedEntityId: input.academicYearId,
    relatedEntityLabel: `Liste des étudiants — ${label}`,
    qrFields: {},
  };
}

/**
 * Tableau des étudiants — en-tête colorée, lignes zébrées (page en paysage). Colonne Photo ajoutée
 * en tête, colonne Matricule réduite, Classe remplacée par Téléphone (2026-08-09, retour du porteur
 * du projet — la colonne Matricule prenait trop de place, et la classe est déjà implicite au groupe).
 */
function drawStudentTable(doc: PDFKit.PDFDocument, startX: number, tableWidth: number, rows: StudentRow[]): void {
  const columns = [
    { key: "photo", label: "Photo", ratio: 0.08 },
    { key: "matricule", label: "Matricule", ratio: 0.13 },
    { key: "fullName", label: "Nom et prénom", ratio: 0.27 },
    { key: "phone", label: "Téléphone", ratio: 0.16 },
    { key: "filiereName", label: "Filière", ratio: 0.22 },
    { key: "levelLabel", label: "Niveau", ratio: 0.14 },
  ] as const;
  const widths = columns.map((c) => c.ratio * tableWidth);

  const rowHeight = 32;
  const photoSize = rowHeight - 8;
  const fontSize = 10;
  const textYOffset = (rowHeight - fontSize) / 2 - 1;
  let y = doc.y;

  const drawHeaderRow = () => {
    let cx = startX;
    doc.rect(startX, y, tableWidth, rowHeight).fill(HEADER_COLOR);
    columns.forEach((col, i) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#FFFFFF")
        .text(col.label.toUpperCase(), cx + 8, y + textYOffset, { width: widths[i]! - 12, characterSpacing: 0.2, lineBreak: false });
      cx += widths[i]!;
    });
    y += rowHeight;
  };

  const ensureSpace = () => {
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 80) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeaderRow();
    }
  };

  drawHeaderRow();

  rows.forEach((row, i) => {
    ensureSpace();
    doc.rect(startX, y, tableWidth, rowHeight).fill(i % 2 === 1 ? ZEBRA_COLOR : "#FFFFFF");
    doc.rect(startX, y, tableWidth, rowHeight).lineWidth(0.5).strokeColor(BORDER_COLOR).stroke();

    let cx = startX;

    // Colonne Photo — image si disponible, sinon cadre vide (même convention que la carte étudiant).
    const photoY = y + (rowHeight - photoSize) / 2;
    if (row.photoPath) {
      doc.image(row.photoPath, cx + 4, photoY, { fit: [photoSize, photoSize] });
    } else {
      doc.rect(cx + 4, photoY, photoSize, photoSize).lineWidth(0.5).stroke("#9CA3AF");
    }
    cx += widths[0]!;

    const textValues = [row.matricule, row.fullName, row.phone, row.filiereName, row.levelLabel];
    textValues.forEach((value, valueIndex) => {
      const colIndex = valueIndex + 1;
      doc
        .font(colIndex === 1 ? "Helvetica-Bold" : "Helvetica")
        .fontSize(fontSize)
        .fillColor(INK)
        .text(value, cx + 8, y + textYOffset, { width: widths[colIndex]! - 12, lineBreak: false, ellipsis: true });
      cx += widths[colIndex]!;
    });

    y += rowHeight;
  });

  doc.x = startX;
  doc.y = y + 12;
}
