import { prisma, type Prisma } from "@isac-erp/db";
import type {
  ArchiveEmployeeInput,
  CreateEmployeeInput,
  EmployeeDto,
  EmployeeListFilterInput,
  EmployeeListPage,
  EmployeeListRow,
  ListTeachersPayrollStatusInput,
  TeacherPayrollStatusDto,
  UpdateEmployeeInput,
} from "@isac-erp/shared";
import { generateEmployeeNumber } from "./matriculeService.js";

const EXPORT_ROW_CAP = 5000;

const EMPLOYEE_INCLUDE = {
  category: true,
  contractType: true,
  teacher: true,
} satisfies Prisma.EmployeeInclude;

type EmployeeWithRelations = Prisma.EmployeeGetPayload<{ include: typeof EMPLOYEE_INCLUDE }>;

/** Identité résolue : lue depuis `teachers` quand teacherId est renseigné, jamais dupliquée (MODULE-08 §1.1). */
function toDto(row: EmployeeWithRelations): EmployeeDto {
  const isLinkedToTeacher = row.teacherId !== null && row.teacher !== null;
  const source = isLinkedToTeacher ? row.teacher! : row;
  return {
    id: row.id,
    matricule: row.matricule,
    categoryId: row.categoryId,
    categoryLabel: row.category.label,
    department: row.department,
    contractTypeId: row.contractTypeId,
    contractTypeLabel: row.contractType?.label ?? null,
    teacherId: row.teacherId,
    isLinkedToTeacher,
    lastName: source.lastName,
    firstName: source.firstName,
    gender: source.gender,
    phonePrimary: source.phonePrimary,
    phoneSecondary: source.phoneSecondary,
    email: source.email,
    address: isLinkedToTeacher ? row.teacher!.address : row.address,
    photoPath: isLinkedToTeacher ? row.teacher!.photoPath : row.photoPath,
    birthDate: isLinkedToTeacher ? row.teacher!.birthDate : row.birthDate,
    birthPlace: isLinkedToTeacher ? row.teacher!.birthPlace : row.birthPlace,
    nationality: isLinkedToTeacher ? row.teacher!.nationality : row.nationality,
    idNumber: isLinkedToTeacher ? row.teacher!.idNumber : row.idNumber,
    hireDate: isLinkedToTeacher ? row.teacher!.hireDate : row.hireDate,
    salaryMode: row.salaryMode,
    fixedMonthlySalary: row.fixedMonthlySalary ? Number(row.fixedMonthlySalary) : null,
    hourlyRate: row.hourlyRate ? Number(row.hourlyRate) : null,
    teachingHoursPaid: row.teachingHoursPaid,
    archivedAt: row.archivedAt,
    archivedReason: row.archivedReason,
    archivedBy: row.archivedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toListRow(row: EmployeeWithRelations): EmployeeListRow {
  const isLinkedToTeacher = row.teacherId !== null && row.teacher !== null;
  const source = isLinkedToTeacher ? row.teacher! : row;
  return {
    id: row.id,
    matricule: row.matricule,
    lastName: source.lastName,
    firstName: source.firstName,
    categoryLabel: row.category.label,
    isLinkedToTeacher,
    salaryMode: row.salaryMode,
    isArchived: row.archivedAt !== null,
  };
}

function buildListWhere(filter: {
  search?: string;
  categoryId?: string;
  includeArchived: boolean;
}): Prisma.EmployeeWhereInput {
  const where: Prisma.EmployeeWhereInput = {
    archivedAt: filter.includeArchived ? undefined : null,
    categoryId: filter.categoryId,
  };

  if (filter.search) {
    const q = filter.search;
    where.OR = [
      { matricule: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
      { teacher: { matricule: { contains: q, mode: "insensitive" } } },
      { teacher: { lastName: { contains: q, mode: "insensitive" } } },
      { teacher: { firstName: { contains: q, mode: "insensitive" } } },
    ];
  }

  return where;
}

export async function listEmployees(filter: EmployeeListFilterInput): Promise<EmployeeListPage> {
  const where = buildListWhere(filter);
  const [rows, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      orderBy: [{ [filter.sortBy]: filter.sortDirection }],
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
      include: EMPLOYEE_INCLUDE,
    }),
    prisma.employee.count({ where }),
  ]);
  return { rows: rows.map(toListRow), total };
}

/** Liste non paginée pour export (CSV/Excel) — plafonnée pour rester raisonnable en mémoire. */
export async function listEmployeesForExport(
  filter: Omit<EmployeeListFilterInput, "page" | "pageSize">
): Promise<EmployeeListRow[]> {
  const where = buildListWhere(filter);
  const rows = await prisma.employee.findMany({
    where,
    take: EXPORT_ROW_CAP,
    include: EMPLOYEE_INCLUDE,
  });
  return rows.map(toListRow);
}

export async function getEmployeeById(id: string): Promise<EmployeeDto> {
  const row = await prisma.employee.findUniqueOrThrow({ where: { id }, include: EMPLOYEE_INCLUDE });
  return toDto(row);
}

