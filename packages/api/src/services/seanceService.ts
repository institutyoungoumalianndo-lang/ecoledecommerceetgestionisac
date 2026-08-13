import { prisma, type Prisma } from "@isac-erp/db";
import type {
  CheckSeanceConflictsInput,
  CheckSeanceConflictsResult,
  CreateSeanceInput,
  GetMonthlyTimesheetInput,
  ListSeancesInput,
  PayrollControlSummaryDto,
  QualifySeanceInput,
  QualifySeancesBulkInput,
  QualifySeancesBulkResult,
  SaveMonthlyPointageInput,
  SeanceConflictDto,
  SeanceDto,
  TeacherMonthlyTimesheetDto,
  UpdateSeanceInput,
} from "@isac-erp/shared";
import { notifySeanceChanged } from "./seanceNotificationService.js";

// --- Fonctions pures — testables sans base de données. ---

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Durée en heures d'une séance à partir de ses heures de début/fin "HH:mm" (voir MODULE-05.1 §1.3). */
export function sessionDurationHours(startTime: string, endTime: string): number {
  return Math.max(0, (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60);
}

/** Deux créneaux "HH:mm" se chevauchent-ils (bornes exclusives : back-to-back n'est pas un conflit) ? */
export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(aEnd) > timeToMinutes(bStart);
}

export function monthRange(year: number, month: number): { start: Date; end: Date } {
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 0, 23, 59, 59) };
}

function normalizeDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Statuts qui occupent réellement le créneau (voir MODULE-05.2 §1.4) : une séance annulée, reportée
 * ou remplacée libère le créneau pour la détection de conflits — seule PROGRAMMEE/EFFECTUEE bloque. */
const OCCUPYING_STATUSES = ["PROGRAMMEE", "EFFECTUEE"] as const;

// --- DTOs. ---

const SEANCE_INCLUDE = {
  teacher: true,
  subjectOffering: { include: { subject: true, level: true, filiere: true } },
  room: true,
  substituteTeacher: true,
  validatedByUser: true,
  classes: { include: { class: true }, orderBy: { class: { name: "asc" as const } } },
} satisfies Prisma.SeanceInclude;

type SeanceWithRelations = Prisma.SeanceGetPayload<{ include: typeof SEANCE_INCLUDE }>;

function toSeanceDto(row: SeanceWithRelations): SeanceDto {
  const offering = row.subjectOffering;
  return {
    id: row.id,
    timesheetId: row.timesheetId,
    teacherId: row.teacherId,
    teacherName: `${row.teacher.lastName} ${row.teacher.firstName}`.trim(),
    subjectOfferingId: row.subjectOfferingId,
    subjectName: offering.subject.name,
    roomId: row.roomId,
    roomLabel: row.room?.label ?? null,
    recurrenceTemplateId: row.recurrenceTemplateId,
    sessionDate: row.sessionDate,
    startTime: row.startTime,
    endTime: row.endTime,
    status: row.status,
    reason: row.reason,
    rescheduledToSeanceId: row.rescheduledToSeanceId,
    substituteTeacherId: row.substituteTeacherId,
    substituteTeacherName: row.substituteTeacher
      ? `${row.substituteTeacher.lastName} ${row.substituteTeacher.firstName}`.trim()
      : null,
    validatedAt: row.validatedAt,
    validatedByName: row.validatedByUser
      ? `${row.validatedByUser.firstName} ${row.validatedByUser.lastName}`.trim()
      : null,
    classIds: row.classes.map((c) => c.classId),
    classNames: row.classes.map((c) => c.class.name),
    filiereName: offering.filiere?.name ?? null,
    levelLabel: offering.level.label,
    durationHours: sessionDurationHours(row.startTime, row.endTime),
  };
}

export async function getSeanceById(id: string): Promise<SeanceDto> {
  const row = await prisma.seance.findUniqueOrThrow({ where: { id }, include: SEANCE_INCLUDE });
  return toSeanceDto(row);
}

/** Vue filtrée — classe/enseignant/salle/filière/niveau/semestre, jamais une table séparée par vue (voir MODULE-05.2 §1.2). */
export async function listSeances(input: ListSeancesInput): Promise<SeanceDto[]> {
  const rows = await prisma.seance.findMany({
    where: {
      teacherId: input.teacherId,
      roomId: input.roomId,
      subjectOffering: {
        filiereId: input.filiereId,
        levelId: input.levelId,
        periodId: input.periodId,
      },
      classes: input.classId ? { some: { classId: input.classId } } : undefined,
      sessionDate:
        input.startDate || input.endDate
          ? { gte: input.startDate, lte: input.endDate }
          : undefined,
    },
    include: SEANCE_INCLUDE,
    orderBy: [{ sessionDate: "asc" }, { startTime: "asc" }],
  });
  return rows.map(toSeanceDto);
}

