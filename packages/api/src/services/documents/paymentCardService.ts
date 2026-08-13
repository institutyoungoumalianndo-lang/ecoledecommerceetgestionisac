import { prisma } from "@isac-erp/db";
import type { GeneratedDocumentDto, GeneratePaymentCardInput } from "@isac-erp/shared";
import PDFDocument from "pdfkit";
import { generateNumber } from "../matriculeService.js";
import { getStudentFeeSummary } from "../feeSummaryService.js";
import { saveGeneratedDocument } from "../../uploads/storage.js";
import { getEstablishmentSettings } from "../establishmentService.js";
import { getCampusSettings } from "../campusService.js";
import { getInstitutionalHeaderSettings } from "./institutionalHeaderSettingsService.js";
import { getStudentCardTemplate } from "./studentCardTemplateService.js";
import { toGeneratedDocumentDto } from "./documentEngineService.js";
import { renderPaymentCardPage, type PaymentCardRenderContext, type PaymentCardRenderData } from "./paymentCardEngine.js";

/**
 * Carte de paiement (extension du 2026-07-30, retour du porteur du projet) — même modèle visuel que la
 * carte d'étudiant (MODULE-09.1), mais sans cycle de vie propre : contrairement à `StudentCard`, chaque
 * génération est simplement archivée dans `GeneratedDocument` (documentType `CARTE_PAIEMENT`), la carte
 * physique étant ensuite signée à la main tranche par tranche au fil des paiements réels — le système ne
 * suit pas quelles tranches ont été signées, seulement les montants attendus au moment de la génération.
 */

async function buildRenderContext(): Promise<PaymentCardRenderContext> {
  const [header, establishment, campus, template] = await Promise.all([
    getInstitutionalHeaderSettings(),
    getEstablishmentSettings(),
    getCampusSettings(),
    getStudentCardTemplate(),
  ]);
  return { header, establishment, campus, template };
}

export async function generatePaymentCard(input: GeneratePaymentCardInput, actorUserId: string | null): Promise<GeneratedDocumentDto> {
  const student = await prisma.student.findUniqueOrThrow({ where: { id: input.studentId } });
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId: input.studentId, cancelledAt: null, academicYearId: input.academicYearId },
    orderBy: { enrollmentDate: "desc" },
    include: { academicYear: true, filiere: true, level: true },
  });
  if (!enrollment) {
    throw new Error("Cet étudiant n'a aucune inscription active pour cette année : impossible de générer une carte de paiement.");
  }

  const [summary, scolariteType, inscriptionType, carteEtudiantType, assuranceType] = await Promise.all([
    getStudentFeeSummary({ studentId: input.studentId, academicYearId: enrollment.academicYearId }),
    prisma.feeType.findUnique({ where: { code: "SCOLARITE" } }),
    prisma.feeType.findUnique({ where: { code: "INSCRIPTION" } }),
    prisma.feeType.findUnique({ where: { code: "CARTE_ETUDIANT" } }),
    prisma.feeType.findUnique({ where: { code: "ASSURANCE" } }),
  ]);

  const lineAmount = (feeTypeId: string | undefined) => {
    const line = summary.lines.find((l) => l.feeTypeId === feeTypeId);
    return line?.netAmount ?? line?.tariffAmount ?? 0;
  };
  // Somme des tarifs configurés (Frais → Tarifs) applicables à cet étudiant (filière/niveau/année déjà
  // résolus par `getStudentFeeSummary`, voir MODULE-04.2 §1.3) — après réductions le cas échéant. Le
  // montant "INSCRIPTION" affiché sur la carte cumule les frais d'inscription, de carte d'étudiant et
  // d'assurance (2026-07-30, retour du porteur du projet).
  const scolariteLine = summary.lines.find((l) => l.feeTypeId === scolariteType?.id);
  const scolariteAmount = lineAmount(scolariteType?.id);
  const inscriptionAmount = lineAmount(inscriptionType?.id) + lineAmount(carteEtudiantType?.id) + lineAmount(assuranceType?.id);

  const tranches = (scolariteLine?.installments ?? [])
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((installment, index) => ({
      label: installment.label ?? `TRANCHE ${index + 1}`,
      amount: installment.amount,
    }));

  const fullName = `${student.firstName} ${student.lastName}`;
  const cardNumber = await prisma.$transaction((tx) => generateNumber(tx, "CARTE_PAIEMENT", { academicYearId: enrollment.academicYearId }));

  const qrPayload = JSON.stringify({
    numero: cardNumber,
    matricule: student.matricule,
    nomComplet: fullName,
    anneeUniversitaire: enrollment.academicYear.label,
  });

  const renderCtx = await buildRenderContext();
  const renderData: PaymentCardRenderData = {
    studentLastName: student.lastName,
    studentFirstName: student.firstName,
    studentMatricule: student.matricule,
    studentPhotoPath: student.photoPath,
    filiereName: enrollment.filiere.name,
    levelLabel: enrollment.level.label,
    scolariteAmount,
    inscriptionAmount,
    tranches,
    academicYearLabel: enrollment.academicYear.label,
  };

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: "A4", layout: "portrait", margin: 0, bufferPages: true, autoFirstPage: false });
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.addPage();
    renderPaymentCardPage(doc, renderCtx, renderData);
    doc.end();
  });

  const saved = await saveGeneratedDocument(buffer, cardNumber);
  const row = await prisma.generatedDocument.create({
    data: {
      documentType: "CARTE_PAIEMENT",
      documentNumber: cardNumber,
      relatedEntityType: "Student",
      relatedEntityId: student.id,
      filePath: saved.path,
      qrPayload,
      generatedByUserId: actorUserId,
    },
  });

  return toGeneratedDocumentDto(row, fullName, null);
}
