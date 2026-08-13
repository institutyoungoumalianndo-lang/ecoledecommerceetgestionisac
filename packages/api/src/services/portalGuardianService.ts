import { prisma } from "@isac-erp/db";
import type {
  BulletinAnnuelDto,
  BulletinPeriodeDto,
  PortalGuardianChild,
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
 * Portail web — phase 3, lecture seule tuteur/parent (MODULE-15 §1 décision 2/§4 phase 3). Chaque
 * fonction part du `credentialId` de la session portail et vérifie que l'enfant demandé appartient
 * bien au tuteur (`StudentGuardian`) avant de renvoyer quoi que ce soit — jamais une confiance aveugle
 * en un `studentId` fourni par le client.
 */
export async function resolvePortalGuardianId(credentialId: string): Promise<string> {
  const credential = await prisma.portalCredential.findUniqueOrThrow({ where: { id: credentialId } });
  if (!credential.guardianId) {
    throw new Error("Ce compte n'est pas un compte tuteur/parent.");
  }
  return credential.guardianId;
}

async function resolveCurrentClassName(studentId: string): Promise<string | null> {
  const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
  if (!activeYear) return null;
  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { studentId_academicYearId: { studentId, academicYearId: activeYear.id } },
    include: { class: true },
  });
  return enrollment?.class.name ?? null;
}

/** Vérifie que l'enfant appartient au tuteur de la session — lève sinon. Retourne le `guardianId`. */
async function assertChildOfGuardian(credentialId: string, studentId: string): Promise<string> {
  const guardianId = await resolvePortalGuardianId(credentialId);
  const link = await prisma.studentGuardian.findUnique({
    where: { studentId_guardianId: { studentId, guardianId } },
  });
  if (!link) {
    throw new Error("Cet étudiant n'est pas rattaché à ce compte tuteur/parent.");
  }
  return guardianId;
}

export async function listPortalGuardianChildren(credentialId: string): Promise<PortalGuardianChild[]> {
  const guardianId = await resolvePortalGuardianId(credentialId);
  const links = await prisma.studentGuardian.findMany({
    where: { guardianId },
    include: { student: true },
    orderBy: { student: { lastName: "asc" } },
  });
  return Promise.all(
    links.map(async (link) => ({
      id: link.student.id,
      matricule: link.student.matricule,
      firstName: link.student.firstName,
      lastName: link.student.lastName,
      photoPath: link.student.photoPath,
      className: await resolveCurrentClassName(link.student.id),
      relationship: link.relationship,
    }))
  );
}

export async function getPortalGuardianChildSchedule(
  credentialId: string,
  studentId: string,
  range: PortalScheduleInput
): Promise<SeanceDto[]> {
  await assertChildOfGuardian(credentialId, studentId);
  const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
  if (!activeYear) return [];
  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { studentId_academicYearId: { studentId, academicYearId: activeYear.id } },
  });
  if (!enrollment) return [];
  return listSeances({ classId: enrollment.classId, startDate: range.startDate, endDate: range.endDate });
}

export async function getPortalGuardianChildNotes(credentialId: string, studentId: string): Promise<PortalStudentNote[]> {
  await assertChildOfGuardian(credentialId, studentId);
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

export async function getPortalGuardianChildBulletins(
  credentialId: string,
  studentId: string
): Promise<{ periode: BulletinPeriodeDto[]; annuel: BulletinAnnuelDto[] }> {
  await assertChildOfGuardian(credentialId, studentId);
  const [periode, annuel] = await Promise.all([
    listBulletinsPeriodeStudent(studentId),
    listBulletinsAnnuelsStudent(studentId),
  ]);
  return {
    periode: periode.filter((b) => !b.annule),
    annuel: annuel.filter((b) => !b.annule),
  };
}

export async function getPortalGuardianChildFeeSummary(
  credentialId: string,
  studentId: string
): Promise<PortalStudentFeeSummary> {
  await assertChildOfGuardian(credentialId, studentId);
  const summary = await getStudentFeeSummary({ studentId });
  return { ...summary, paymentStatus: computePaymentStatus(summary.totalNet, summary.totalPaid) };
}