// --- Détection de conflits (voir MODULE-05.2 §1.4) — contrôle bloquant avant création/modification. ---

export async function checkSeanceConflicts(input: CheckSeanceConflictsInput): Promise<CheckSeanceConflictsResult> {
  const date = normalizeDate(input.sessionDate);
  const candidates = await prisma.seance.findMany({
    where: {
      sessionDate: date,
      status: { in: [...OCCUPYING_STATUSES] },
      id: input.excludeSeanceId ? { not: input.excludeSeanceId } : undefined,
      OR: [
        { teacherId: input.teacherId },
        ...(input.roomId ? [{ roomId: input.roomId }] : []),
        { classes: { some: { classId: { in: input.classIds } } } },
      ],
    },
    include: { classes: true },
  });

  const conflicts: SeanceConflictDto[] = [];
  for (const c of candidates) {
    if (!timesOverlap(input.startTime, input.endTime, c.startTime, c.endTime)) continue;

    if (c.teacherId === input.teacherId) {
      conflicts.push({
        type: "TEACHER",
        seanceId: c.id,
        label: "L'enseignant est déjà occupé sur ce créneau.",
        sessionDate: c.sessionDate,
        startTime: c.startTime,
        endTime: c.endTime,
      });
    }
    if (input.roomId && c.roomId === input.roomId) {
      conflicts.push({
        type: "ROOM",
        seanceId: c.id,
        label: "La salle est déjà occupée sur ce créneau.",
        sessionDate: c.sessionDate,
        startTime: c.startTime,
        endTime: c.endTime,
      });
    }
    const overlappingClassIds = c.classes.map((cl) => cl.classId).filter((id) => input.classIds.includes(id));
    if (overlappingClassIds.length > 0) {
      conflicts.push({
        type: "CLASS",
        seanceId: c.id,
        label: "Une des classes a déjà une séance sur ce créneau.",
        sessionDate: c.sessionDate,
        startTime: c.startTime,
        endTime: c.endTime,
      });
    }
  }

  return { conflicts };
}

// --- Fiche mensuelle de pointage (voir MODULE-05.1 §1.3, conservée par le Module 5.2 §1.8). ---

const TIMESHEET_INCLUDE = {
  teacher: true,
  closedByUser: true,
  sessions: { include: SEANCE_INCLUDE, orderBy: { sessionDate: "asc" as const } },
} satisfies Prisma.TeacherMonthlyTimesheetInclude;

type TimesheetWithRelations = Prisma.TeacherMonthlyTimesheetGetPayload<{ include: typeof TIMESHEET_INCLUDE }>;

function toTimesheetDto(row: TimesheetWithRelations): TeacherMonthlyTimesheetDto {
  const sessions = row.sessions.map(toSeanceDto);
  const sessionsDone = sessions.filter((s) => s.status === "EFFECTUEE").length;
  const sessionsPostponed = sessions.filter((s) => s.status === "REPORTEE").length;
  const sessionsNotDone = sessions.filter((s) => s.status === "ANNULEE" || s.status === "REPORTEE").length;
  const hoursDone = sessions.filter((s) => s.status === "EFFECTUEE").reduce((sum, s) => sum + s.durationHours, 0);
  const hoursPlanned = sessions.reduce((sum, s) => sum + s.durationHours, 0);
  return {
    id: row.id,
    teacherId: row.teacherId,
    teacherName: `${row.teacher.lastName} ${row.teacher.firstName}`.trim(),
    teacherMatricule: row.teacher.matricule,
    year: row.year,
    month: row.month,
    status: row.status,
    closedAt: row.closedAt,
    closedByName: row.closedByUser ? `${row.closedByUser.firstName} ${row.closedByUser.lastName}`.trim() : null,
    sessionsPlanned: sessions.length,
    sessionsDone,
    sessionsPostponed,
    sessionsNotDone,
    hoursPlanned,
    hoursDone,
    sessions,
  };
}

async function getTimesheetDtoById(id: string): Promise<TeacherMonthlyTimesheetDto> {
  const row = await prisma.teacherMonthlyTimesheet.findUniqueOrThrow({ where: { id }, include: TIMESHEET_INCLUDE });
  return toTimesheetDto(row);
}

/** Ouvre (ou récupère) la fiche mensuelle d'un enseignant — ne génère plus de séances : elles
 * existent déjà, planifiées une à une ou via un modèle de récurrence (voir MODULE-05.2 §1.8). */
