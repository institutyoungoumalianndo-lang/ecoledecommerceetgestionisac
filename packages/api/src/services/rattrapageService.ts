import { prisma, type Prisma } from "@isac-erp/db";
import type {
  EchecMatiereDto,
  GetEchecsRattrapageInput,
  RattrapageSessionDto,
  UpsertRattrapageSessionInput,
} from "@isac-erp/shared";
import { calculerMoyenneAnnuelle } from "./noteService.js";

/** Seuil de passage par matière (retour du porteur du projet, 2026-08-03) : 10/20 fixe, non configurable. */
const SEUIL_PASSAGE_MATIERE = 10;

const SESSION_INCLUDE = { room: true } satisfies Prisma.RattrapageSessionInclude;
type SessionWithRoom = Prisma.RattrapageSessionGetPayload<{ include: typeof SESSION_INCLUDE }>;

function toSessionDto(row: SessionWithRoom): RattrapageSessionDto {
  return {
    id: row.id,
    date: row.sessionDate,
    startTime: row.startTime,
    endTime: row.endTime,
    roomId: row.roomId,
    roomLabel: row.room?.label ?? null,
  };
}

/**
 * Sessionnaires (2026-08-03, retour du porteur du projet) : pour une filière/niveau/année, calcule
 * — à la demande, jamais stocké, même principe que le classement par mérite — les matières où au
 * moins un étudiant n'a pas obtenu la moyenne annuelle (10/20 fixe), avec la liste de ces étudiants
 * et la session de rattrapage déjà planifiée pour cette matière, le cas échéant.
 */
export async function getEchecsRattrapage(input: GetEchecsRattrapageInput): Promise<EchecMatiereDto[]> {
  const classes = await prisma.class.findMany({
    where: { filiereId: input.filiereId, levelId: input.levelId, academicYearId: input.academicYearId },
  });
  const classIds = classes.map((c) => c.id);
  if (classIds.length === 0) return [];

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { classId: { in: classIds }, cancelledAt: null },
    include: { student: true },
  });
  if (enrollments.length === 0) return [];
  const studentIds = enrollments.map((e) => e.studentId);
  const studentById = new Map(enrollments.map((e) => [e.studentId, e.student]));

  const notes = await prisma.note.findMany({
    where: {
      studentId: { in: studentIds },
      subjectOffering: {
        academicYearId: input.academicYearId,
        levelId: input.levelId,
        OR: [{ filiereId: input.filiereId }, { filiereId: null }],
      },
    },
    include: { subjectOffering: { include: { subject: true } } },
  });

  interface Accum {
    subjectId: string;
    subjectName: string;
    parEtudiant: Map<string, Array<number | null>>;
  }
  const bySubject = new Map<string, Accum>();
  for (const note of notes) {
    const subjectId = note.subjectOffering.subjectId;
    const entry = bySubject.get(subjectId) ?? {
      subjectId,
      subjectName: note.subjectOffering.subject.name,
      parEtudiant: new Map(),
    };
    const valeurs = entry.parEtudiant.get(note.studentId) ?? [];
    valeurs.push(note.noteFinale ? Number(note.noteFinale) : null);
    entry.parEtudiant.set(note.studentId, valeurs);
    bySubject.set(subjectId, entry);
  }

  const sessions = await prisma.rattrapageSession.findMany({
    where: { filiereId: input.filiereId, levelId: input.levelId, academicYearId: input.academicYearId },
    include: SESSION_INCLUDE,
  });
  const sessionBySubjectId = new Map(sessions.map((s) => [s.subjectId, s]));

  const resultat: EchecMatiereDto[] = [];
  for (const { subjectId, subjectName, parEtudiant } of bySubject.values()) {
    const etudiantsEnEchec = [];
    for (const [studentId, valeurs] of parEtudiant) {
      const moyenne = calculerMoyenneAnnuelle(valeurs);
      if (moyenne === null || moyenne >= SEUIL_PASSAGE_MATIERE) continue;
      const student = studentById.get(studentId);
      if (!student) continue;
      etudiantsEnEchec.push({
        studentId,
        matricule: student.matricule,
        studentName: `${student.lastName} ${student.firstName}`,
        moyenne,
      });
    }
    if (etudiantsEnEchec.length === 0) continue;
    etudiantsEnEchec.sort((a, b) => a.studentName.localeCompare(b.studentName));

    const session = sessionBySubjectId.get(subjectId);
    resultat.push({
      subjectId,
      subjectName,
      etudiants: etudiantsEnEchec,
      session: session ? toSessionDto(session) : null,
    });
  }

  resultat.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  return resultat;
}

/** Programme (ou reprogramme) la session de rattrapage d'une matière pour une filière/niveau/année. */
export async function upsertRattrapageSession(
  input: UpsertRattrapageSessionInput,
  createdBy: string
): Promise<RattrapageSessionDto> {
  const row = await prisma.rattrapageSession.upsert({
    where: {
      filiereId_levelId_academicYearId_subjectId: {
        filiereId: input.filiereId,
        levelId: input.levelId,
        academicYearId: input.academicYearId,
        subjectId: input.subjectId,
      },
    },
    create: {
      filiereId: input.filiereId,
      levelId: input.levelId,
      academicYearId: input.academicYearId,
      subjectId: input.subjectId,
      sessionDate: input.date,
      startTime: input.startTime,
      endTime: input.endTime ?? null,
      roomId: input.roomId ?? null,
      createdBy,
    },
    update: {
      sessionDate: input.date,
      startTime: input.startTime,
      endTime: input.endTime ?? null,
      roomId: input.roomId ?? null,
    },
    include: SESSION_INCLUDE,
  });
  return toSessionDto(row);
}

export async function deleteRattrapageSession(id: string): Promise<void> {
  await prisma.rattrapageSession.delete({ where: { id } });
}
