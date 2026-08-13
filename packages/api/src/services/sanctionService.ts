import { prisma, type Prisma } from "@isac-erp/db";
import type { AnnulerSanctionInput, CreateSanctionInput, SanctionDto } from "@isac-erp/shared";
import { notifySanction } from "./sanctionNotificationService.js";

const SANCTION_INCLUDE = {
  issuedByUser: true,
} satisfies Prisma.SanctionInclude;

type SanctionWithRelations = Prisma.SanctionGetPayload<{ include: typeof SANCTION_INCLUDE }>;

function toDto(row: SanctionWithRelations): SanctionDto {
  return {
    id: row.id,
    studentId: row.studentId,
    type: row.type,
    motif: row.motif,
    description: row.description,
    dureeJours: row.dureeJours,
    date: row.date,
    annule: row.annule,
    annuleReason: row.annuleReason,
    annuleLe: row.annuleLe,
    issuedByName: `${row.issuedByUser.firstName} ${row.issuedByUser.lastName}`,
    createdAt: row.createdAt,
  };
}

export async function listSanctionsByStudent(studentId: string): Promise<SanctionDto[]> {
  const rows = await prisma.sanction.findMany({
    where: { studentId },
    include: SANCTION_INCLUDE,
    orderBy: { date: "desc" },
  });
  return rows.map(toDto);
}

/**
 * Enregistre une sanction disciplinaire (2026-08-03, retour du porteur du projet) — notifie
 * automatiquement l'étudiant et son/ses tuteur(s) principal(aux) dès l'enregistrement, avant même la
 * génération de l'avis PDF (voir DocumentType.SANCTION, générée séparément à la demande).
 */
export async function createSanction(input: CreateSanctionInput, issuedBy: string): Promise<SanctionDto> {
  const row = await prisma.sanction.create({
    data: {
      studentId: input.studentId,
      type: input.type,
      motif: input.motif,
      description: input.description ?? null,
      dureeJours: input.dureeJours ?? null,
      date: input.date,
      issuedBy,
    },
    include: SANCTION_INCLUDE,
  });

  void notifySanction(row.studentId, row.type, row.motif, row.date);

  return toDto(row);
}

/** Annule une sanction déjà enregistrée — jamais de suppression physique (même principe que les bulletins/cartes). */
export async function annulerSanction(input: AnnulerSanctionInput, annuleBy: string): Promise<SanctionDto> {
  const row = await prisma.sanction.update({
    where: { id: input.id },
    data: { annule: true, annuleReason: input.reason, annuleBy, annuleLe: new Date() },
    include: SANCTION_INCLUDE,
  });
  return toDto(row);
}
