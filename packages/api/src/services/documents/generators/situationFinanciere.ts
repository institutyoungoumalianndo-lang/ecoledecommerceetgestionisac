import { prisma } from "@isac-erp/db";
import type { GenerateDocumentInput } from "@isac-erp/shared";
import { getStudentFeeSummary, SCOLARITE_FEE_TYPE_CODE } from "../../feeSummaryService.js";
import { drawTable, formatAmount, renderStatTiles, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "SITUATION_FINANCIERE" }>;

interface DetailRow {
  studentLabel: string;
  filiereName: string;
  levelLabel: string;
  trancheLabel: string;
  dueDate: string;
  tariffAmount: number;
  paidAmount: number;
  remainingAmount: number;
}

interface GroupTotals {
  filiereName: string;
  levelLabel: string;
  studentCount: number;
  totalNet: number;
  totalPaid: number;
  totalRemaining: number;
}

/**
 * Situation financière (2026-08-09, retour du porteur du projet : "un document qui me dit avec
 * exactitude ce que chaque étudiant doit par filière niveau année et tranche et de façon globale bien
 * structuré", puis "n'affiche que la scolarité dûe par les étudiants pas le reste des tarifs") :
 * contrairement à RETARD_PAIEMENT (qui ne montre que les échéances impayées), ce document liste
 * TOUTES les tranches (soldées ou non) de chaque étudiant du périmètre, avec un récapitulatif global
 * et un récapitulatif par filière/niveau — mais uniquement pour le type de frais "Scolarité"
 * (`FeeType.code === "SCOLARITE"`), jamais les autres tarifs (inscription, bibliothèque...).
 * Réutilise `getStudentFeeSummary` (Module 4.2/4.3) — jamais un nouveau calcul de tarif indépendant.
 */
