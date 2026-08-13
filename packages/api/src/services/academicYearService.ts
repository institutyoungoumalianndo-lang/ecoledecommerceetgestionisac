import { prisma } from "@isac-erp/db";
import type {
  AcademicYearDto,
  CreateAcademicYearInput,
  UpdateAcademicYearInput,
} from "@isac-erp/shared";

export async function listAcademicYears(): Promise<AcademicYearDto[]> {
  return prisma.academicYear.findMany({ orderBy: { startDate: "desc" } });
}

/**
 * 2026-08-09, retour du porteur du projet : après clôture de la seule année en cours ("bloque toute
 * saisie", volontaire — voir closeAcademicYear), plus aucune année n'est active nulle part dans
 * l'application tant qu'on ne clique pas explicitement sur "Activer" sur la nouvelle. Pour éviter ce
 * blocage silencieux, une année nouvellement créée est activée automatiquement s'il n'en existe
 * actuellement aucune d'active — jamais si une autre est déjà active (l'utilisateur choisit alors
 * explicitement via "Activer", une seule année active à la fois, MODULE-02 §3.1).
 */
export async function createAcademicYear(input: CreateAcademicYearInput): Promise<AcademicYearDto> {
  const hasActiveYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
  const year = await prisma.academicYear.create({ data: input });
  return hasActiveYear ? year : activateAcademicYear(year.id);
}

export async function updateAcademicYear(input: UpdateAcademicYearInput): Promise<AcademicYearDto> {
  const { id, ...fields } = input;
  return prisma.academicYear.update({ where: { id }, data: fields });
}

/**
 * Une seule année active à la fois (MODULE-02 §3.1) : désactive toutes les
 * autres dans la même transaction avant d'activer la cible.
 */
export async function activateAcademicYear(id: string): Promise<AcademicYearDto> {
  return prisma.$transaction(async (tx) => {
    await tx.academicYear.updateMany({ where: { isActive: true }, data: { isActive: false } });
    return tx.academicYear.update({ where: { id }, data: { isActive: true } });
  });
}

export async function closeAcademicYear(id: string): Promise<AcademicYearDto> {
  return prisma.academicYear.update({
    where: { id },
    data: { isClosed: true, closedAt: new Date(), isActive: false },
  });
}

export async function reopenAcademicYear(id: string, reopenedBy: string): Promise<AcademicYearDto> {
  return prisma.academicYear.update({
    where: { id },
    data: { isClosed: false, reopenedAt: new Date(), reopenedBy },
  });
}