async function getOrCreateTimesheet(teacherId: string, year: number, month: number) {
  return prisma.teacherMonthlyTimesheet.upsert({
    where: { teacherId_year_month: { teacherId, year, month } },
    create: { teacherId, year, month },
    update: {},
  });
}

export async function openMonthlyTimesheet(input: GetMonthlyTimesheetInput): Promise<TeacherMonthlyTimesheetDto> {
  const timesheet = await getOrCreateTimesheet(input.teacherId, input.year, input.month);
  return getTimesheetDtoById(timesheet.id);
}

export async function getMonthlyTimesheet(input: GetMonthlyTimesheetInput): Promise<TeacherMonthlyTimesheetDto> {
  return openMonthlyTimesheet(input);
}

/**
 * Grille de pointage cochable (extension du 2026-07-30, retour du porteur du projet) : enregistre en
 * une fois l'état coché/décoché de toute la grille du mois — coché = EFFECTUEE, décoché = retour à
 * PROGRAMMEE. Ne touche jamais les séances REPORTEE/ANNULEE/REMPLACEE (qualification détaillée avec
 * motif, réservée au dialogue "Qualifier") ni une fiche clôturée.
 */
export async function saveMonthlyPointage(input: SaveMonthlyPointageInput, validatedBy: string): Promise<TeacherMonthlyTimesheetDto> {
  const timesheet = await getOrCreateTimesheet(input.teacherId, input.year, input.month);
  assertTimesheetOpen(timesheet.status);

  const eligible = await prisma.seance.findMany({
    where: { timesheetId: timesheet.id, status: { in: ["PROGRAMMEE", "EFFECTUEE"] } },
    select: { id: true, status: true },
  });
  const executedSet = new Set(input.executedSeanceIds);
  const toExecute = eligible.filter((s) => executedSet.has(s.id) && s.status !== "EFFECTUEE").map((s) => s.id);
  const toRevert = eligible.filter((s) => !executedSet.has(s.id) && s.status !== "PROGRAMMEE").map((s) => s.id);

  const operations = [
    ...(toExecute.length
      ? [prisma.seance.updateMany({ where: { id: { in: toExecute } }, data: { status: "EFFECTUEE" as const, validatedAt: new Date(), validatedBy } })]
      : []),
    ...(toRevert.length
      ? [prisma.seance.updateMany({ where: { id: { in: toRevert } }, data: { status: "PROGRAMMEE" as const, validatedAt: null, validatedBy: null } })]
      : []),
  ];
  if (operations.length > 0) await prisma.$transaction(operations);

  return getTimesheetDtoById(timesheet.id);
}

export async function listMonthlyTimesheets(year: number, month: number): Promise<TeacherMonthlyTimesheetDto[]> {
  const rows = await prisma.teacherMonthlyTimesheet.findMany({
    where: { year, month },
    include: TIMESHEET_INCLUDE,
    orderBy: { teacher: { lastName: "asc" } },
  });
  return rows.map(toTimesheetDto);
}

function assertTimesheetOpen(status: string): void {
  if (status === "CLOTUREE") {
    throw new Error("Cette fiche de pointage est clôturée. Seul un administrateur autorisé peut la rouvrir.");
  }
}

export async function closeMonthlyTimesheet(id: string, closedBy: string): Promise<TeacherMonthlyTimesheetDto> {
  await prisma.teacherMonthlyTimesheet.update({
    where: { id },
    data: { status: "CLOTUREE", closedAt: new Date(), closedBy },
  });
  return getTimesheetDtoById(id);
}

/** Réouverture par un administrateur autorisé (`POINTAGE:ADMINISTRATION`). */
export async function reopenMonthlyTimesheet(id: string): Promise<TeacherMonthlyTimesheetDto> {
  await prisma.teacherMonthlyTimesheet.update({
    where: { id },
    data: { status: "OUVERTE", closedAt: null, closedBy: null },
  });
  return getTimesheetDtoById(id);
}

// --- Création/modification de séances (voir MODULE-05.2 §1.3/§1.4). ---

export interface CreateSeanceCoreData {
  teacherId: string;
  subjectOfferingId: string;
  roomId: string | null;
  recurrenceTemplateId?: string | null;
  sessionDate: Date;
  startTime: string;
  endTime: string;
  classIds: string[];
}

/** Cœur de la création — sans contrôle de conflits (déjà effectué par l'appelant si nécessaire).
 * Ouvre la fiche mensuelle correspondante si besoin, rattache la séance à N classes d'un coup
 * (jamais dupliquée par classe, voir §1.11). */
