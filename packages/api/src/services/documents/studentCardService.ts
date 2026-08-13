import { prisma, type Prisma } from "@isac-erp/db";
import type {
  CancelStudentCardInput,
  GenerateStudentCardsBatchInput,
  GenerateStudentCardsBatchResult,
  ListStudentCardsInput,
  ReissueStudentCardInput,
  ReprintStudentCardInput,
  StudentCardDto,
} from "@isac-erp/shared";
import { generateNumber } from "../matriculeService.js";
import { saveGeneratedDocument } from "../../uploads/storage.js";
import * as brandingService from "../brandingService.js";
import { getInstitutionalHeaderSettings } from "./institutionalHeaderSettingsService.js";
import { getEstablishmentSettings } from "../establishmentService.js";
import { getCampusSettings } from "../campusService.js";
import { getStudentCardTemplate } from "./studentCardTemplateService.js";
import { generateQrImageBuffer } from "./pdfEngine.js";
import {
  generateVerificationCode,
  renderStudentCardPage,
  type StudentCardRenderContext,
  type StudentCardRenderData,
} from "./studentCardEngine.js";
import PDFDocument from "pdfkit";

/**
 * Cycle de vie de la carte d'étudiant (MODULE-09.1 §2/§3) — distinct du reste du Module 9 : la carte
 * est un objet avec un état (active/annulée/expirée/remplacée), jamais un simple journal immuable.
 * Seul point d'entrée pour créer/annuler/réémettre/réimprimer une carte.
 */

type StudentCardWithRelations = Prisma.StudentCardGetPayload<{
  include: {
    student: true;
    cancelledByUser: true;
    generatedByUser: true;
    reprints: true;
  };
}>;

function toDto(row: StudentCardWithRelations): StudentCardDto {
  return {
    id: row.id,
    studentId: row.studentId,
    studentName: `${row.student.firstName} ${row.student.lastName}`,
    studentMatricule: row.student.matricule,
    cardNumber: row.cardNumber,
    verificationCode: row.verificationCode,
    status: row.status,
    issuedAt: row.issuedAt,
    expiresAt: row.expiresAt,
    cancelledAt: row.cancelledAt,
    cancelledByName: row.cancelledByUser ? `${row.cancelledByUser.firstName} ${row.cancelledByUser.lastName}` : null,
    cancelledReason: row.cancelledReason,
    supersededByCardId: row.supersededByCardId,
    filePath: row.filePath,
    generatedByName: row.generatedByUser ? `${row.generatedByUser.firstName} ${row.generatedByUser.lastName}` : null,
    createdAt: row.createdAt,
    reprintCount: row.reprints.length,
  };
}

const CARD_INCLUDE = {
  student: true,
  cancelledByUser: true,
  generatedByUser: true,
  reprints: true,
} satisfies Prisma.StudentCardInclude;

async function buildRenderContext(): Promise<StudentCardRenderContext> {
  const [header, establishment, campus, template, stamp, signatories] = await Promise.all([
    getInstitutionalHeaderSettings(),
    getEstablishmentSettings(),
    getCampusSettings(),
    getStudentCardTemplate(),
    brandingService.getOfficialStamp(),
    brandingService.listDocumentSignatories(),
  ]);
  const signatory = signatories.find((s) => s.roleCode === "DIRECTEUR_CAMPUS") ?? null;
  return { header, establishment, campus, template, stamp, signatory };
}

async function loadStudentWithActiveEnrollment(tx: Prisma.TransactionClient, studentId: string) {
  const student = await tx.student.findUniqueOrThrow({ where: { id: studentId } });
  const enrollment = await tx.studentEnrollment.findFirst({
    where: { studentId, cancelledAt: null },
    orderBy: { enrollmentDate: "desc" },
    include: { academicYear: true, class: true, filiere: true, level: true },
  });
  if (!enrollment) {
    throw new Error("Cet étudiant n'a aucune inscription active : impossible de générer une carte d'étudiant.");
  }
  return { student, enrollment };
}

interface IssueCardResult {
  cardId: string;
  renderCtx: StudentCardRenderContext;
  renderData: StudentCardRenderData;
}

