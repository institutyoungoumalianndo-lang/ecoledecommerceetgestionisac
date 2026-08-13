import { prisma, type Prisma } from "@isac-erp/db";
import type {
  ArchiveTeacherInput,
  CreateTeacherInput,
  TeacherDto,
  TeacherListFilterInput,
  TeacherListPage,
  TeacherListRow,
  UpdateTeacherInput,
} from "@isac-erp/shared";
import { generateTeacherNumber } from "./matriculeService.js";

const EXPORT_ROW_CAP = 5000;

type TeacherWithRefs = Prisma.TeacherGetPayload<{ include: { status: true; contractType: true } }>;

function toDto(row: TeacherWithRefs, payrollEmployeeId: string | null = null): TeacherDto {
  return {
    id: row.id,
    matricule: row.matricule,
    lastName: row.lastName,
    firstName: row.firstName,
    gender: row.gender,
    birthDate: row.birthDate,
    birthPlace: row.birthPlace,
    nationality: row.nationality,
    idNumber: row.idNumber,
    photoPath: row.photoPath,
    address: row.address,
    city: row.city,
    phonePrimary: row.phonePrimary,
    phoneSecondary: row.phoneSecondary,
    whatsapp: row.whatsapp,
    email: row.email,
    highestDegree: row.highestDegree,
    academicGrade: row.academicGrade,
    specialty: row.specialty,
    function: row.function,
    hireDate: row.hireDate,
    contractTypeId: row.contractTypeId,
    contractTypeLabel: row.contractType?.label ?? null,
    statusId: row.statusId,
    statusLabel: row.status?.label ?? null,
    weeklyHoursCapacity: row.weeklyHoursCapacity ? Number(row.weeklyHoursCapacity) : null,
    archivedAt: row.archivedAt,
    archivedReason: row.archivedReason,
    archivedBy: row.archivedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    payrollEmployeeId,
  };
}

function buildListWhere(filter: {
  search?: string;
  statusId?: string;
  specialty?: string;
  subjectId?: string;
  filiereId?: string;
  levelId?: string;
  includeArchived?: boolean;
}): Prisma.TeacherWhereInput {
  const where: Prisma.TeacherWhereInput = {
    archivedAt: filter.includeArchived ? undefined : null,
    statusId: filter.statusId,
    specialty: filter.specialty ? { equals: filter.specialty, mode: "insensitive" } : undefined,
  };

  if (filter.search) {
    const q = filter.search;
    where.OR = [
      { matricule: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
      { phonePrimary: { contains: q, mode: "insensitive" } },
      { phoneSecondary: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { specialty: { contains: q, mode: "insensitive" } },
    ];
  }

  if (filter.subjectId || filter.filiereId || filter.levelId) {
    where.assignments = {
      some: {
        isActive: true,
        subjectOffering: {
          subjectId: filter.subjectId,
          filiereId: filter.filiereId,
          levelId: filter.levelId,
        },
      },
    };
  }

  return where;
}

function toListRow(row: TeacherWithRefs): TeacherListRow {
  return {
    id: row.id,
    matricule: row.matricule,
    lastName: row.lastName,
    firstName: row.firstName,
    gender: row.gender,
    phonePrimary: row.phonePrimary,
    email: row.email,
    specialty: row.specialty,
    statusLabel: row.status?.label ?? null,
    isArchived: row.archivedAt !== null,
  };
}

export async function listTeachers(filter: TeacherListFilterInput): Promise<TeacherListPage> {
  const where = buildListWhere(filter);
  const orderBy: Prisma.TeacherOrderByWithRelationInput[] = [
    { [filter.sortBy]: filter.sortDirection },
    { lastName: "asc" },
    { firstName: "asc" },
  ];

  const [rows, total] = await Promise.all([
    prisma.teacher.findMany({
      where,
      orderBy,
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
      include: { status: true, contractType: true },
    }),
    prisma.teacher.count({ where }),
  ]);

  return { rows: rows.map(toListRow), total };
}

/** Liste non paginée pour export (CSV/Excel) — plafonnée pour rester raisonnable en mémoire. */
export async function listTeachersForExport(
  filter: Omit<TeacherListFilterInput, "page" | "pageSize">
): Promise<TeacherListRow[]> {
  const where = buildListWhere(filter);
  const rows = await prisma.teacher.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: EXPORT_ROW_CAP,
    include: { status: true, contractType: true },
  });
  return rows.map(toListRow);
}

export async function getTeacherById(id: string): Promise<TeacherDto> {
  const [row, employee] = await Promise.all([
    prisma.teacher.findUniqueOrThrow({ where: { id }, include: { status: true, contractType: true } }),
    prisma.employee.findFirst({ where: { teacherId: id }, select: { id: true } }),
  ]);
  return toDto(row, employee?.id ?? null);
}

export async function createTeacher(input: CreateTeacherInput): Promise<TeacherDto> {
  return prisma.$transaction(async (tx) => {
    const matricule = await generateTeacherNumber(tx);
    const row = await tx.teacher.create({
      data: {
        matricule,
        lastName: input.lastName,
        firstName: input.firstName,
        gender: input.gender,
        birthDate: input.birthDate ?? null,
        birthPlace: input.birthPlace ?? null,
        nationality: input.nationality ?? null,
        idNumber: input.idNumber ?? null,
        photoPath: input.photoPath ?? null,
        address: input.address ?? null,
        city: input.city ?? null,
        phonePrimary: input.phonePrimary ?? null,
        phoneSecondary: input.phoneSecondary ?? null,
        whatsapp: input.whatsapp ?? null,
        email: input.email || null,
        highestDegree: input.highestDegree ?? null,
        academicGrade: input.academicGrade ?? null,
        specialty: input.specialty ?? null,
        function: input.function ?? null,
        hireDate: input.hireDate ?? null,
        contractTypeId: input.contractTypeId ?? null,
        statusId: input.statusId ?? null,
        weeklyHoursCapacity: input.weeklyHoursCapacity ?? null,
      },
      include: { status: true, contractType: true },
    });
    return toDto(row);
  });
}

export async function updateTeacher(input: UpdateTeacherInput): Promise<TeacherDto> {
  const { id, email, ...fields } = input;
  const data: Prisma.TeacherUpdateInput = { ...fields };
  if (email !== undefined) {
    data.email = email || null;
  }
  const row = await prisma.teacher.update({
    where: { id },
    data,
    include: { status: true, contractType: true },
  });
  return toDto(row);
}

export async function archiveTeacher(input: ArchiveTeacherInput, archivedBy: string): Promise<TeacherDto> {
  const row = await prisma.teacher.update({
    where: { id: input.id },
    data: { archivedAt: new Date(), archivedReason: input.reason, archivedBy },
    include: { status: true, contractType: true },
  });
  return toDto(row);
}

export async function restoreTeacher(id: string): Promise<TeacherDto> {
  const row = await prisma.teacher.update({
    where: { id },
    data: { archivedAt: null, archivedReason: null, archivedBy: null },
    include: { status: true, contractType: true },
  });
  return toDto(row);
}