export async function createSeanceCore(data: CreateSeanceCoreData): Promise<SeanceDto> {
  const date = normalizeDate(data.sessionDate);
  const timesheet = await getOrCreateTimesheet(data.teacherId, date.getFullYear(), date.getMonth() + 1);

  const row = await prisma.seance.create({
    data: {
      teacherId: data.teacherId,
      subjectOfferingId: data.subjectOfferingId,
      roomId: data.roomId,
      recurrenceTemplateId: data.recurrenceTemplateId ?? null,
      timesheetId: timesheet.id,
      sessionDate: date,
      startTime: data.startTime,
      endTime: data.endTime,
      classes: { create: data.classIds.map((classId) => ({ classId })) },
    },
    include: SEANCE_INCLUDE,
  });
  return toSeanceDto(row);
}

/** Création manuelle/assistée (voir MODULE-05.2 §1.3/§1.4) : contrôle de conflits bloquant. */
export async function createSeance(input: CreateSeanceInput): Promise<SeanceDto> {
  const { conflicts } = await checkSeanceConflicts({
    teacherId: input.teacherId,
    roomId: input.roomId ?? null,
    classIds: input.classIds,
    sessionDate: input.sessionDate,
    startTime: input.startTime,
    endTime: input.endTime,
  });
  if (conflicts.length > 0) {
    throw new Error(
      `Conflit détecté : ${conflicts.map((c) => c.label).join(" ")}`
    );
  }
  return createSeanceCore({
    teacherId: input.teacherId,
    subjectOfferingId: input.subjectOfferingId,
    roomId: input.roomId ?? null,
    sessionDate: input.sessionDate,
    startTime: input.startTime,
    endTime: input.endTime,
    classIds: input.classIds,
  });
}

export async function updateSeance(input: UpdateSeanceInput): Promise<SeanceDto> {
  const existing = await prisma.seance.findUniqueOrThrow({ where: { id: input.id }, include: { timesheet: true } });
  assertTimesheetOpen(existing.timesheet.status);

  const { conflicts } = await checkSeanceConflicts({
    excludeSeanceId: input.id,
    teacherId: existing.teacherId,
    roomId: input.roomId ?? null,
    classIds: input.classIds,
    sessionDate: input.sessionDate,
    startTime: input.startTime,
    endTime: input.endTime,
  });
  if (conflicts.length > 0) {
    throw new Error(`Conflit détecté : ${conflicts.map((c) => c.label).join(" ")}`);
  }

  const row = await prisma.$transaction(async (tx) => {
    await tx.seanceClass.deleteMany({ where: { seanceId: input.id } });
    await tx.seanceClass.createMany({ data: input.classIds.map((classId) => ({ seanceId: input.id, classId })) });
    return tx.seance.update({
      where: { id: input.id },
      data: {
        roomId: input.roomId ?? null,
        sessionDate: normalizeDate(input.sessionDate),
        startTime: input.startTime,
        endTime: input.endTime,
      },
      include: SEANCE_INCLUDE,
    });
  });
  return toSeanceDto(row);
}

/**
 * Qualifie une séance (voir MODULE-05.2 §1.9) : seul un utilisateur du système peut valider —
 * l'enseignant n'a pas de compte de connexion (voir MODULE-05 §1.1), l'auto-validation n'est donc
 * pas possible dans cette version.
 */
export async function qualifySeance(input: QualifySeanceInput, validatedBy: string): Promise<SeanceDto> {
  const seance = await prisma.seance.findUniqueOrThrow({ where: { id: input.id }, include: { timesheet: true } });
  assertTimesheetOpen(seance.timesheet.status);

  const row = await prisma.seance.update({
    where: { id: input.id },
    data: {
      status: input.status,
      reason: input.reason ?? null,
      rescheduledToSeanceId: input.rescheduledToSeanceId ?? null,
      substituteTeacherId: input.substituteTeacherId ?? null,
      validatedAt: new Date(),
      validatedBy,
    },
    include: SEANCE_INCLUDE,
  });
  const dto = toSeanceDto(row);

  // Module 12 — Centre de Communication : notification automatique de changement d'emploi du temps
  // (voir MODULE-12 §1.10), seulement pour les statuts qui modifient réellement le déroulement prévu.
  if (input.status === "REPORTEE" || input.status === "ANNULEE" || input.status === "REMPLACEE") {
    void notifySeanceChanged(dto);
  }

  return dto;
}

