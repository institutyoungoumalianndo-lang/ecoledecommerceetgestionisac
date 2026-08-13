import { prisma, type Prisma } from "@isac-erp/db";
import type {
  ArchiveStudentInput,
  CheckStudentDuplicatesInput,
  CreateStudentInput,
  StudentDto,
  StudentDuplicateMatch,
  StudentInaExportRow,
  StudentListFilterInput,
  StudentListPage,
  StudentListRow,
  UpdateStudentInput,
} from "@isac-erp/shared";
import { generateMatricule } from "./matriculeService.js";
import { createEnrollmentRow } from "./studentEnrollmentService.js";

const EXPORT_ROW_CAP = 5000;

function buildListWhere(filter: {
  search?: string;
  filiereId?: string;
  levelId?: string;
  classId?: string;
  academicYearId?: string;
  needsReenrollmentForYearId?: string;
  includeArchived: boolean;
}): Prisma.StudentWhereInput {
  const where: Prisma.StudentWhereInput = {
    archivedAt: filter.includeArchived ? undefined : null,
  };

  if (filter.search) {
    const q = filter.search;
    where.OR = [
      { matricule: { contains: q, mode: "insensitive" } },
      { ina: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
      { phonePrimary: { contains: q, mode: "insensitive" } },
      { phoneSecondary: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const and: Prisma.StudentWhereInput[] = [];
  if (filter.filiereId || filter.levelId || filter.classId || filter.academicYearId) {
    and.push({
      enrollments: {
        some: {
          filiereId: filter.filiereId,
          levelId: filter.levelId,
          classId: filter.classId,
          academicYearId: filter.academicYearId,
        },
      },
    });
  }
  // Réinscription (2026-08-09) : exclut les étudiants qui ont déjà une inscription non annulée pour
  // l'année visée, pour cibler la recherche du bouton "Réinscription" sur ceux qui en ont besoin.
  if (filter.needsReenrollmentForYearId) {
    and.push({
      enrollments: { none: { academicYearId: filter.needsReenrollmentForYearId, cancelledAt: null } },
    });
  }
  if (and.length > 0) where.AND = and;

  return where;
}

type StudentWithCurrentEnrollment = Prisma.StudentGetPayload<{
  include: {
    enrollments: {
      include: { class: true; filiere: true; level: true; academicYear: true };
    };
  };
}>;

function toListRow(row: StudentWithCurrentEnrollment, activeYearId: string | null): StudentListRow {
  const current = row.enrollments[0];
  return {
    id: row.id,
    matricule: row.matricule,
    ina: row.ina,
    lastName: row.lastName,
    firstName: row.firstName,
    gender: row.gender,
    phonePrimary: row.phonePrimary,
    email: row.email,
    isArchived: row.archivedAt !== null,
    currentClassId: current?.classId ?? null,
    currentClassName: current?.class.name ?? null,
    currentFiliereName: current?.filiere.name ?? null,
    currentLevelLabel: current?.level.label ?? null,
    currentAcademicYearLabel: current?.academicYear.label ?? null,
    isReenrolledActiveYear: Boolean(
      activeYearId && current?.academicYearId === activeYearId && current.cancelledAt === null
    ),
  };
}

export async function listStudents(filter: StudentListFilterInput): Promise<StudentListPage> {
  const where = buildListWhere(filter);
  const orderBy: Prisma.StudentOrderByWithRelationInput[] = [
    { [filter.sortBy]: filter.sortDirection },
    { lastName: "asc" },
    { firstName: "asc" },
  ];

  const [rows, total, activeYear] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy,
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
      include: {
        enrollments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { class: true, filiere: true, level: true, academicYear: true },
        },
      },
    }),
    prisma.student.count({ where }),
    prisma.academicYear.findFirst({ where: { isActive: true }, select: { id: true } }),
  ]);

  return { rows: rows.map((r) => toListRow(r, activeYear?.id ?? null)), total };
}

/** Liste non paginée pour export (CSV/Excel) — plafonnée pour rester raisonnable en mémoire. */
export async function listStudentsForExport(
  filter: Omit<StudentListFilterInput, "page" | "pageSize">
): Promise<StudentListRow[]> {
  const where = buildListWhere(filter);
  const [rows, activeYear] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: EXPORT_ROW_CAP,
      include: {
        enrollments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { class: true, filiere: true, level: true, academicYear: true },
        },
      },
    }),
    prisma.academicYear.findFirst({ where: { isActive: true }, select: { id: true } }),
  ]);
  return rows.map((r) => toListRow(r, activeYear?.id ?? null));
}

/**
 * Canevas national INA (2026-08-03, retour du porteur du projet) — export dédié, colonnes fixées
 * par un gabarit externe. Père/mère résolus via `GuardianRelationship.PERE`/`MERE` (premier trouvé
 * si plusieurs, cas rare) ; filière = inscription la plus récente, comme `toListRow`.
 */