/** Cœur commun à la première émission et à la réémission (MODULE-09.1 §3 règles 1-2). */
async function issueCard(
  tx: Prisma.TransactionClient,
  studentId: string,
  supersedeExisting: boolean,
  actorUserId: string | null
): Promise<IssueCardResult> {
  const existingActive = await tx.studentCard.findFirst({ where: { studentId, status: "ACTIVE" } });
  if (existingActive && !supersedeExisting) {
    throw new Error(
      "Cet étudiant possède déjà une carte active. Utilisez la réémission pour en générer une nouvelle (l'ancienne sera automatiquement invalidée)."
    );
  }
  if (existingActive && supersedeExisting) {
    await tx.studentCard.update({ where: { id: existingActive.id }, data: { status: "SUPERSEDED" } });
  }

  const { student, enrollment } = await loadStudentWithActiveEnrollment(tx, studentId);
  const expiresAt = enrollment.academicYear.endDate;
  const issuedAt = new Date();

  const cardNumber = await generateNumber(tx, "CARTE_ETUDIANT", { academicYearId: enrollment.academicYearId });
  let verificationCode = generateVerificationCode();
  // Collision quasi impossible (alphabet 32^8) — nouvelle tentative si jamais le code existe déjà.
  while (await tx.studentCard.findUnique({ where: { verificationCode } })) {
    verificationCode = generateVerificationCode();
  }

  // Payload du QR réduit au strict minimum le 2026-07-31 (retour du porteur du projet : "trop
  // saturé", scan qui échoue) — davantage de champs encodés = version de QR plus élevée = modules
  // plus fins, plus difficiles à lire sur une carte imprimée en petit format. Le numéro de carte et
  // le code de vérification restent imprimés en clair sous le QR (voir `studentCardEngine.ts`,
  // `data.cardNumber`) pour une vérification manuelle sans scanner. Simplifié le 2026-08-02 (retour
  // du porteur du projet) : texte brut sans étiquettes ni JSON, une ligne par valeur — nom, prénom,
  // filière (remplace la classe).
  const qrPayload = [student.lastName, student.firstName, enrollment.filiere.name].join("\n");

  const renderCtx = await buildRenderContext();
  const qrImageBuffer = await generateQrImageBuffer(qrPayload);
  const renderData: StudentCardRenderData = {
    studentLastName: student.lastName,
    studentFirstName: student.firstName,
    studentMatricule: student.matricule,
    studentPhotoPath: student.photoPath,
    filiereName: enrollment.filiere.name,
    levelLabel: enrollment.level.label,
    studentBirthDate: student.birthDate,
    enrollmentDate: enrollment.enrollmentDate,
    studentPhone: student.phonePrimary,
    academicYearLabel: enrollment.academicYear.label,
    cardNumber,
    issuedAt,
    expiresAt,
    qrImageBuffer,
  };

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: "A4", layout: "portrait", margin: 0, bufferPages: true, autoFirstPage: false });
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.addPage();
    renderStudentCardPage(doc, renderCtx, renderData);
    doc.end();
  });

  const saved = await saveGeneratedDocument(buffer, cardNumber);
  const generatedDocument = await tx.generatedDocument.create({
    data: {
      documentType: "CARTE_ETUDIANT",
      documentNumber: cardNumber,
      relatedEntityType: "Student",
      relatedEntityId: student.id,
      filePath: saved.path,
      qrPayload,
      generatedByUserId: actorUserId,
    },
  });

  const newCard = await tx.studentCard.create({
    data: {
      studentId,
      cardNumber,
      verificationCode,
      qrPayload,
      issuedAt,
      expiresAt,
      filePath: saved.path,
      generatedDocumentId: generatedDocument.id,
      generatedByUserId: actorUserId,
    },
  });

  if (existingActive && supersedeExisting) {
    await tx.studentCard.update({ where: { id: existingActive.id }, data: { supersededByCardId: newCard.id } });
  }

  return { cardId: newCard.id, renderCtx, renderData };
}

export async function generateStudentCard(studentId: string, actorUserId: string | null): Promise<StudentCardDto> {
  const { cardId } = await prisma.$transaction((tx) => issueCard(tx, studentId, false, actorUserId), { timeout: 20000 });
  return getStudentCardById(cardId);
}

