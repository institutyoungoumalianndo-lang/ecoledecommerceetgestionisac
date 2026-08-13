import { randomUUID } from "node:crypto";
import { prisma, type Prisma } from "@isac-erp/db";
import type {
  AddPayrollLineComponentInput,
  CalculatePayrollLineInput,
  ListPayrollLinesInput,
  PayrollLineDto,
  UpdatePayrollLineHoursInput,
  ValidatePayrollLineInput,
} from "@isac-erp/shared";
import { computeWeeksInRange } from "./teacherAssignmentService.js";
import { getEmployeeById } from "./employeeService.js";
import { assertPayPeriodModifiable, markPayPeriodInProgress, payPeriodLabel } from "./payPeriodService.js";
import { getPendingAdvancesForPeriod, markAdvancesDeducted } from "./salaryAdvanceService.js";
import { cancelJournalEntry, recordPayrollValidationEntry } from "./journalEntryService.js";

const PAYROLL_LINE_INCLUDE = {
  payPeriod: true,
  paymentMethod: true,
  validatedByUser: true,
  components: { include: { componentType: true } },
} satisfies Prisma.PayrollLineInclude;

type PayrollLineWithRelations = Prisma.PayrollLineGetPayload<{ include: typeof PAYROLL_LINE_INCLUDE }>;

async function toDto(row: PayrollLineWithRelations): Promise<PayrollLineDto> {
  const employee = await getEmployeeById(row.employeeId);
  const { start: payPeriodStartDate, end: payPeriodEndDate } = monthRange(row.payPeriod.year, row.payPeriod.month);
  return {
    id: row.id,
    payPeriodId: row.payPeriodId,
    payPeriodLabel: payPeriodLabel(row.payPeriod.year, row.payPeriod.month),
    employeeId: row.employeeId,
    employeeMatricule: employee.matricule,
    employeeName: `${employee.lastName ?? ""} ${employee.firstName ?? ""}`.trim(),
    employeeCategoryLabel: employee.categoryLabel,
    employeeDepartment: employee.department,
    employeeContractTypeLabel: employee.contractTypeLabel,
    employeeSalaryMode: employee.salaryMode,
    employeeTeachingHoursPaid: employee.teachingHoursPaid,
    employeeIsLinkedToTeacher: employee.isLinkedToTeacher,
    employeeAddress: employee.address,
    employeePhone: employee.phonePrimary,
    payPeriodStartDate,
    payPeriodEndDate,
    baseSalary: Number(row.baseSalary),
    hoursPlanned: row.hoursPlanned ? Number(row.hoursPlanned) : null,
    hoursWorked: row.hoursWorked ? Number(row.hoursWorked) : null,
    hoursSource: row.hoursSource,
    hourlyRate: row.hourlyRate ? Number(row.hourlyRate) : null,
    overtimeHours: row.overtimeHours ? Number(row.overtimeHours) : null,
    overtimeAmount: row.overtimeAmount ? Number(row.overtimeAmount) : null,
    totalPrimes: Number(row.totalPrimes),
    totalIndemnites: Number(row.totalIndemnites),
    totalRetenues: Number(row.totalRetenues),
    totalAdvancesDeducted: Number(row.totalAdvancesDeducted),
    totalCotisations: Number(row.totalCotisations),
    grossSalary: Number(row.grossSalary),
    netSalary: Number(row.netSalary),
    paymentMethodId: row.paymentMethodId,
    paymentMethodLabel: row.paymentMethod?.label ?? null,
    status: row.status,
    verificationCode: row.verificationCode,
    calculatedAt: row.calculatedAt,
    validatedAt: row.validatedAt,
    validatedByName: row.validatedByUser ? `${row.validatedByUser.firstName} ${row.validatedByUser.lastName}` : null,
    components: row.components.map((c) => ({
      id: c.id,
      payrollLineId: c.payrollLineId,
      componentTypeId: c.componentTypeId,
      componentTypeLabel: c.componentType.label,
      componentKind: c.componentType.kind,
      amount: Number(c.amount),
    })),
  };
}

// --- Fonctions pures — testables sans base de données. ---

