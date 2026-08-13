import { prisma, type Prisma } from "@isac-erp/db";
import type {
  CancelEnrollmentInput,
  CheckEnrollmentConditionsInput,
  CreateEnrollmentInput,
  EnrollmentConditionsResult,
  EnrollmentDashboard,
  EnrollmentDashboardInput,
  EnrollmentListFilterInput,
  EnrollmentListPage,
  EnrollmentListRow,
  StudentEnrollmentDto,
} from "@isac-erp/shared";
import { createEnrollmentRow, ENROLLMENT_INCLUDE, toEnrollmentDto } from "./studentEnrollmentService.js";
import { notifyEnrollmentValidated } from "./enrollmentNotificationService.js";

const EXPORT_ROW_CAP = 5000;

/**
 * Contrôle des conditions d'inscription (MODULE-04.1 §1.5/§3.1) : capacité de
 * classe et documents obligatoires sont désactivés par défaut (aucun impact
 * rétroactif sur les inscriptions déjà créées au Module 4).
 */
export async function checkEnrollmentConditions(
  input: CheckEnrollmentConditionsInput
): Promise<EnrollmentConditionsResult> {
  const targetClass = await prisma.class.findUniqueOrThrow({ where: { id: input.classId } });

  const [existing, settings, currentClassHeadcount, requiredTypes, studentDocuments] = await Promise.all([
    prisma.studentEnrollment.findUnique({
      where: { studentId_academicYearId: { studentId: input.studentId, academicYearId: targetClass.academicYearId } },
    }),
    prisma.enrollmentSettings.findFirst(),
    prisma.studentEnrollment.count({ where: { classId: input.classId, cancelledAt: null } }),
    prisma.enrollmentDocumentRequirement.findMany({ where: { isRequired: true } }),
    prisma.studentDocument.findMany({ where: { studentId: input.studentId }, select: { type: true } }),
  ]);

  const capacityEnforced = settings?.enforceClassCapacity ?? false;
  const providedTypes = new Set(studentDocuments.map((d) => d.type));
  const missingRequiredDocumentTypes = requiredTypes
    .map((r) => r.documentType)
    .filter((type) => !providedTypes.has(type));

  return {
    alreadyEnrolledThisYear: Boolean(existing),
    capacityEnforced,
    capacityReached: capacityEnforced && targetClass.maxCapacity !== null && currentClassHeadcount >= targetClass.maxCapacity,
    classCapacity: targetClass.maxCapacity,
    currentClassHeadcount,
    missingRequiredDocumentTypes,
  };
}

/**
 * Nouvelle inscription (étudiant existant) ou réinscription (MODULE-04.1
 * §3.1/§3.3) — même opération : crée une ligne `student_enrollments` pour
 * une nouvelle année. Revérifie les conditions côté serveur (le contrôle
 * côté UI n'est qu'indicatif, jamais la seule garde-fou).
 */
export async function createEnrollment(input: CreateEnrollmentInput): Promise<StudentEnrollmentDto> {
  const conditions = await checkEnrollmentConditions({ studentId: input.studentId, classId: input.classId });
  if (conditions.alreadyEnrolledThisYear) {
    throw new Error("Cet étudiant est déjà inscrit pour cette année universitaire.");
  }
  if (conditions.capacityReached) {
    throw new Error("Cette classe a atteint sa capacité maximale.");
  }
  if (conditions.missingRequiredDocumentTypes.length > 0) {
    throw new Error("Des documents obligatoires sont manquants au dossier de cet étudiant.");
  }

  const dto = await prisma.$transaction(async (tx) => {
    const row = await createEnrollmentRow(tx, {
      studentId: input.studentId,
      classId: input.classId,
      regimeId: input.regimeId,
      status: input.status,
      enrollmentDate: input.enrollmentDate,
      feeAmountExpected: input.feeAmountExpected,
    });
    const withRelations = await tx.studentEnrollment.findUniqueOrThrow({
      where: { id: row.id },
      include: ENROLLMENT_INCLUDE,
    });
    return toEnrollmentDto(withRelations);
  });

  // Module 12 — Centre de Communication : notification automatique (voir MODULE-12 §1.10).
  void notifyEnrollmentValidated(dto);

  return dto;
}

/** Annulation réversible (jamais de suppression physique) — voir MODULE-04.1 §3.4. */
export async function cancelEnrollment(
  input: CancelEnrollmentInput,
  cancelledBy: string
): Promise<{ before: StudentEnrollmentDto; after: StudentEnrollmentDto }> {
  const current = await prisma.studentEnrollment.findUniqueOrThrow({
    where: { id: input.enrollmentId },
    include: ENROLLMENT_INCLUDE,
  });
  const before = toEnrollmentDto(current);
  const updated = await prisma.studentEnrollment.update({
    where: { id: input.enrollmentId },
    data: { cancelledAt: new Date(), cancelledReason: input.reason, cancelledBy },
    include: ENROLLMENT_INCLUDE,
  });
  return { before, after: toEnrollmentDto(updated) };
}