async function assertTeacherNotAlreadyLinked(teacherId: string, excludeEmployeeId?: string): Promise<void> {
  const existing = await prisma.employee.findFirst({
    where: { teacherId, id: excludeEmployeeId ? { not: excludeEmployeeId } : undefined },
  });
  if (existing) {
    throw new Error("Cet enseignant est déjà lié à un autre employé.");
  }
}

export async function createEmployee(input: CreateEmployeeInput): Promise<EmployeeDto> {
  if (input.teacherId) {
    await assertTeacherNotAlreadyLinked(input.teacherId);
  }
  return prisma.$transaction(async (tx) => {
    const matricule = await generateEmployeeNumber(tx);
    const row = await tx.employee.create({
      data: {
        matricule,
        categoryId: input.categoryId,
        department: input.department ?? null,
        contractTypeId: input.contractTypeId ?? null,
        teacherId: input.teacherId ?? null,
        lastName: input.teacherId ? null : input.lastName ?? null,
        firstName: input.teacherId ? null : input.firstName ?? null,
        gender: input.teacherId ? null : input.gender ?? null,
        phonePrimary: input.phonePrimary ?? null,
        phoneSecondary: input.phoneSecondary ?? null,
        email: input.email || null,
        address: input.address ?? null,
        photoPath: input.photoPath ?? null,
        birthDate: input.birthDate ?? null,
        birthPlace: input.birthPlace ?? null,
        nationality: input.nationality ?? null,
        idNumber: input.idNumber ?? null,
        hireDate: input.hireDate ?? null,
        salaryMode: input.salaryMode,
        fixedMonthlySalary: input.fixedMonthlySalary ?? null,
        hourlyRate: input.hourlyRate ?? null,
        teachingHoursPaid: input.teachingHoursPaid,
      },
      include: EMPLOYEE_INCLUDE,
    });
    return toDto(row);
  });
}

export async function updateEmployee(input: UpdateEmployeeInput): Promise<EmployeeDto> {
  const { id, email, ...fields } = input;
  if (fields.teacherId) {
    await assertTeacherNotAlreadyLinked(fields.teacherId, id);
  }
  const data: Prisma.EmployeeUpdateInput = { ...fields };
  if (email !== undefined) {
    data.email = email || null;
  }
  const row = await prisma.employee.update({ where: { id }, data, include: EMPLOYEE_INCLUDE });
  return toDto(row);
}

export async function archiveEmployee(input: ArchiveEmployeeInput, archivedBy: string): Promise<EmployeeDto> {
  const row = await prisma.employee.update({
    where: { id: input.id },
    data: { archivedAt: new Date(), archivedReason: input.reason, archivedBy },
    include: EMPLOYEE_INCLUDE,
  });
  return toDto(row);
}

export async function restoreEmployee(id: string): Promise<EmployeeDto> {
  const row = await prisma.employee.update({
    where: { id },
    data: { archivedAt: null, archivedReason: null, archivedBy: null },
    include: EMPLOYEE_INCLUDE,
  });
  return toDto(row);
}

/**
 * Pont Enseignant → Paie (extension du 2026-07-30, retour du porteur du projet) : un enseignant
 * n'apparaît dans la paie qu'une fois un Employee lié créé pour lui — jusqu'ici aucun écran ne
 * permettait de repérer ceux à qui cette étape manquait (ils étaient simplement invisibles dans
 * "Calculer tous les bulletins"). Part de TeacherAssignment (le référentiel réel "qui enseigne
 * quoi"), pas de Employee, pour ne rater aucun enseignant affecté.
 */
export async function listTeachersPayrollStatus(input: ListTeachersPayrollStatusInput): Promise<TeacherPayrollStatusDto[]> {
  const academicYear = input.academicYearId
    ? await prisma.academicYear.findUniqueOrThrow({ where: { id: input.academicYearId } })
    : await prisma.academicYear.findFirstOrThrow({ where: { isActive: true } });

  const assignments = await prisma.teacherAssignment.findMany({
    where: { isActive: true, subjectOffering: { academicYearId: academicYear.id }, teacher: { archivedAt: null } },
    include: { teacher: true },
  });

  const byTeacher = new Map<string, { teacher: (typeof assignments)[number]["teacher"]; subjectCount: number }>();
  for (const a of assignments) {
    const entry = byTeacher.get(a.teacherId) ?? { teacher: a.teacher, subjectCount: 0 };
    entry.subjectCount += 1;
    byTeacher.set(a.teacherId, entry);
  }

  const teacherIds = [...byTeacher.keys()];
  const employees = teacherIds.length
    ? await prisma.employee.findMany({ where: { teacherId: { in: teacherIds }, archivedAt: null } })
    : [];
  const employeeByTeacherId = new Map(employees.map((e) => [e.teacherId!, e]));

  return [...byTeacher.entries()]
    .map(([teacherId, { teacher, subjectCount }]) => {
      const employee = employeeByTeacherId.get(teacherId) ?? null;
      return {
        teacherId,
        matricule: teacher.matricule,
        lastName: teacher.lastName,
        firstName: teacher.firstName,
        subjectCount,
        employeeId: employee?.id ?? null,
        hasPayrollProfile: employee !== null,
      };
    })
    .sort((a, b) => a.lastName.localeCompare(b.lastName));
}

export { EMPLOYEE_INCLUDE, toDto as toEmployeeDto };
