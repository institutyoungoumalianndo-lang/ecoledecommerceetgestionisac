import { prisma } from "@isac-erp/db";
import type { PortalScheduleInput, SeanceDto } from "@isac-erp/shared";
import { listSeances } from "./seanceService.js";

/**
 * Portail web — phase 3, lecture seule enseignant (MODULE-15 §1 décision 2/§4 phase 3). Réutilise
 * directement `listSeances` (déjà filtrable par `teacherId`) — aucune nouvelle requête d'emploi du
 * temps, seule la résolution de portée (`credentialId` → `teacherId`) est propre au portail.
 */
export async function resolvePortalTeacherId(credentialId: string): Promise<string> {
  const credential = await prisma.portalCredential.findUniqueOrThrow({ where: { id: credentialId } });
  if (!credential.teacherId) {
    throw new Error("Ce compte n'est pas un compte enseignant.");
  }
  return credential.teacherId;
}

export async function getPortalTeacherSchedule(credentialId: string, range: PortalScheduleInput): Promise<SeanceDto[]> {
  const teacherId = await resolvePortalTeacherId(credentialId);
  return listSeances({ teacherId, startDate: range.startDate, endDate: range.endDate });
}