export interface AssignmentMonthlyHours {
  weeklyHours: number;
  periodStart: Date;
  periodEnd: Date;
}

/** Intersection de deux intervalles de dates, ou null si elles ne se chevauchent pas. */
export function intersectDateRanges(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): { start: Date; end: Date } | null {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  return start <= end ? { start, end } : null;
}

/**
 * Heures "planifiées" d'un enseignant sur un mois calendaire donné (MODULE-08 §1.4) — proxy des
 * heures "réellement exécutées" faute de suivi de présence réel : pour chaque affectation active,
 * les heures hebdomadaires ne comptent que sur les semaines où son semestre chevauche le mois de paie.
 */
export function computeMonthlyPlannedHours(
  assignments: AssignmentMonthlyHours[],
  monthStart: Date,
  monthEnd: Date
): number {
  return assignments.reduce((sum, a) => {
    const overlap = intersectDateRanges(a.periodStart, a.periodEnd, monthStart, monthEnd);
    if (!overlap) return sum;
    return sum + a.weeklyHours * computeWeeksInRange(overlap.start, overlap.end);
  }, 0);
}

export interface PayrollTotalsInput {
  baseSalary: number;
  overtimeAmount: number;
  totalPrimes: number;
  totalIndemnites: number;
  totalRetenues: number;
  totalCotisations: number;
  totalAdvancesDeducted: number;
}

/** Brut = base + heures sup + primes + indemnités ; net = brut - retenues - cotisations - avances (MODULE-08 §1.9). */
export function computePayrollTotals(input: PayrollTotalsInput): { grossSalary: number; netSalary: number } {
  const grossSalary = input.baseSalary + input.overtimeAmount + input.totalPrimes + input.totalIndemnites;
  const netSalary = grossSalary - input.totalRetenues - input.totalCotisations - input.totalAdvancesDeducted;
  return { grossSalary, netSalary };
}

export interface BaseSalaryEmployee {
  salaryMode: "FIXE" | "HORAIRE";
  fixedMonthlySalary: number | null;
  teachingHoursPaid: boolean;
}

/**
 * Salaire de base — FIXE : salaire fixe, + heures × taux horaire si `teachingHoursPaid` (heures
 * d'enseignement rémunérées en plus du fixe) ; HORAIRE : entièrement heures × taux. Extrait de
 * `calculatePayrollLine` pour être réutilisé par `updatePayrollLineHours` (saisie manuelle) sans
 * dupliquer la règle de calcul.
 */
export function computeBaseSalary(
  employee: BaseSalaryEmployee,
  hoursWorked: number | null,
  hourlyRate: number | null
): number {
  if (employee.salaryMode === "FIXE") {
    let baseSalary = employee.fixedMonthlySalary ?? 0;
    if (employee.teachingHoursPaid && hoursWorked !== null && hourlyRate !== null) {
      baseSalary += hoursWorked * hourlyRate;
    }
    return baseSalary;
  }
  return (hoursWorked ?? 0) * (hourlyRate ?? 0);
}

// --- Service. ---

function monthRange(year: number, month: number): { start: Date; end: Date } {
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 0, 23, 59, 59) };
}

/**
 * Heures planifiées d'un enseignant sur un mois calendaire précis, depuis ses affectations actives
 * (2026-08-08, retour du porteur du projet) — sert de suggestion pré-remplie sur la fiche d'émargement
 * mensuelle (toujours modifiable à la main), jamais pour la paie (voir §9 du doc Module 8 : le calcul
 * automatique des heures a été retiré de `calculatePayrollLine`, la paie reste entièrement manuelle).
 * Réutilise `computeMonthlyPlannedHours` telle quelle, seule la récupération des affectations diffère.
 */
export async function getTeacherPlannedHoursForMonth(teacherId: string, year: number, month: number): Promise<number> {
  const { start, end } = monthRange(year, month);
  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId, isActive: true },
    include: { subjectOffering: { include: { period: true } } },
  });
  const assignmentHours: AssignmentMonthlyHours[] = assignments.map((a) => ({
    weeklyHours: a.subjectOffering.hoursCourse + a.subjectOffering.hoursTd + a.subjectOffering.hoursTp,
    periodStart: a.subjectOffering.period.startDate,
    periodEnd: a.subjectOffering.period.endDate,
  }));
  return computeMonthlyPlannedHours(assignmentHours, start, end);
}

