import { prisma } from "@isac-erp/db";
import type {
  BulletinAnnuelDto,
  BulletinPeriodeDto,
  PortalScheduleInput,
  PortalStudentFeeSummary,
  PortalStudentNote,
  SeanceDto,
} from "@isac-erp/shared";
import { listBulletinsAnnuelsStudent } from "./bulletinAnnuelService.js";
import { listBulletinsPeriodeStudent } from "./bulletinPeriodeService.js";
import { computePaymentStatus, getStudentFeeSummary } from "./feeSummaryService.js";
import { listSeances } from "./seanceService.js";

/**
 * Portail web — phase 2, lecture seule étudiant (MODULE-15 §1 décision 2/§4 phase 2). Chaque fonction
 * part du `credentialId` de la session portail (jamais un `studentId` fourni par le client) et résout
 * l'étudiant réel côté serveur — portée à un seul enregistrement, jamais une permission RBAC.
 */
export async function resolvePortalStudentId(credentialId: string): Promise<string> {
  const credential = await prisma.portalCredential.findUniqueOrThrow({ where: { id: credentialId } });
  if (!credential.studentId) {
    throw new Error("Ce compte n'est pas un compte étudiant.");
  }
  return credential.studentId;
}

async function resolveCurrentClassId(studentId: string): Promise<string | null> {
  const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
  if (!activeYear) return null;
  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { studentId_academicYearId: { studentId, academicYearId: activeYear.id } },
  });
  return enrollment?.classId ?? null;
}

export async function getPortalStudentSchedule(
  credentialId: string,
  range: PortalScheduleInput
): Promise<SeanceDto[]> {
  const studentId = await resolvePortalStudentId(credentialId);
  const classId = await resolveCurrentClassId(studentId);
  if (!classId) return [];
  return listSeances({ classId, startDate: range.startDate, endDate: range.endDate });
}

export async function getPortalStudentNotes(credentialId: string): Promise<PortalStudentNote[]> {
  const studentId = await resolvePortalStudentId(credentialId);
  const rows = await prisma.note.findMany({
    where: { studentId },
    include: { subjectOffering: { include: { subject: true, period: true } } },
    orderBy: { saisieLe: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    subjectName: row.subjectOffering.subject.name,
    coefficient: Number(row.subjectOffering.coefficient),
    academicPeriodLabel: row.subjectOffering.period.label,
    noteOrale: row.noteOrale !== null ? Number(row.noteOrale) : null,
    noteEcrite: row.noteEcrite !== null ? Number(row.noteEcrite) : null,
    noteComposition: row.noteComposition !== null ? Number(row.noteComposition) : null,
    noteFinale: row.noteFinale !== null ? Number(row.noteFinale) : null,
    saisieLe: row.saisieLe,
  }));
}

export async function getPortalStudentBulletins(
  credentialId: string
): Promise<{ periode: BulletinPeriodeDto[]; annuel: BulletinAnnuelDto[] }> {
  const studentId = await resolvePortalStudentId(credentialId);
  const [periode, annuel] = await Promise.all([
    listBulletinsPeriodeStudent(studentId),
    listBulletinsAnnuelsStudent(studentId),
  ]);
  return {
    periode: periode.filter((b) => !b.annule),
    annuel: annuel.filter((b) => !b.annule),
  };
}

export async function getPortalStudentFeeSummary(credentialId: string): Promise<PortalStudentFeeSummary> {
  const studentId = await resolvePortalStudentId(credentialId);
  const summary = await getStudentFeeSummary({ studentId });
  return { ...summary, paymentStatus: computePaymentStatus(summary.totalNet, summary.totalPaid) };
}