export async function generateSituationFinanciere(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const [academicYear, filiere, level, scolariteFeeType, enrollments] = await Promise.all([
    prisma.academicYear.findUniqueOrThrow({ where: { id: input.academicYearId } }),
    input.filiereId ? prisma.filiere.findUnique({ where: { id: input.filiereId } }) : null,
    input.levelId ? prisma.level.findUnique({ where: { id: input.levelId } }) : null,
    prisma.feeType.findUnique({ where: { code: SCOLARITE_FEE_TYPE_CODE } }),
    prisma.studentEnrollment.findMany({
      where: {
        academicYearId: input.academicYearId,
        cancelledAt: null,
        filiereId: input.filiereId,
        levelId: input.levelId,
        classId: input.classId,
      },
      include: { student: true, filiere: true, level: true },
      orderBy: [{ filiere: { name: "asc" } }, { level: { orderIndex: "asc" } }, { student: { lastName: "asc" } }],
    }),
  ]);

  const detailRows: DetailRow[] = [];
  const groupTotalsByKey = new Map<string, GroupTotals>();
  let totalNet = 0;
  let totalPaid = 0;
  let totalRemaining = 0;
  let studentsWithScolarite = 0;

  for (const enrollment of enrollments) {
    const summary = await getStudentFeeSummary({ studentId: enrollment.studentId, academicYearId: input.academicYearId });
    const studentLabel = `${enrollment.student.lastName} ${enrollment.student.firstName} (${enrollment.student.matricule})`;

    const line = scolariteFeeType ? summary.lines.find((l) => l.feeTypeId === scolariteFeeType.id) : undefined;
    if (!line || line.netAmount === null) continue; // aucun tarif de scolarité applicable — rien n'est dû
    studentsWithScolarite += 1;

    if (line.installments.length > 0) {
      for (const installment of line.installments) {
        detailRows.push({
          studentLabel,
          filiereName: enrollment.filiere.name,
          levelLabel: enrollment.level.label,
          trancheLabel: installment.label ?? `Tranche ${installment.orderIndex}`,
          dueDate: installment.dueDate.toLocaleDateString("fr-FR"),
          tariffAmount: installment.amount,
          paidAmount: installment.paidAmount,
          remainingAmount: installment.remainingAmount,
        });
      }
    } else {
      detailRows.push({
        studentLabel,
        filiereName: enrollment.filiere.name,
        levelLabel: enrollment.level.label,
        trancheLabel: "Scolarité",
        dueDate: "—",
        tariffAmount: line.netAmount,
        paidAmount: line.paidAmount,
        remainingAmount: line.remainingAmount ?? 0,
      });
    }

    totalNet += line.netAmount;
    totalPaid += line.paidAmount;
    totalRemaining += line.remainingAmount ?? 0;

    const groupKey = `${enrollment.filiere.name}|${enrollment.level.label}`;
    const group = groupTotalsByKey.get(groupKey) ?? {
      filiereName: enrollment.filiere.name,
      levelLabel: enrollment.level.label,
      studentCount: 0,
      totalNet: 0,
      totalPaid: 0,
      totalRemaining: 0,
    };
    group.studentCount += 1;
    group.totalNet += line.netAmount;
    group.totalPaid += line.paidAmount;
    group.totalRemaining += line.remainingAmount ?? 0;
    groupTotalsByKey.set(groupKey, group);
  }

  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const scopeLabel = [filiere?.name, level?.label].filter(Boolean).join(" — ") || "Tous filières et niveaux confondus";
  doc
    .fontSize(10)
    .fillColor(ctx.printTheme.secondaryTextColor)
    .text(`${academicYear.label} — ${scopeLabel} — Scolarité uniquement`, x, doc.y, { width });
  doc.moveDown(0.5);

  renderStatTiles(doc, ctx, [
    { label: "Étudiants", value: String(studentsWithScolarite) },
    { label: "Total attendu (GNF)", value: formatAmount(totalNet) },
    { label: "Total payé (GNF)", value: formatAmount(totalPaid) },
    { label: "Reste dû (GNF)", value: formatAmount(totalRemaining) },
  ]);

  const groups = Array.from(groupTotalsByKey.values()).sort(
    (a, b) => a.filiereName.localeCompare(b.filiereName) || a.levelLabel.localeCompare(b.levelLabel)
  );
  if (groups.length > 1) {
    doc.fontSize(11).font("Helvetica-Bold").fillColor(ctx.printTheme.primaryTextColor).text("Récapitulatif par filière / niveau", x, doc.y, { width });
    doc.font("Helvetica");
    doc.moveDown(0.4);
    drawTable(
      doc,
      ctx,
      [
        { label: "Filière", width: 190 },
        { label: "Niveau", width: 150 },
        { label: "Étudiants", width: 100 },
        { label: "Attendu (GNF)", width: 130 },
        { label: "Payé (GNF)", width: 130 },
        { label: "Reste (GNF)", width: 100 },
      ],
      groups.map((g) => [
        g.filiereName,
        g.levelLabel,
        String(g.studentCount),
        formatAmount(g.totalNet),
        formatAmount(g.totalPaid),
        formatAmount(g.totalRemaining),
      ])
    );
  }

  doc.fontSize(11).font("Helvetica-Bold").fillColor(ctx.printTheme.primaryTextColor).text("Détail de la scolarité par étudiant et par tranche", x, doc.y, { width });
  doc.font("Helvetica");
  doc.moveDown(0.4);

  if (detailRows.length === 0) {
    doc.fontSize(10).fillColor(ctx.printTheme.primaryTextColor).text("Aucun étudiant sur ce périmètre.", x, doc.y, { width });
    doc.moveDown(1);
  } else {
    drawTable(
      doc,
      ctx,
      [
        { label: "Étudiant", width: 150 },
        { label: "Filière", width: 95 },
        { label: "Niveau", width: 75 },
        { label: "Tranche", width: 135 },
        { label: "Échéance", width: 65 },
        { label: "Montant dû (GNF)", width: 80 },
        { label: "Payé (GNF)", width: 75 },
        { label: "Reste (GNF)", width: 75 },
      ],
      detailRows.map((r) => [
        r.studentLabel,
        r.filiereName,
        r.levelLabel,
        r.trancheLabel,
        r.dueDate,
        formatAmount(r.tariffAmount),
        formatAmount(r.paidAmount),
        formatAmount(r.remainingAmount),
      ])
    );
  }

  return {
    relatedEntityType: "AcademicYear",
    relatedEntityId: academicYear.id,
    relatedEntityLabel: `Situation financière — ${scopeLabel}`,
    qrFields: {},
  };
}
