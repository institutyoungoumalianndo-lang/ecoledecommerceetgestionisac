import { prisma, type Prisma } from "@isac-erp/db";
import type {
  CreateFeeReductionInput,
  FeeReductionDto,
  ListFeeReductionsInput,
  UpdateFeeReductionInput,
} from "@isac-erp/shared";

const REDUCTION_INCLUDE = {
  student: true,
  feeType: true,
  academicYear: true,
} satisfies Prisma.FeeReductionInclude;

type ReductionWithRelations = Prisma.FeeReductionGetPayload<{ include: typeof REDUCTION_INCLUDE }>;

function toReductionDto(row: ReductionWithRelations): FeeReductionDto {
  const now = new Date();
  return {
    id: row.id,
    studentId: row.studentId,
    studentMatricule: row.student.matricule,
    studentName: `${row.student.lastName} ${row.student.firstName}`,
    feeTypeId: row.feeTypeId,
    feeTypeName: row.feeType?.name ?? null,
    academicYearId: row.academicYearId,
    academicYearLabel: row.academicYear.label,
    type: row.type,
    valueMode: row.valueMode,
    value: Number(row.value),
    reason: row.reason,
    grantedByAuthority: row.grantedByAuthority,
    recordedBy: row.recordedBy,
    validFrom: row.validFrom,
    validTo: row.validTo,
    isExpired: Boolean(row.validTo && row.validTo < now),
  };
}

export async function listFeeReductions(filter: ListFeeReductionsInput): Promise<FeeReductionDto[]> {
  const rows = await prisma.feeReduction.findMany({
    where: { studentId: filter.studentId, academicYearId: filter.academicYearId, type: filter.type },
    orderBy: { createdAt: "desc" },
    include: REDUCTION_INCLUDE,
  });
  return rows.map(toReductionDto);
}

export async function createFeeReduction(
  input: CreateFeeReductionInput,
  recordedBy: string
): Promise<FeeReductionDto> {
  const row = await prisma.feeReduction.create({
    data: { ...input, feeTypeId: input.feeTypeId ?? null, recordedBy },
    include: REDUCTION_INCLUDE,
  });
  return toReductionDto(row);
}

export async function updateFeeReduction(input: UpdateFeeReductionInput): Promise<FeeReductionDto> {
  const { id, ...fields } = input;
  const row = await prisma.feeReduction.update({ where: { id }, data: fields, include: REDUCTION_INCLUDE });
  return toReductionDto(row);
}

/** Jamais de suppression physique — mettre fin à une réduction revient à fixer sa date de fin de validité à aujourd'hui. */
export async function endFeeReduction(id: string): Promise<FeeReductionDto> {
  const row = await prisma.feeReduction.update({
    where: { id },
    data: { validTo: new Date() },
    include: REDUCTION_INCLUDE,
  });
  return toReductionDto(row);
}

export { toReductionDto, REDUCTION_INCLUDE };
