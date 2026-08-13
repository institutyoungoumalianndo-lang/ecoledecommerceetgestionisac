import { prisma } from "@isac-erp/db";
import type { GenerateDocumentInput } from "@isac-erp/shared";
import { drawTable, formatDateFr, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "FICHE_EMARGEMENT" }>;

/** Fiche d'émargement (MODULE-09 §1 — documents administratifs) : archétype "grille de signatures", une ligne par étudiant inscrit dans les classes de la séance. */
export async function generateFicheEmargement(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const seance = await prisma.seance.findUniqueOrThrow({
    where: { id: input.seanceId },
    include: {
      teacher: true,
      subjectOffering: { include: { subject: true, academicYear: true } },
      room: true,
      classes: { include: { class: true } },
    },
  });

  const classIds = seance.classes.map((c) => c.classId);
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { classId: { in: classIds }, cancelledAt: null },
    include: { student: true, class: true },
    orderBy: [{ student: { lastName: "asc" } }],
  });

  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.fontSize(11).fillColor(ctx.printTheme.primaryTextColor);
  doc.text(`Matière : ${seance.subjectOffering.subject.name}`, x, doc.y, { width });
  doc.text(`Enseignant : ${seance.teacher.lastName} ${seance.teacher.firstName}`, x, doc.y, { width });
  doc.text(`Classe(s) : ${seance.classes.map((c) => c.class.name).join(", ")}`, x, doc.y, { width });
  doc.text(`Date : ${formatDateFr(seance.sessionDate)} — ${seance.startTime} à ${seance.endTime}`, x, doc.y, { width });
  if (seance.room) doc.text(`Salle : ${seance.room.label}`, x, doc.y, { width });
  doc.moveDown(1);

  drawTable(
    doc,
    ctx,
    [
      { label: "Matricule", width: 75 },
      { label: "Nom et prénom", width: 170 },
      { label: "Classe", width: 90 },
      { label: "Signature", width: 130 },
    ],
    enrollments.map((e) => [e.student.matricule, `${e.student.lastName} ${e.student.firstName}`, e.class.name, ""]),
    { rowHeight: 32 }
  );

  return {
    relatedEntityType: "Seance",
    relatedEntityId: seance.id,
    relatedEntityLabel: `${seance.subjectOffering.subject.name} — ${formatDateFr(seance.sessionDate)}`,
    qrFields: {},
  };
}
