import { z } from "zod";
import { salaryModeSchema } from "./employee.js";

export const payrollLineStatusSchema = z.enum(["BROUILLON", "CALCULEE", "VALIDEE"]);
export type PayrollLineStatus = z.infer<typeof payrollLineStatusSchema>;

/**
 * Origine des heures horaires — voir MODULE-05.1 §1.10 (révise ADR-035). MANUEL (2026-08-05) : saisie
 * à la main depuis la fiche d'émargement papier signée, seule source possible depuis l'abandon du
 * pointage numérique pour les enseignants payés à l'heure — voir FICHE_EMARGEMENT_ENSEIGNANT.
 */
export const hoursSourceSchema = z.enum(["POINTAGE", "PLANIFIE", "MANUEL"]);
export type HoursSource = z.infer<typeof hoursSourceSchema>;

export const payrollLineComponentSchema = z.object({
  id: z.string().uuid(),
  payrollLineId: z.string().uuid(),
  componentTypeId: z.string().uuid(),
  componentTypeLabel: z.string(),
  componentKind: z.enum(["PRIME", "INDEMNITE", "RETENUE", "COTISATION"]),
  amount: z.number(),
});
export type PayrollLineComponentDto = z.infer<typeof payrollLineComponentSchema>;

export const addPayrollLineComponentInputSchema = z.object({
  payrollLineId: z.string().uuid(),
  componentTypeId: z.string().uuid(),
  amount: z.number().positive(),
});
export type AddPayrollLineComponentInput = z.infer<typeof addPayrollLineComponentInputSchema>;

export const payrollLineComponentIdInputSchema = z.object({ id: z.string().uuid() });

/**
 * Ligne de paie (un employé × une période) — voir MODULE-08 §1.9/§1.10. Recalculable tant que non
 * VALIDEE ; figée dès validation (le bulletin réimprimable est cette ligne elle-même, jamais un
 * fichier séparé — voir §1.10).
 */
export const payrollLineSchema = z.object({
  id: z.string().uuid(),
  payPeriodId: z.string().uuid(),
  payPeriodLabel: z.string(),
  employeeId: z.string().uuid(),
  employeeMatricule: z.string(),
  employeeName: z.string(),
  employeeCategoryLabel: z.string(),
  employeeDepartment: z.string().nullable(),
  employeeContractTypeLabel: z.string().nullable(),
  employeeSalaryMode: salaryModeSchema,
  employeeTeachingHoursPaid: z.boolean(),
  /** Saisie manuelle des heures (2026-08-08) : disponible pour tout employé lié à un enseignant, quel
   * que soit le mode de rémunération choisi à la création — jamais conditionné à `employeeSalaryMode`/
   * `employeeTeachingHoursPaid` seuls, qui ne pilotent que si les heures affectent le calcul du salaire. */
  employeeIsLinkedToTeacher: z.boolean(),
  /** Bulletin de paie (refonte 2026-07-31) : adresse/téléphone affichés dans le cadre "Informations
   * de l'employé". Reprend `EmployeeDto.address`/`phonePrimary` — jamais saisis ici. */
  employeeAddress: z.string().nullable(),
  employeePhone: z.string().nullable(),
  /** Bornes calendaires de la période de paie — dérivées de `PayPeriod.year`/`month`, pour l'affichage
   * "Début période"/"Fin période" du bulletin (2026-07-31) ; `payPeriodLabel` reste le libellé court. */
  payPeriodStartDate: z.coerce.date(),
  payPeriodEndDate: z.coerce.date(),
  baseSalary: z.number(),
  hoursPlanned: z.number().nullable(),
  hoursWorked: z.number().nullable(),
  hoursSource: hoursSourceSchema.nullable(),
  hourlyRate: z.number().nullable(),
  overtimeHours: z.number().nullable(),
  overtimeAmount: z.number().nullable(),
  totalPrimes: z.number(),
  totalIndemnites: z.number(),
  totalRetenues: z.number(),
  totalAdvancesDeducted: z.number(),
  totalCotisations: z.number(),
  grossSalary: z.number(),
  netSalary: z.number(),
  paymentMethodId: z.string().uuid().nullable(),
  paymentMethodLabel: z.string().nullable(),
  status: payrollLineStatusSchema,
  verificationCode: z.string().nullable(),
  calculatedAt: z.coerce.date().nullable(),
  validatedAt: z.coerce.date().nullable(),
  validatedByName: z.string().nullable(),
  components: z.array(payrollLineComponentSchema),
});
export type PayrollLineDto = z.infer<typeof payrollLineSchema>;

export const calculatePayrollLineInputSchema = z.object({
  payPeriodId: z.string().uuid(),
  employeeId: z.string().uuid(),
});
export type CalculatePayrollLineInput = z.infer<typeof calculatePayrollLineInputSchema>;

export const calculatePayPeriodInputSchema = z.object({ payPeriodId: z.string().uuid() });
export type CalculatePayPeriodInput = z.infer<typeof calculatePayPeriodInputSchema>;

export const validatePayrollLineInputSchema = z.object({
  id: z.string().uuid(),
  paymentMethodId: z.string().uuid().nullish(),
});
export type ValidatePayrollLineInput = z.infer<typeof validatePayrollLineInputSchema>;

export const payrollLineIdInputSchema = z.object({ id: z.string().uuid() });

/**
 * Dévalidation d'un bulletin (2026-08-06) — repasse un bulletin VALIDEE en CALCULEE pour permettre sa
 * correction (ex. heures saisies à 0 par erreur) puis une nouvelle validation. Contre-passe l'écriture
 * comptable liée si elle existait ; ne touche PAS aux avances sur salaire déjà marquées "déduite" par
 * ce bulletin (le modèle SalaryAdvance ne trace pas quel bulletin les a déduites — à vérifier
 * manuellement dans Avances si besoin, voir CHANGELOG).
 */
export const unvalidatePayrollLineInputSchema = z.object({ id: z.string().uuid() });
export type UnvalidatePayrollLineInput = z.infer<typeof unvalidatePayrollLineInputSchema>;

/** Saisie manuelle des heures travaillées (2026-08-05) — depuis la fiche d'émargement papier signée. */
export const updatePayrollLineHoursInputSchema = z.object({
  id: z.string().uuid(),
  hoursWorked: z.number().min(0),
});
export type UpdatePayrollLineHoursInput = z.infer<typeof updatePayrollLineHoursInputSchema>;

export const listPayrollLinesInputSchema = z.object({
  payPeriodId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  status: payrollLineStatusSchema.optional(),
});
export type ListPayrollLinesInput = z.infer<typeof listPayrollLinesInputSchema>;