async function recomputeLineTotals(lineId: string): Promise<void> {
  const [components, line] = await Promise.all([
    prisma.payrollLineComponent.findMany({ where: { payrollLineId: lineId }, include: { componentType: true } }),
    prisma.payrollLine.findUniqueOrThrow({ where: { id: lineId } }),
  ]);

  const sums = { PRIME: 0, INDEMNITE: 0, RETENUE: 0, COTISATION: 0 };
  for (const c of components) sums[c.componentType.kind] += Number(c.amount);

  const advances = await getPendingAdvancesForPeriod(line.employeeId, line.payPeriodId);
  const totalAdvancesDeducted = advances.reduce((sum, a) => sum + Number(a.amount), 0);

  const { grossSalary, netSalary } = computePayrollTotals({
    baseSalary: Number(line.baseSalary),
    overtimeAmount: line.overtimeAmount ? Number(line.overtimeAmount) : 0,
    totalPrimes: sums.PRIME,
    totalIndemnites: sums.INDEMNITE,
    totalRetenues: sums.RETENUE,
    totalCotisations: sums.COTISATION,
    totalAdvancesDeducted,
  });

  await prisma.payrollLine.update({
    where: { id: lineId },
    data: {
      totalPrimes: sums.PRIME,
      totalIndemnites: sums.INDEMNITE,
      totalRetenues: sums.RETENUE,
      totalAdvancesDeducted,
      totalCotisations: sums.COTISATION,
      grossSalary,
      netSalary,
    },
  });
}

/** Calcule (ou recalcule) le bulletin d'un employé pour une période — recalculable tant que non VALIDEE. */
export async function calculatePayrollLine(input: CalculatePayrollLineInput): Promise<PayrollLineDto> {
  await assertPayPeriodModifiable(input.payPeriodId);

  const existing = await prisma.payrollLine.findUnique({
    where: { payPeriodId_employeeId: { payPeriodId: input.payPeriodId, employeeId: input.employeeId } },
  });
  if (existing?.status === "VALIDEE") {
    throw new Error("Ce bulletin est déjà validé — il ne peut plus être recalculé.");
  }

  const [payPeriod, employee] = await Promise.all([
    prisma.payPeriod.findUniqueOrThrow({ where: { id: input.payPeriodId } }),
    prisma.employee.findUniqueOrThrow({ where: { id: input.employeeId } }),
  ]);

  // Plus aucune estimation automatique depuis les affectations ou le pointage (2026-08-08, retour du
  // porteur du projet — "je veux que rien ne soit automatique, je veux saisir les heures exécutées
  // pour tout le monde") : "Calculer" crée simplement une ligne à 0 heure/0 salaire pour un
  // enseignant, à saisir intégralement à la main (`updatePayrollLineHours`) puis à valider. Une
  // saisie manuelle déjà présente n'est jamais écrasée par un recalcul.
  let hoursWorked: number | null = null;
  let hoursSource: "MANUEL" | null = null;
  if (employee.teacherId) {
    hoursWorked = existing?.hoursWorked ? Number(existing.hoursWorked) : 0;
    hoursSource = existing?.hoursSource === "MANUEL" ? "MANUEL" : null;
  }

  const hourlyRate = employee.hourlyRate ? Number(employee.hourlyRate) : null;
  const baseSalary = computeBaseSalary(
    {
      salaryMode: employee.salaryMode,
      fixedMonthlySalary: employee.fixedMonthlySalary ? Number(employee.fixedMonthlySalary) : null,
      teachingHoursPaid: employee.teachingHoursPaid,
    },
    hoursWorked,
    hourlyRate
  );

  const row = await prisma.payrollLine.upsert({
    where: { payPeriodId_employeeId: { payPeriodId: input.payPeriodId, employeeId: input.employeeId } },
    create: {
      payPeriodId: input.payPeriodId,
      employeeId: input.employeeId,
      baseSalary,
      hoursPlanned: hoursWorked,
      hoursWorked,
      hoursSource,
      hourlyRate,
      status: "CALCULEE",
      calculatedAt: new Date(),
    },
    update: {
      baseSalary,
      hoursPlanned: hoursWorked,
      hoursWorked,
      hoursSource,
      hourlyRate,
      status: "CALCULEE",
      calculatedAt: new Date(),
    },
  });

  await recomputeLineTotals(row.id);
  await markPayPeriodInProgress(input.payPeriodId);

  return getPayrollLineById(row.id);
}