export async function reissueStudentCard(input: ReissueStudentCardInput, actorUserId: string | null): Promise<StudentCardDto> {
  const { cardId } = await prisma.$transaction((tx) => issueCard(tx, input.studentId, true, actorUserId), { timeout: 20000 });
  return getStudentCardById(cardId);
}

/** Annulation (§3 règle 3) — perte/vol, geste explicite distinct de la réémission, n'en émet jamais une nouvelle automatiquement. */
export async function cancelStudentCard(input: CancelStudentCardInput, actorUserId: string): Promise<StudentCardDto> {
  const card = await prisma.studentCard.findUniqueOrThrow({ where: { id: input.id } });
  if (card.status !== "ACTIVE") {
    throw new Error("Seule une carte active peut être annulée.");
  }
  await prisma.studentCard.update({
    where: { id: input.id },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelledBy: actorUserId, cancelledReason: input.reason },
  });
  return getStudentCardById(input.id);
}

/** Réimpression (§3 règle 4) — retélécharge strictement le PDF déjà archivé, ne consomme jamais un nouveau numéro. */
export async function reprintStudentCard(input: ReprintStudentCardInput, actorUserId: string | null): Promise<StudentCardDto> {
  const card = await prisma.studentCard.findUniqueOrThrow({ where: { id: input.id } });
  await prisma.studentCardReprint.create({
    data: { studentCardId: card.id, reprintedBy: actorUserId, reason: input.reason },
  });
  return getStudentCardById(input.id);
}

export async function listStudentCards(filter: ListStudentCardsInput): Promise<StudentCardDto[]> {
  const rows = await prisma.studentCard.findMany({
    where: {
      studentId: filter.studentId,
      status: filter.status,
      OR: filter.search
        ? [
            { cardNumber: { contains: filter.search, mode: "insensitive" } },
            { verificationCode: { contains: filter.search, mode: "insensitive" } },
            { student: { matricule: { contains: filter.search, mode: "insensitive" } } },
            { student: { lastName: { contains: filter.search, mode: "insensitive" } } },
            { student: { firstName: { contains: filter.search, mode: "insensitive" } } },
          ]
        : undefined,
    },
    include: CARD_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return rows.map(toDto);
}

export async function getStudentCardById(id: string): Promise<StudentCardDto> {
  const row = await prisma.studentCard.findUniqueOrThrow({ where: { id }, include: CARD_INCLUDE });
  return toDto(row);
}

/**
 * Génération par lot (§6 point 5) : chaque étudiant reçoit sa propre carte individuelle archivée
 * normalement (numéro/QR/fichier propres) ; en plus, un PDF combiné est construit — une page par
 * étudiant — pour l'impression pratique du lot en une seule fois. Les étudiants ayant déjà une carte
 * active ne sont jamais réémis automatiquement en masse (échec explicite, réémission = geste individuel).
 */
export async function generateStudentCardsBatch(
  input: GenerateStudentCardsBatchInput,
  actorUserId: string | null
): Promise<GenerateStudentCardsBatchResult> {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      academicYearId: input.academicYearId,
      cancelledAt: null,
      classId: input.classId,
      filiereId: input.filiereId,
      levelId: input.levelId,
    },
    include: { student: true },
    orderBy: [{ student: { lastName: "asc" } }],
  });

  const failed: GenerateStudentCardsBatchResult["failed"] = [];
  const issued: IssueCardResult[] = [];

  for (const enrollment of enrollments) {
    try {
      const result = await prisma.$transaction((tx) => issueCard(tx, enrollment.studentId, false, actorUserId), {
        timeout: 20000,
      });
      issued.push(result);
    } catch (error) {
      failed.push({
        studentId: enrollment.studentId,
        studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
        error: error instanceof Error ? error.message : "Erreur inconnue.",
      });
    }
  }

  let batchFilePath = "";
  if (issued.length > 0) {
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: "A4", layout: "portrait", margin: 0, bufferPages: true, autoFirstPage: false });
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      for (const item of issued) {
        doc.addPage();
        renderStudentCardPage(doc, item.renderCtx, item.renderData);
      }
      doc.end();
    });
    const saved = await saveGeneratedDocument(buffer, `LOT-${Date.now()}`);
    batchFilePath = saved.path;
  }

  return { batchFilePath, generatedCount: issued.length, failed };
}