/**
 * Qualification groupée (extension du 2026-07-30, retour du porteur du projet) : marque en une
 * fois toutes les séances données comme EFFECTUEE — ignore silencieusement celles déjà qualifiées
 * (statut différent de PROGRAMMEE) ou dont la fiche est clôturée, plutôt que d'échouer sur un lot.
 * L'admin ne corrige ensuite que les exceptions une par une via `qualifySeance`.
 */
export async function qualifySeancesBulk(input: QualifySeancesBulkInput, validatedBy: string): Promise<QualifySeancesBulkResult> {
  const seances = await prisma.seance.findMany({
    where: { id: { in: input.ids }, status: "PROGRAMMEE" },
    include: { timesheet: true },
  });
  const eligibleIds = seances.filter((s) => s.timesheet.status !== "CLOTUREE").map((s) => s.id);
  if (eligibleIds.length === 0) return { qualifiedCount: 0 };

  const result = await prisma.seance.updateMany({
    where: { id: { in: eligibleIds } },
    data: { status: "EFFECTUEE", validatedAt: new Date(), validatedBy },
  });
  return { qualifiedCount: result.count };
}

// --- Intégration Module 8 (révise ADR-035/ADR-039, voir MODULE-05.2 §1.13). ---

export interface TeacherPayrollHours {
  hours: number;
  source: "POINTAGE" | "PLANIFIE";
}

/**
 * Heures à utiliser pour le calcul de paie horaire d'un enseignant sur un mois donné : priorité
 * aux heures réellement pointées si la fiche existe et que toutes ses séances sont qualifiées
 * (statut différent de PROGRAMMEE) ; repli sur `plannedHoursFallback` sinon. Les séances "REMPLACEE"
 * dont cet enseignant est le remplaçant comptent toujours pour lui, quelle que soit la source
 * retenue pour ses propres séances — jamais multipliées par le nombre de classes liées (§1.11).
 */
export async function getTeacherPayrollHours(
  teacherId: string,
  year: number,
  month: number,
  plannedHoursFallback: number
): Promise<TeacherPayrollHours> {
  const timesheet = await prisma.teacherMonthlyTimesheet.findUnique({
    where: { teacherId_year_month: { teacherId, year, month } },
    include: { sessions: true },
  });

  const substituteSessions = await prisma.seance.findMany({
    where: { substituteTeacherId: teacherId, status: "REMPLACEE", timesheet: { year, month } },
  });
  const substituteHours = substituteSessions.reduce(
    (sum, s) => sum + sessionDurationHours(s.startTime, s.endTime),
    0
  );

  const isComplete = timesheet !== null && timesheet.sessions.every((s) => s.status !== "PROGRAMMEE");
  if (!isComplete) {
    return { hours: plannedHoursFallback + substituteHours, source: substituteHours > 0 ? "POINTAGE" : "PLANIFIE" };
  }

  const ownHours = timesheet.sessions
    .filter((s) => s.status === "EFFECTUEE")
    .reduce((sum, s) => sum + sessionDurationHours(s.startTime, s.endTime), 0);

  return { hours: ownHours + substituteHours, source: "POINTAGE" };
}

// --- Écran de contrôle avant génération de la paie (voir MODULE-05.1 §1.9, MODULE-05.2 §1.14). ---

export async function getPayrollControlSummary(year: number, month: number): Promise<PayrollControlSummaryDto[]> {
  const timesheets = await listMonthlyTimesheets(year, month);
  const employees = await prisma.employee.findMany({ where: { teacherId: { not: null } } });
  const employeeByTeacherId = new Map(employees.map((e) => [e.teacherId as string, e]));

  const results: PayrollControlSummaryDto[] = [];
  for (const t of timesheets) {
    const employee = employeeByTeacherId.get(t.teacherId) ?? null;
    const observations = t.sessions
      .filter((s) => s.status !== "PROGRAMMEE" && s.status !== "EFFECTUEE")
      .map((s) => `${s.sessionDate.toLocaleDateString("fr-FR")} — ${s.status}${s.reason ? ` (${s.reason})` : ""}`);

    let grossAmount: number | null = null;
    if (employee?.hourlyRate) {
      grossAmount = t.hoursDone * Number(employee.hourlyRate);
    }

    results.push({
      teacherId: t.teacherId,
      employeeId: employee?.id ?? null,
      teacherMatricule: t.teacherMatricule,
      teacherName: t.teacherName,
      timesheetStatus: t.status,
      sessionsPlanned: t.sessionsPlanned,
      sessionsDone: t.sessionsDone,
      sessionsPostponed: t.sessionsPostponed,
      sessionsNotDone: t.sessionsNotDone,
      hoursPlanned: t.hoursPlanned,
      hoursDone: t.hoursDone,
      grossAmount,
      observations,
    });
  }
  return results;
}