/** Calcule les bulletins de tous les employés actifs non encore validés pour une période. */
export async function calculatePayPeriodLines(payPeriodId: string): Promise<PayrollLineDto[]> {
  const employees = await prisma.employee.findMany({ where: { archivedAt: null } });
  const results: PayrollLineDto[] = [];
  for (const employee of employees) {
    const line = await calculatePayrollLine({ payPeriodId, employeeId: employee.id }).catch(() => null);
    if (line) results.push(line);
  }
  return results;
}

export async function getPayrollLineById(id: string): Promise<PayrollLineDto> {
  const row = await prisma.payrollLine.findUniqueOrThrow({ where: { id }, include: PAYROLL_LINE_INCLUDE });
  return toDto(row);
}

export async function listPayrollLines(filter: ListPayrollLinesInput): Promise<PayrollLineDto[]> {
  const rows = await prisma.payrollLine.findMany({
    where: { payPeriodId: filter.payPeriodId, employeeId: filter.employeeId, status: filter.status },
    include: PAYROLL_LINE_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
  return Promise.all(rows.map(toDto));
}

export async function addPayrollLineComponent(input: AddPayrollLineComponentInput): Promise<PayrollLineDto> {
  const line = await prisma.payrollLine.findUniqueOrThrow({ where: { id: input.payrollLineId } });
  await assertPayPeriodModifiable(line.payPeriodId);
  if (line.status === "VALIDEE") {
    throw new Error("Ce bulletin est déjà validé — il ne peut plus être modifié.");
  }
  await prisma.payrollLineComponent.create({
    data: { payrollLineId: input.payrollLineId, componentTypeId: input.componentTypeId, amount: input.amount },
  });
  await recomputeLineTotals(input.payrollLineId);
  return getPayrollLineById(input.payrollLineId);
}

export async function removePayrollLineComponent(id: string): Promise<PayrollLineDto> {
  const component = await prisma.payrollLineComponent.findUniqueOrThrow({ where: { id } });
  const line = await prisma.payrollLine.findUniqueOrThrow({ where: { id: component.payrollLineId } });
  await assertPayPeriodModifiable(line.payPeriodId);
  if (line.status === "VALIDEE") {
    throw new Error("Ce bulletin est déjà validé — il ne peut plus être modifié.");
  }
  await prisma.payrollLineComponent.delete({ where: { id } });
  await recomputeLineTotals(line.id);
  return getPayrollLineById(line.id);
}

/**
 * Saisie manuelle des heures travaillées (2026-08-05) — depuis la fiche d'émargement papier signée,
 * seule source possible pour un enseignant payé à l'heure depuis l'abandon du pointage numérique.
 * Marque la ligne `MANUEL` : un "Recalculer" ultérieur (calculatePayrollLine) ne l'écrasera plus.
 */
export async function updatePayrollLineHours(input: UpdatePayrollLineHoursInput): Promise<PayrollLineDto> {
  const line = await prisma.payrollLine.findUniqueOrThrow({ where: { id: input.id } });
  await assertPayPeriodModifiable(line.payPeriodId);
  if (line.status === "VALIDEE") {
    throw new Error("Ce bulletin est déjà validé — il ne peut plus être modifié.");
  }

  const employee = await prisma.employee.findUniqueOrThrow({ where: { id: line.employeeId } });
  const hourlyRate = employee.hourlyRate ? Number(employee.hourlyRate) : null;
  const baseSalary = computeBaseSalary(
    {
      salaryMode: employee.salaryMode,
      fixedMonthlySalary: employee.fixedMonthlySalary ? Number(employee.fixedMonthlySalary) : null,
      teachingHoursPaid: employee.teachingHoursPaid,
    },
    input.hoursWorked,
    hourlyRate
  );

  await prisma.payrollLine.update({
    where: { id: input.id },
    data: {
      baseSalary,
      hoursWorked: input.hoursWorked,
      hoursSource: "MANUEL",
      hourlyRate,
      status: line.status === "BROUILLON" ? "CALCULEE" : line.status,
      calculatedAt: new Date(),
    },
  });

  await recomputeLineTotals(input.id);
  await markPayPeriodInProgress(line.payPeriodId);
  return getPayrollLineById(input.id);
}

/**
 * Valide définitivement un bulletin (MODULE-08 §1.9) : fige la ligne, déduit les avances en attente,
 * génère l'écriture comptable si les comptes sont configurés (voir journalEntryService).
 */
export async function validatePayrollLine(
  input: ValidatePayrollLineInput,
  validatedBy: string
): Promise<PayrollLineDto> {
  const line = await prisma.payrollLine.findUniqueOrThrow({ where: { id: input.id } });
  await assertPayPeriodModifiable(line.payPeriodId);
  if (line.status !== "CALCULEE") {
    throw new Error("Le bulletin doit être calculé avant d'être validé.");
  }

  const advances = await getPendingAdvancesForPeriod(line.employeeId, line.payPeriodId);
  await markAdvancesDeducted(advances.map((a) => a.id));

  const verificationCode = randomUUID().slice(0, 8).toUpperCase();
  const updated = await prisma.payrollLine.update({
    where: { id: input.id },
    data: {
      status: "VALIDEE",
      validatedAt: new Date(),
      validatedBy,
      verificationCode,
      paymentMethodId: input.paymentMethodId ?? line.paymentMethodId,
    },
  });

  const payPeriod = await prisma.payPeriod.findUniqueOrThrow({ where: { id: line.payPeriodId } });
  const employee = await getEmployeeById(line.employeeId);
  await recordPayrollValidationEntry({
    id: updated.id,
    netSalary: Number(updated.netSalary),
    payPeriodYear: payPeriod.year,
    payPeriodMonth: payPeriod.month,
    employeeMatricule: employee.matricule,
    paymentMethodId: updated.paymentMethodId,
    validatedBy,
  });

  return getPayrollLineById(updated.id);
}

/**
 * Dévalide un bulletin (2026-08-06) — repasse VALIDEE → CALCULEE pour permettre sa correction (ex.
 * heures saisies à 0, salaire de base à 0) puis une nouvelle validation. Ne fonctionne que sur une
 * période non clôturée (mêmes garde-fous que le reste du module). Contre-passe l'écriture comptable
 * liée si elle existait (jamais de suppression, voir cancelJournalEntry). N'annule PAS le statut
 * "déduite" des avances sur salaire qui auraient été déduites lors de la validation — le modèle
 * SalaryAdvance ne conserve pas de lien vers le bulletin qui les a déduites, donc aucune reprise fiable
 * n'est possible automatiquement ; à vérifier manuellement dans l'onglet Avances si besoin.
 */
export async function unvalidatePayrollLine(id: string, unvalidatedBy: string): Promise<PayrollLineDto> {
  const line = await prisma.payrollLine.findUniqueOrThrow({ where: { id } });
  await assertPayPeriodModifiable(line.payPeriodId);
  if (line.status !== "VALIDEE") {
    throw new Error("Ce bulletin n'est pas validé.");
  }

  const entry = await prisma.journalEntry.findFirst({
    where: { sourceType: "PayrollLine", sourceId: id, status: "VALIDEE" },
  });
  if (entry) {
    await cancelJournalEntry({ id: entry.id, reason: "Bulletin de paie dévalidé" }, unvalidatedBy);
  }

  await prisma.payrollLine.update({
    where: { id },
    data: { status: "CALCULEE", validatedAt: null, validatedBy: null, verificationCode: null },
  });

  return getPayrollLineById(id);
}
