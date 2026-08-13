import { prisma, type Prisma } from "@isac-erp/db";
import type {
  ChangeStudentClassInput,
  SetEnrollmentDecisionInput,
  StudentEnrollmentDto,
  UpdateEnrollmentPaymentInput,
} from "@isac-erp/shared";
import { generateRegistrationNumber } from "./matriculeService.js";

const ENROLLMENT_INCLUDE = { class: true, filiere: true, level: true, academicYear: true, regime: true } as const;

type EnrollmentWithRelations = Prisma.StudentEnrollmentGetPayload<{ include: typeof ENROLLMENT_INCLUDE }>;

function toEnrollmentDto(row: EnrollmentWithRelations): StudentEnrollmentDto {
  return {
    id: row.id,
    studentId: row.studentId,
    academicYearId: row.academicYearId,
    academicYearLabel: row.academicYear.label,
    classId: row.classId,
    className: row.class.name,
    filiereId: row.filiereId,
    filiereName: row.filiere.name,
    levelId: row.levelId,
    levelLabel: row.level.label,
    status: row.status,
    decision: row.decision,
    annualAverage: row.annualAverage ? Number(row.annualAverage) : null,
    mention: row.mention,
    enrollmentDate: row.enrollmentDate,
    isCurrentYear: row.academicYear.isActive,
    isEditable: !row.academicYear.isClosed,
    regimeId: row.regimeId,
    regimeLabel: row.regime?.label ?? null,
    registrationNumber: row.registrationNumber,
    feeAmountExpected: row.feeAmountExpected ? Number(row.feeAmountExpected) : null,
    paymentStatus: row.paymentStatus,
    cancelledAt: row.cancelledAt,
    cancelledReason: row.cancelledReason,
  };
}

export async function listStudentEnrollments(studentId: string): Promise<StudentEnrollmentDto[]> {
  const rows = await prisma.studentEnrollment.findMany({
    where: { studentId },
    orderBy: { enrollmentDate: "desc" },
    include: ENROLLMENT_INCLUDE,
  });
  return rows.map(toEnrollmentDto);
}

/**
 * Crée une ligne `student_enrollments` avec numéro d'inscription généré
 * (MODULE-04.1 §2.3) — factorisé pour être réutilisé aussi bien par la
 * création d'un nouvel étudiant (Module 4, première inscription) que par une
 * nouvelle inscription/réinscription d'un étudiant existant (Module 4.1).
 * L'appelant est responsable des contrôles préalables (doublon d'année,
 * capacité, documents) et doit être exécuté dans une transaction incluant
 * `generateRegistrationNumber`.
 */
export async function createEnrollmentRow(
  tx: Prisma.TransactionClient,
  params: {
    studentId: string;
    classId: string;
    regimeId?: string | null;
    status: "NOUVEAU" | "ANCIEN" | "REDOUBLANT" | "TRANSFERT" | "REPRISE";
    enrollmentDate?: Date | null;
    feeAmountExpected?: number | null;
  }
) {
  const targetClass = await tx.class.findUniqueOrThrow({ where: { id: params.classId } });

  const registrationNumber = await generateRegistrationNumber(tx, {
    filiereId: targetClass.filiereId,
    academicYearId: targetClass.academicYearId,
  });

  return tx.studentEnrollment.create({
    data: {
      studentId: params.studentId,
      academicYearId: targetClass.academicYearId,
      classId: targetClass.id,
      filiereId: targetClass.filiereId,
      levelId: targetClass.levelId,
      status: params.status,
      enrollmentDate: params.enrollmentDate ?? new Date(),
      regimeId: params.regimeId ?? null,
      registrationNumber,
      feeAmountExpected: params.feeAmountExpected ?? null,
    },
  });
}

/**
 * Changement de classe/filière/niveau en cours d'année (MODULE-04 §2.3) :
 * modifie en place l'inscription de l'année universitaire de la nouvelle
 * classe (jamais une nouvelle ligne), impossible si cette année est clôturée.
 * Retourne avant/après pour que l'appelant journalise l'opération.
 */
export async function changeStudentClass(
  input: ChangeStudentClassInput
): Promise<{ before: StudentEnrollmentDto; after: StudentEnrollmentDto }> {
  return prisma.$transaction(async (tx) => {
    const newClass = await tx.class.findUniqueOrThrow({
      where: { id: input.newClassId },
      include: { academicYear: true },
    });

    if (newClass.academicYear.isClosed) {
      throw new Error("Cette année universitaire est clôturée — rouvrez-la avant de modifier une inscription.");
    }

    const current = await tx.studentEnrollment.findUnique({
      where: { studentId_academicYearId: { studentId: input.studentId, academicYearId: newClass.academicYearId } },
      include: ENROLLMENT_INCLUDE,
    });
    if (!current) {
      throw new Error(
        "Aucune inscription pour cette année universitaire — créez une nouvelle inscription plutôt qu'un changement de classe."
      );
    }

    const before = toEnrollmentDto(current);

    const updated = await tx.studentEnrollment.update({
      where: { id: current.id },
      data: {
        classId: newClass.id,
        filiereId: newClass.filiereId,
        levelId: newClass.levelId,
        status: input.status ?? current.status,
      },
      include: ENROLLMENT_INCLUDE,
    });

    return { before, after: toEnrollmentDto(updated) };
  });
}

export async function setEnrollmentDecision(
  input: SetEnrollmentDecisionInput
): Promise<{ before: StudentEnrollmentDto; after: StudentEnrollmentDto }> {
  const current = await prisma.studentEnrollment.findUniqueOrThrow({
    where: { id: input.enrollmentId },
    include: ENROLLMENT_INCLUDE,
  });
  if (current.academicYear.isClosed) {
    throw new Error("Cette année universitaire est clôturée — rouvrez-la avant de modifier une inscription.");
  }

  const before = toEnrollmentDto(current);
  const updated = await prisma.studentEnrollment.update({
    where: { id: input.enrollmentId },
    data: {
      decision: input.decision,
      annualAverage: input.annualAverage ?? null,
      mention: input.mention ?? null,
    },
    include: ENROLLMENT_INCLUDE,
  });

  return { before, after: toEnrollmentDto(updated) };
}

/** MODULE-04.1 §1.4 : champs d'affichage uniquement, aucun calcul — le Module 7 restera la référence. */
export async function updateEnrollmentPayment(
  input: UpdateEnrollmentPaymentInput
): Promise<{ before: StudentEnrollmentDto; after: StudentEnrollmentDto }> {
  const current = await prisma.studentEnrollment.findUniqueOrThrow({
    where: { id: input.enrollmentId },
    include: ENROLLMENT_INCLUDE,
  });
  const before = toEnrollmentDto(current);
  const updated = await prisma.studentEnrollment.update({
    where: { id: input.enrollmentId },
    data: {
      feeAmountExpected: input.feeAmountExpected ?? null,
      paymentStatus: input.paymentStatus ?? null,
    },
    include: ENROLLMENT_INCLUDE,
  });
  return { before, after: toEnrollmentDto(updated) };
}

export { toEnrollmentDto, ENROLLMENT_INCLUDE };
export type { EnrollmentWithRelations };
