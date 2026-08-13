import { randomUUID } from "node:crypto";
import { prisma, type Prisma } from "@isac-erp/db";
import type { BulletinPeriodeDto, GenererBulletinPeriodeInput } from "@isac-erp/shared";
import { generateBulletinPeriodeNumber } from "./matriculeService.js";
import { getEvaluationSettings } from "./evaluationSettingsService.js";
import {
  calculerMoyennePeriode,
  calculerMoyennePeriodeEtudiant,
  obtenirDecision,
  obtenirMention,
  verrouillerNotesPeriode,
} from "./noteService.js";
import { attribuerRangs } from "./classementService.js";
import { notifyBulletinDisponible } from "./bulletinNotificationService.js";
import { countUnjustifiedAbsences } from "./studentAbsenceService.js";

const BULLETIN_INCLUDE = {
  student: true,
  academicPeriod: { include: { academicYear: true } },
  genereParUser: true,
} satisfies Prisma.BulletinPeriodeInclude;

type BulletinPeriodeWithRelations = Prisma.BulletinPeriodeGetPayload<{ include: typeof BULLETIN_INCLUDE }>;

async function toDto(row: BulletinPeriodeWithRelations): Promise<BulletinPeriodeDto> {
  const [enrollment, notes] = await Promise.all([
    prisma.studentEnrollment.findUnique({
      where: { studentId_academicYearId: { studentId: row.studentId, academicYearId: row.academicPeriod.academicYearId } },
      include: { class: { include: { filiere: true, level: true } } },
    }),
    prisma.note.findMany({
      where: { studentId: row.studentId, subjectOffering: { periodId: row.academicPeriodId } },
      include: { subjectOffering: { include: { subject: true } } },
    }),
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
    academicPeriodId: row.academicPeriodId,
    academicPeriodLabel: row.academicPeriod.label,
    academicYearLabel: row.academicPeriod.academicYear.label,
    numeroDossier: row.numeroDossier,
    moyenne: row.moyenne ? Number(row.moyenne) : null,
    mention: row.mention,
    regularite: row.regularite,
    decision: row.decision,
    rang: row.rang,
    effectifClasse: row.effectifClasse,
    verificationCode: row.verificationCode,
    annule: row.annule,
    genereLe: row.genereLe,
    genereParName: row.genereParUser ? `${row.genereParUser.firstName} ${row.genereParUser.lastName}` : null,
    matieres: notes.map((n) => ({
      subjectOfferingId: n.subjectOfferingId,
      subjectName: n.subjectOffering.subject.name,
      coefficient: Number(n.subjectOffering.coefficient),
      noteOrale: n.noteOrale ? Number(n.noteOrale) : null,
      noteEcrite: n.noteEcrite ? Number(n.noteEcrite) : null,
      noteComposition: n.noteComposition ? Number(n.noteComposition) : null,
      noteFinale: n.noteFinale ? Number(n.noteFinale) : null,
    })),
  };
}

/** Rang de l'étudiant au sein de sa seule classe pour cette période (MODULE-06, reprend le système existant). */
async function calculerRangClasse(
  classId: string,
  academicPeriodId: string,
  studentId: string
): Promise<{ rang: number | null; effectif: number }> {
  const enrollments = await prisma.studentEnrollment.findMany({ where: { classId, cancelledAt: null } });

  const lignes: Array<{ studentId: string; moyenne: number }> = [];
  for (const enrollment of enrollments) {
    const moyenne = await calculerMoyennePeriodeEtudiant(enrollment.studentId, academicPeriodId);
    if (moyenne !== null) lignes.push({ studentId: enrollment.studentId, moyenne });
  }
  lignes.sort((a, b) => b.moyenne - a.moyenne);
  const classement = attribuerRangs(lignes);
  const rang = classement.find((l) => l.studentId === studentId)?.rang ?? null;
  return { rang, effectif: enrollments.length };
}

/**
 * Génère un bulletin de période (MODULE-06 §1.7) : écran HTML/CSS imprimable, aucun fichier PDF
 * stocké — l'enregistrement lui-même est l'archive (comme le bulletin de paie/reçu). Immuable une
 * fois créé (§3 règle 7) : un bulletin déjà généré (non annulé) bloque toute nouvelle génération.
 */
export async function genererBulletinPeriode(
  input: GenererBulletinPeriodeInput,
  generePar: string
): Promise<BulletinPeriodeDto> {
  const existing = await prisma.bulletinPeriode.findFirst({
    where: { studentId: input.studentId, academicPeriodId: input.academicPeriodId, annule: false },
  });
  if (existing) {
    throw new Error(
      "Un bulletin existe déjà pour cette période — annulez-le d'abord si vous devez en générer un nouveau."
    );
  }

  const [student, period, notes, settings] = await Promise.all([
    prisma.student.findUniqueOrThrow({ where: { id: input.studentId } }),
    prisma.academicPeriod.findUniqueOrThrow({ where: { id: input.academicPeriodId } }),
    prisma.note.findMany({
      where: { studentId: input.studentId, subjectOffering: { periodId: input.academicPeriodId } },
      include: { subjectOffering: true },
    }),
    getEvaluationSettings(),
  ]);

  const moyenne = calculerMoyennePeriode(
    notes.map((n) => ({ noteFinale: n.noteFinale ? Number(n.noteFinale) : null, coefficient: Number(n.subjectOffering.coefficient) }))
  );
  if (notes.length === 0 || moyenne === null) {
    throw new Error(
      `Aucune note saisie pour ${student.lastName} ${student.firstName} sur cette période — impossible de générer le bulletin.`
    );
  }

  const enrollment = await prisma.studentEnrollment.findUniqueOrThrow({
    where: { studentId_academicYearId: { studentId: input.studentId, academicYearId: period.academicYearId } },
  });

  const { rang, effectif } = await calculerRangClasse(enrollment.classId, input.academicPeriodId, input.studentId);
  const mention = obtenirMention(moyenne, settings);
  const decision = obtenirDecision(moyenne, settings.seuilAdmission);
  const verificationCode = randomUUID().slice(0, 8).toUpperCase();

  // Régularité (2026-08-03, retour du porteur du projet) : "Irrégulier" au-delà du seuil d'absences
  // non justifiées configuré sur la période — voir EvaluationSettings.seuilAbsencesIrregulier.
  const absencesNonJustifiees = await countUnjustifiedAbsences(input.studentId, period.startDate, period.endDate);
  const regularite = absencesNonJustifiees > settings.seuilAbsencesIrregulier ? "Irrégulier" : "Régulier";

  const row = await prisma.$transaction(async (tx) => {
    const numeroDossier = await generateBulletinPeriodeNumber(tx);
    const created = await tx.bulletinPeriode.create({
      data: {
        studentId: input.studentId,
        academicPeriodId: input.academicPeriodId,
        numeroDossier,
        moyenne,
        mention,
        regularite,
        decision,
        rang,
        effectifClasse: effectif,
        verificationCode,
        generePar,
      },
      include: BULLETIN_INCLUDE,
    });
    return created;
  });

  await verrouillerNotesPeriode(input.studentId, input.academicPeriodId);

  const dto = await toDto(row);
  // Module 12 — Centre de Communication : notification automatique (voir MODULE-12 §1.10).
  void notifyBulletinDisponible(dto.studentId, dto.classLabel, dto.filiereLabel);
  return dto;
}

export async function listBulletinsPeriodeStudent(studentId: string): Promise<BulletinPeriodeDto[]> {
  const rows = await prisma.bulletinPeriode.findMany({
    where: { studentId },
    include: BULLETIN_INCLUDE,
    orderBy: { genereLe: "desc" },
  });
  return Promise.all(rows.map(toDto));
}

export async function getBulletinPeriodeById(id: string): Promise<BulletinPeriodeDto> {
  const row = await prisma.bulletinPeriode.findUniqueOrThrow({ where: { id }, include: BULLETIN_INCLUDE });
  return toDto(row);
}

/** Annule un bulletin déjà généré (MODULE-06 §3 règle 7) — jamais de suppression physique. */
export async function annulerBulletinPeriode(id: string, annulePar: string): Promise<BulletinPeriodeDto> {
  const row = await prisma.bulletinPeriode.update({
    where: { id },
    data: { annule: true, annulePar, annuleLe: new Date() },
    include: BULLETIN_INCLUDE,
  });
  return toDto(row);
}
