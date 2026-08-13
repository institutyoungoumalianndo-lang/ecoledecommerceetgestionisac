import { randomUUID } from "node:crypto";
import { prisma, type Prisma } from "@isac-erp/db";
import type { BulletinAnnuelDto, GenererBulletinAnnuelInput } from "@isac-erp/shared";
import { generateBulletinAnnuelNumber } from "./matriculeService.js";
import { getEvaluationSettings } from "./evaluationSettingsService.js";
import { calculerMoyenneAnnuelle, calculerMoyenneAnnuelleEtudiant, obtenirDecision, obtenirMention } from "./noteService.js";
import { obtenirClassement } from "./classementService.js";
import { notifyBulletinDisponible } from "./bulletinNotificationService.js";
import { countUnjustifiedAbsences } from "./studentAbsenceService.js";

const BULLETIN_INCLUDE = {
  student: true,
  academicYear: true,
  genereParUser: true,
} satisfies Prisma.BulletinAnnuelInclude;

type BulletinAnnuelWithRelations = Prisma.BulletinAnnuelGetPayload<{ include: typeof BULLETIN_INCLUDE }>;

async function buildMatieres(studentId: string, academicYearId: string) {
  const [periods, notes] = await Promise.all([
    prisma.academicPeriod.findMany({ where: { academicYearId }, orderBy: { orderIndex: "asc" } }),
    prisma.note.findMany({
      where: { studentId, subjectOffering: { academicYearId } },
      include: { subjectOffering: { include: { subject: true } } },
    }),
  ]);

  const bySubject = new Map<
    string,
    { subjectName: string; coefficient: number; parPeriode: Map<string, number | null> }
  >();
  for (const note of notes) {
    const subjectId = note.subjectOffering.subjectId;
    const entry = bySubject.get(subjectId) ?? {
      subjectName: note.subjectOffering.subject.name,
      coefficient: Number(note.subjectOffering.coefficient),
      parPeriode: new Map<string, number | null>(),
    };
    entry.parPeriode.set(note.subjectOffering.periodId, note.noteFinale ? Number(note.noteFinale) : null);
    bySubject.set(subjectId, entry);
  }

  return [...bySubject.values()]
    .map((entry) => {
      const moyennesParPeriode = periods.map((p) => ({ periodLabel: p.label, moyenne: entry.parPeriode.get(p.id) ?? null }));
      return {
        subjectName: entry.subjectName,
        coefficient: entry.coefficient,
        moyennesParPeriode,
        moyenneAnnuelle: calculerMoyenneAnnuelle(moyennesParPeriode.map((m) => m.moyenne)),
      };
    })
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
}

async function toDto(row: BulletinAnnuelWithRelations): Promise<BulletinAnnuelDto> {
  const [enrollment, matieres] = await Promise.all([
    prisma.studentEnrollment.findUnique({
      where: { studentId_academicYearId: { studentId: row.studentId, academicYearId: row.academicYearId } },
      include: { class: { include: { filiere: true, level: true } } },
    }),
    buildMatieres(row.studentId, row.academicYearId),
  ]);

  return {
    id: row.id,
    studentId: row.studentId,
    studentMatricule: row.student.matricule,
    studentName: `${row.student.lastName} ${row.student.firstName}`,
    studentPhotoPath: row.student.photoPath,
    classLabel: enrollment?.class.name ?? "—",
    filiereLabel: enrollment?.class.filiere.name ?? null,
    levelLabel: enrollment?.class.level.label ?? "—",
    academicYearId: row.academicYearId,
    academicYearLabel: row.academicYear.label,
    numeroDossier: row.numeroDossier,
    moyenneAnnuelle: row.moyenneAnnuelle ? Number(row.moyenneAnnuelle) : null,
    mention: row.mention,
    regularite: row.regularite,
    decision: row.decision,
    rang: row.rang,
    effectif: row.effectif,
    verificationCode: row.verificationCode,
    annule: row.annule,
    genereLe: row.genereLe,
    genereParName: row.genereParUser ? `${row.genereParUser.firstName} ${row.genereParUser.lastName}` : null,
    matieres,
  };
}

/**
 * Génère le bulletin annuel (MODULE-06 §1.8) : agrège les moyennes de toutes les périodes de
 * l'année, rang calculé sur la filière/niveau (toutes classes confondues, §1.9). Alimente au
 * passage `student_enrollments.annual_average`/`mention`/`decision` — champs prévus depuis le
 * Module 4.1 en attendant précisément ce module (voir §7).
 */
