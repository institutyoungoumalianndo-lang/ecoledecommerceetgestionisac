import { prisma, type Prisma } from "@isac-erp/db";
import type {
  CreateSubjectOfferingInput,
  ListSubjectOfferingsInput,
  SubjectOfferingDto,
  UpdateSubjectOfferingInput,
} from "@isac-erp/shared";

const OFFERING_INCLUDE = {
  subject: true,
  academicYear: true,
  period: true,
  level: true,
  filiere: true,
  teachingUnit: true,
} satisfies Prisma.SubjectOfferingInclude;

type OfferingWithRelations = Prisma.SubjectOfferingGetPayload<{ include: typeof OFFERING_INCLUDE }>;

function toDto(row: OfferingWithRelations): SubjectOfferingDto {
  const totalHours = row.hoursCourse + row.hoursTd + row.hoursTp + row.hoursPersonalWork;
  return {
    id: row.id,
    subjectId: row.subjectId,
    subjectCode: row.subject.code,
    subjectName: row.subject.name,
    subjectCredits: row.subject.credits ? Number(row.subject.credits) : null,
    academicYearId: row.academicYearId,
    academicYearLabel: row.academicYear.label,
    periodId: row.periodId,
    periodLabel: row.period.label,
    levelId: row.levelId,
    levelLabel: row.level.label,
    filiereId: row.filiereId,
    filiereName: row.filiere?.name ?? null,
    teachingUnitId: row.teachingUnitId,
    teachingUnitName: row.teachingUnit?.name ?? null,
    coefficient: Number(row.coefficient),
    hoursCourse: row.hoursCourse,
    hoursTd: row.hoursTd,
    hoursTp: row.hoursTp,
    hoursPersonalWork: row.hoursPersonalWork,
    totalHours,
    isRequired: row.isRequired,
    isActive: row.isActive,
  };
}

export async function listSubjectOfferings(filter: ListSubjectOfferingsInput): Promise<SubjectOfferingDto[]> {
  const rows = await prisma.subjectOffering.findMany({
    where: {
      isActive: filter.includeInactive ? undefined : true,
      academicYearId: filter.academicYearId,
      periodId: filter.periodId,
      levelId: filter.levelId,
      filiereId: filter.filiereId,
      subjectId: filter.subjectId,
    },
    include: OFFERING_INCLUDE,
    orderBy: [{ period: { orderIndex: "asc" } }, { subject: { name: "asc" } }],
  });
  return rows.map(toDto);
}

export async function getSubjectOfferingById(id: string): Promise<SubjectOfferingDto> {
  const row = await prisma.subjectOffering.findUniqueOrThrow({ where: { id }, include: OFFERING_INCLUDE });
  return toDto(row);
}

/** Empêche deux affectations strictement identiques en portée — même principe que FeeTariff (MODULE-04.2 §1.3, NULL rend une contrainte unique DB peu fiable). */
async function assertNoDuplicateScope(input: CreateSubjectOfferingInput, excludeId?: string): Promise<void> {
  const existing = await prisma.subjectOffering.findFirst({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      subjectId: input.subjectId,
      academicYearId: input.academicYearId,
      periodId: input.periodId,
      levelId: input.levelId,
      filiereId: input.filiereId ?? null,
      isActive: true,
    },
    include: { subject: true, academicYear: true, period: true, level: true, filiere: true },
  });
  if (existing) {
    const filiereLabel = existing.filiere?.name ?? "toutes les filières";
    throw new Error(
      `Cette matière est déjà affectée à ce contexte exact : ${existing.subject.code} — ${existing.subject.name} · ` +
        `${existing.academicYear.label} · ${existing.period.label} · ${existing.level.label} · ${filiereLabel}. ` +
        `Vérifiez la liste des affectations (avec le filtre Semestre) : si l'affectation existante ne convient plus, désactivez-la d'abord avant d'en créer une nouvelle.`,
    );
  }
}

export async function createSubjectOffering(input: CreateSubjectOfferingInput): Promise<SubjectOfferingDto> {
  await assertNoDuplicateScope(input);
  const row = await prisma.subjectOffering.create({
    data: {
      subjectId: input.subjectId,
      academicYearId: input.academicYearId,
      periodId: input.periodId,
      levelId: input.levelId,
      filiereId: input.filiereId ?? null,
      teachingUnitId: input.teachingUnitId ?? null,
      coefficient: input.coefficient,
      hoursCourse: input.hoursCourse,
      hoursTd: input.hoursTd,
      hoursTp: input.hoursTp,
      hoursPersonalWork: input.hoursPersonalWork,
      isRequired: input.isRequired,
    },
    include: OFFERING_INCLUDE,
  });
  return toDto(row);
}

/** La portée (matière/année/semestre/niveau/filière) reste immuable après création — seuls coefficient/volumes/UE/obligatoire sont modifiables. */
export async function updateSubjectOffering(input: UpdateSubjectOfferingInput): Promise<SubjectOfferingDto> {
  const { id, ...fields } = input;
  const row = await prisma.subjectOffering.update({ where: { id }, data: fields, include: OFFERING_INCLUDE });
  return toDto(row);
}

export async function deactivateSubjectOffering(id: string): Promise<SubjectOfferingDto> {
  const row = await prisma.subjectOffering.update({ where: { id }, data: { isActive: false }, include: OFFERING_INCLUDE });
  return toDto(row);
}

export async function reactivateSubjectOffering(id: string): Promise<SubjectOfferingDto> {
  const row = await prisma.subjectOffering.update({ where: { id }, data: { isActive: true }, include: OFFERING_INCLUDE });
  return toDto(row);
}

/**
 * Résolution par spécificité (MODULE-02.1 §1.2/§3 règle 2) : entre une affectation
 * générique (filiere_id NULL) et une affectation spécifique à la filière pour la
 * même matière/contexte, la spécifique l'emporte — même principe que
 * `selectMostSpecificTariff` (MODULE-04.2), une seule dimension optionnelle ici
 * au lieu de quatre, donc réimplémenté directement plutôt que forcé dans
 * l'abstraction à 4 dimensions du Module 4.2.
 */
export function pickMostSpecificOffering<T extends { filiereId: string | null; updatedAt: Date }>(candidates: T[]): T | null {
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => {
    const specificityDiff = Number(b.filiereId !== null) - Number(a.filiereId !== null);
    if (specificityDiff !== 0) return specificityDiff;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
  return sorted[0]!;
}

/** Toutes les affectations résolues (une par matière) pour un contexte donné (MODULE-02.1 §1.5, utilisé par le diagnostic pédagogique). */
export async function resolveOfferingsForContext(context: {
  academicYearId: string;
  periodId: string;
  levelId: string;
  filiereId: string;
}): Promise<SubjectOfferingDto[]> {
  const candidates = await prisma.subjectOffering.findMany({
    where: {
      academicYearId: context.academicYearId,
      periodId: context.periodId,
      levelId: context.levelId,
      isActive: true,
      OR: [{ filiereId: null }, { filiereId: context.filiereId }],
    },
    include: OFFERING_INCLUDE,
  });

  const bySubject = new Map<string, OfferingWithRelations[]>();
  for (const c of candidates) {
    const list = bySubject.get(c.subjectId) ?? [];
    list.push(c);
    bySubject.set(c.subjectId, list);
  }

  const resolved: SubjectOfferingDto[] = [];
  for (const group of bySubject.values()) {
    const best = pickMostSpecificOffering(group);
    if (best) resolved.push(toDto(best));
  }
  return resolved;
}

export { toDto as toSubjectOfferingDto, OFFERING_INCLUDE };