function buildEnrollmentListWhere(filter: {
  search?: string;
  academicYearId?: string;
  filiereId?: string;
  levelId?: string;
  classId?: string;
  status?: EnrollmentListFilterInput["status"];
  paymentStatus?: EnrollmentListFilterInput["paymentStatus"];
  includeCancelled: boolean;
}): Prisma.StudentEnrollmentWhereInput {
  const where: Prisma.StudentEnrollmentWhereInput = {
    cancelledAt: filter.includeCancelled ? undefined : null,
    academicYearId: filter.academicYearId,
    filiereId: filter.filiereId,
    levelId: filter.levelId,
    classId: filter.classId,
    status: filter.status,
    paymentStatus: filter.paymentStatus,
  };

  if (filter.search) {
    const q = filter.search;
    where.OR = [
      { registrationNumber: { contains: q, mode: "insensitive" } },
      { student: { is: { matricule: { contains: q, mode: "insensitive" } } } },
      { student: { is: { lastName: { contains: q, mode: "insensitive" } } } },
      { student: { is: { firstName: { contains: q, mode: "insensitive" } } } },
    ];
  }

  return where;
}

const LIST_INCLUDE = {
  student: true,
  class: true,
  filiere: true,
  level: true,
  academicYear: true,
  regime: true,
} as const;

type EnrollmentListRowSource = Prisma.StudentEnrollmentGetPayload<{ include: typeof LIST_INCLUDE }>;

function toListRow(row: EnrollmentListRowSource): EnrollmentListRow {
  return {
    id: row.id,
    studentId: row.studentId,
    matricule: row.student.matricule,
    studentLastName: row.student.lastName,
    studentFirstName: row.student.firstName,
    academicYearId: row.academicYearId,
    academicYearLabel: row.academicYear.label,
    filiereName: row.filiere.name,
    levelLabel: row.level.label,
    className: row.class.name,
    regimeLabel: row.regime?.label ?? null,
    registrationNumber: row.registrationNumber,
    status: row.status,
    paymentStatus: row.paymentStatus,
    isCancelled: row.cancelledAt !== null,
    enrollmentDate: row.enrollmentDate,
  };
}

export async function listEnrollments(filter: EnrollmentListFilterInput): Promise<EnrollmentListPage> {
  const where = buildEnrollmentListWhere(filter);
  const orderBy: Prisma.StudentEnrollmentOrderByWithRelationInput[] =
    filter.sortBy === "studentLastName"
      ? [{ student: { lastName: filter.sortDirection } }]
      : filter.sortBy === "matricule"
        ? [{ student: { matricule: filter.sortDirection } }]
        : [{ enrollmentDate: filter.sortDirection }];

  const [rows, total] = await Promise.all([
    prisma.studentEnrollment.findMany({
      where,
      orderBy,
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
      include: LIST_INCLUDE,
    }),
    prisma.studentEnrollment.count({ where }),
  ]);

  return { rows: rows.map(toListRow), total };
}

export async function listEnrollmentsForExport(
  filter: Omit<EnrollmentListFilterInput, "page" | "pageSize">
): Promise<EnrollmentListRow[]> {
  const where = buildEnrollmentListWhere(filter);
  const rows = await prisma.studentEnrollment.findMany({
    where,
    orderBy: [{ enrollmentDate: "desc" }],
    take: EXPORT_ROW_CAP,
    include: LIST_INCLUDE,
  });
  return rows.map(toListRow);
}

/** Tableau de bord des inscriptions (MODULE-04.1 §5.8/§3.9). */
export async function getEnrollmentDashboard(input: EnrollmentDashboardInput): Promise<EnrollmentDashboard> {
  let academicYearId = input.academicYearId;
  if (!academicYearId) {
    const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
    academicYearId = activeYear?.id;
  }

  const where: Prisma.StudentEnrollmentWhereInput = { academicYearId, cancelledAt: null };

  const [newCount, reenrollCount, rows] = await Promise.all([
    prisma.studentEnrollment.count({ where: { ...where, status: { in: ["NOUVEAU", "TRANSFERT"] } } }),
    prisma.studentEnrollment.count({ where: { ...where, status: { in: ["ANCIEN", "REDOUBLANT", "REPRISE"] } } }),
    prisma.studentEnrollment.findMany({
      where,
      include: { class: true, filiere: true, level: true, student: { select: { gender: true } } },
    }),
  ]);

  const byClassMap = new Map<string, { classId: string; className: string; count: number }>();
  const byFiliereMap = new Map<string, { filiereId: string; filiereName: string; count: number }>();
  const byLevelMap = new Map<string, { levelId: string; levelLabel: string; count: number }>();
  const byGender = { M: 0, F: 0 };

  for (const row of rows) {
    const classEntry = byClassMap.get(row.classId) ?? { classId: row.classId, className: row.class.name, count: 0 };
    classEntry.count += 1;
    byClassMap.set(row.classId, classEntry);

    const filiereEntry = byFiliereMap.get(row.filiereId) ?? {
      filiereId: row.filiereId,
      filiereName: row.filiere.name,
      count: 0,
    };
    filiereEntry.count += 1;
    byFiliereMap.set(row.filiereId, filiereEntry);

    const levelEntry = byLevelMap.get(row.levelId) ?? { levelId: row.levelId, levelLabel: row.level.label, count: 0 };
    levelEntry.count += 1;
    byLevelMap.set(row.levelId, levelEntry);

    byGender[row.student.gender] += 1;
  }

  return {
    newEnrollmentsCount: newCount,
    reenrollmentsCount: reenrollCount,
    byClass: [...byClassMap.values()],
    byFiliere: [...byFiliereMap.values()],
    byLevel: [...byLevelMap.values()],
    byGender,
  };
}