export async function genererBulletinAnnuel(
  input: GenererBulletinAnnuelInput,
  generePar: string
): Promise<BulletinAnnuelDto> {
  const existing = await prisma.bulletinAnnuel.findFirst({
    where: { studentId: input.studentId, academicYearId: input.academicYearId, annule: false },
  });
  if (existing) {
    throw new Error(
      "Un bulletin annuel existe déjà pour cette année — annulez-le d'abord si vous devez en générer un nouveau."
    );
  }

  const student = await prisma.student.findUniqueOrThrow({ where: { id: input.studentId } });
  const moyenneAnnuelle = await calculerMoyenneAnnuelleEtudiant(input.studentId, input.academicYearId);
  if (moyenneAnnuelle === null) {
    throw new Error(
      `Aucune note saisie pour ${student.lastName} ${student.firstName} sur l'année — impossible de générer le bulletin annuel.`
    );
  }

  const enrollment = await prisma.studentEnrollment.findUniqueOrThrow({
    where: { studentId_academicYearId: { studentId: input.studentId, academicYearId: input.academicYearId } },
  });

  const [settings, classement, academicYear] = await Promise.all([
    getEvaluationSettings(),
    obtenirClassement({
      filiereId: enrollment.filiereId,
      levelId: enrollment.levelId,
      academicYearId: input.academicYearId,
      academicPeriodId: null,
    }),
    prisma.academicYear.findUniqueOrThrow({ where: { id: input.academicYearId } }),
  ]);

  const rang = classement.find((c) => c.studentId === input.studentId)?.rang ?? null;
  const effectif = classement.length;
  const mention = obtenirMention(moyenneAnnuelle, settings);
  const decision = obtenirDecision(moyenneAnnuelle, settings.seuilAdmission);
  const verificationCode = randomUUID().slice(0, 8).toUpperCase();

  // Régularité (2026-08-03, retour du porteur du projet) : "Irrégulier" au-delà du seuil d'absences
  // non justifiées configuré, cumulées sur l'année — voir EvaluationSettings.seuilAbsencesIrregulier.
  const absencesNonJustifiees = await countUnjustifiedAbsences(input.studentId, academicYear.startDate, academicYear.endDate);
  const regularite = absencesNonJustifiees > settings.seuilAbsencesIrregulier ? "Irrégulier" : "Régulier";

  const row = await prisma.$transaction(async (tx) => {
    const numeroDossier = await generateBulletinAnnuelNumber(tx);
    const created = await tx.bulletinAnnuel.create({
      data: {
        studentId: input.studentId,
        academicYearId: input.academicYearId,
        numeroDossier,
        moyenneAnnuelle,
        mention,
        regularite,
        decision,
        rang,
        effectif,
        verificationCode,
        generePar,
      },
      include: BULLETIN_INCLUDE,
    });
    await tx.studentEnrollment.update({
      where: { id: enrollment.id },
      data: { annualAverage: moyenneAnnuelle, mention, decision },
    });
    return created;
  });

  const dto = await toDto(row);
  // Module 12 — Centre de Communication : notification automatique (voir MODULE-12 §1.10).
  void notifyBulletinDisponible(dto.studentId, dto.classLabel, dto.filiereLabel);
  return dto;
}

export async function listBulletinsAnnuelsStudent(studentId: string): Promise<BulletinAnnuelDto[]> {
  const rows = await prisma.bulletinAnnuel.findMany({
    where: { studentId },
    include: BULLETIN_INCLUDE,
    orderBy: { genereLe: "desc" },
  });
  return Promise.all(rows.map(toDto));
}

export async function getBulletinAnnuelById(id: string): Promise<BulletinAnnuelDto> {
  const row = await prisma.bulletinAnnuel.findUniqueOrThrow({ where: { id }, include: BULLETIN_INCLUDE });
  return toDto(row);
}

/** Annule un bulletin annuel déjà généré (MODULE-06 §3 règle 7) — jamais de suppression physique. */
export async function annulerBulletinAnnuel(id: string, annulePar: string): Promise<BulletinAnnuelDto> {
  const row = await prisma.bulletinAnnuel.update({
    where: { id },
    data: { annule: true, annulePar, annuleLe: new Date() },
    include: BULLETIN_INCLUDE,
  });
  return toDto(row);
}