export async function listStudentsForInaExport(
  filter: Omit<StudentListFilterInput, "page" | "pageSize">
): Promise<StudentInaExportRow[]> {
  const where = buildListWhere(filter);
  const rows = await prisma.student.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: EXPORT_ROW_CAP,
    include: {
      enrollments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { filiere: true },
      },
      guardians: { include: { guardian: true } },
    },
  });

  return rows.map((row) => {
    const pere = row.guardians.find((g) => g.relationship === "PERE")?.guardian;
    const mere = row.guardians.find((g) => g.relationship === "MERE")?.guardian;
    const current = row.enrollments[0];
    return {
      ina: row.ina,
      lastName: row.lastName,
      firstName: row.firstName,
      gender: row.gender,
      birthDate: row.birthDate,
      birthPlace: row.birthPlace,
      fatherName: pere ? `${pere.lastName} ${pere.firstName}` : null,
      motherName: mere ? `${mere.lastName} ${mere.firstName}` : null,
      programme: row.programme,
      filiereName: current?.filiere.name ?? null,
    };
  });
}

export async function getStudentById(id: string): Promise<StudentDto> {
  return prisma.student.findUniqueOrThrow({ where: { id } });
}

export async function createStudent(input: CreateStudentInput): Promise<StudentDto> {
  return prisma.$transaction(async (tx) => {
    const targetClass = await tx.class.findUniqueOrThrow({ where: { id: input.classId } });

    const matricule = await generateMatricule(tx, {
      filiereId: targetClass.filiereId,
      academicYearId: targetClass.academicYearId,
    });

    const student = await tx.student.create({
      data: {
        matricule,
        ina: input.ina || null,
        programme: input.programme || null,
        lastName: input.lastName,
        firstName: input.firstName,
        gender: input.gender,
        birthDate: input.birthDate ?? null,
        birthPlace: input.birthPlace ?? null,
        nationality: input.nationality ?? null,
        photoPath: input.photoPath ?? null,
        address: input.address ?? null,
        neighborhood: input.neighborhood ?? null,
        commune: input.commune ?? null,
        city: input.city ?? null,
        prefecture: input.prefecture ?? null,
        country: input.country ?? null,
        phonePrimary: input.phonePrimary ?? null,
        phoneSecondary: input.phoneSecondary ?? null,
        email: input.email || null,
        maritalStatus: input.maritalStatus,
      },
    });

    await createEnrollmentRow(tx, {
      studentId: student.id,
      classId: targetClass.id,
      regimeId: input.regimeId,
      status: "NOUVEAU",
      enrollmentDate: input.enrollmentDate,
    });

    return student;
  });
}

export async function updateStudent(input: UpdateStudentInput): Promise<StudentDto> {
  const { id, email, ina, programme, ...fields } = input;
  const data: Prisma.StudentUpdateInput = { ...fields };
  if (email !== undefined) {
    data.email = email || null;
  }
  if (ina !== undefined) {
    data.ina = ina || null;
  }
  if (programme !== undefined) {
    data.programme = programme || null;
  }
  return prisma.student.update({ where: { id }, data });
}

export async function archiveStudent(input: ArchiveStudentInput, archivedBy: string): Promise<StudentDto> {
  return prisma.student.update({
    where: { id: input.id },
    data: { archivedAt: new Date(), archivedReason: input.reason, archivedBy },
  });
}

export async function restoreStudent(id: string): Promise<StudentDto> {
  return prisma.student.update({
    where: { id },
    data: { archivedAt: null, archivedReason: null, archivedBy: null },
  });
}

export async function checkStudentDuplicates(
  input: CheckStudentDuplicatesInput
): Promise<StudentDuplicateMatch[]> {
  const conditions: Prisma.StudentWhereInput[] = [];

  if (input.phonePrimary) {
    conditions.push({
      OR: [{ phonePrimary: input.phonePrimary }, { phoneSecondary: input.phonePrimary }],
    });
  }
  if (input.email) {
    conditions.push({ email: { equals: input.email, mode: "insensitive" } });
  }
  if (input.birthDate) {
    conditions.push({
      lastName: { equals: input.lastName, mode: "insensitive" },
      firstName: { equals: input.firstName, mode: "insensitive" },
      birthDate: input.birthDate,
    });
  }
  if (conditions.length === 0) return [];

  const matches = await prisma.student.findMany({
    where: {
      archivedAt: null,
      id: input.excludeStudentId ? { not: input.excludeStudentId } : undefined,
      OR: conditions,
    },
    take: 10,
  });

  return matches.map((m) => {
    const matchedOn: StudentDuplicateMatch["matchedOn"] = [];
    if (input.phonePrimary && (m.phonePrimary === input.phonePrimary || m.phoneSecondary === input.phonePrimary)) {
      matchedOn.push("TELEPHONE");
    }
    if (input.email && m.email?.toLowerCase() === input.email.toLowerCase()) {
      matchedOn.push("EMAIL");
    }
    if (
      input.birthDate &&
      m.lastName.toLowerCase() === input.lastName.toLowerCase() &&
      m.firstName.toLowerCase() === input.firstName.toLowerCase() &&
      m.birthDate?.getTime() === input.birthDate.getTime()
    ) {
      matchedOn.push("NOM_DATE_NAISSANCE");
    }
    return { id: m.id, matricule: m.matricule, lastName: m.lastName, firstName: m.firstName, matchedOn };
  });
}
