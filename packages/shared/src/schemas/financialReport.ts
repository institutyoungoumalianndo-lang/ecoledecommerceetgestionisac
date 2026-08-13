import { z } from "zod";
import { accountTypeSchema } from "./chartAccount";

/** Grand livre (MODULE-07 §1.11) — calculé depuis journal_entry_lines uniquement. */
export const generalLedgerLineSchema = z.object({
  journalEntryId: z.string().uuid(),
  entryNumber: z.string(),
  entryDate: z.coerce.date(),
  label: z.string(),
  debit: z.number(),
  credit: z.number(),
  runningBalance: z.number(),
});
export type GeneralLedgerLine = z.infer<typeof generalLedgerLineSchema>;

export const generalLedgerInputSchema = z.object({
  accountId: z.string().uuid(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});
export type GeneralLedgerInput = z.infer<typeof generalLedgerInputSchema>;

export const generalLedgerResultSchema = z.object({
  accountId: z.string().uuid(),
  accountCode: z.string(),
  accountLabel: z.string(),
  openingBalance: z.number(),
  lines: z.array(generalLedgerLineSchema),
  closingBalance: z.number(),
});
export type GeneralLedgerResult = z.infer<typeof generalLedgerResultSchema>;

/** Balance comptable (MODULE-07 §1.11). */
export const trialBalanceRowSchema = z.object({
  accountId: z.string().uuid(),
  accountCode: z.string(),
  accountLabel: z.string(),
  type: accountTypeSchema,
  totalDebit: z.number(),
  totalCredit: z.number(),
  balance: z.number(),
});
export type TrialBalanceRow = z.infer<typeof trialBalanceRowSchema>;

export const trialBalanceInputSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});
export type TrialBalanceInput = z.infer<typeof trialBalanceInputSchema>;

export const trialBalanceResultSchema = z.object({
  rows: z.array(trialBalanceRowSchema),
  totalDebit: z.number(),
  totalCredit: z.number(),
});
export type TrialBalanceResult = z.infer<typeof trialBalanceResultSchema>;

/** Tableau de bord financier (MODULE-07 §1.11/§8.13). */
export const financialDashboardMonthSchema = z.object({
  label: z.string(),
  recettes: z.number(),
  depenses: z.number(),
});
export type FinancialDashboardMonth = z.infer<typeof financialDashboardMonthSchema>;

export const financialDashboardSchema = z.object({
  recettesToday: z.number(),
  depensesToday: z.number(),
  recettesMonth: z.number(),
  depensesMonth: z.number(),
  treasuryBalance: z.number(),
  recentMonths: z.array(financialDashboardMonthSchema),
});
export type FinancialDashboard = z.infer<typeof financialDashboardSchema>;

/** Rapports financiers par période/catégorie/utilisateur/caisse (MODULE-07 §1.11/§8.12). */
export const reportPeriodSchema = z.enum(["JOUR", "SEMAINE", "MOIS", "ANNEE"]);
export type ReportPeriod = z.infer<typeof reportPeriodSchema>;

export const financialReportPeriodInputSchema = z.object({
  period: reportPeriodSchema,
  date: z.coerce.date().optional(),
});
export type FinancialReportPeriodInput = z.infer<typeof financialReportPeriodInputSchema>;

export const financialReportByPeriodSchema = z.object({
  periodLabel: z.string(),
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
  totalRecettes: z.number(),
  totalDepenses: z.number(),
  solde: z.number(),
});
export type FinancialReportByPeriod = z.infer<typeof financialReportByPeriodSchema>;

export const financialReportByCategorySchema = z.object({
  rows: z.array(z.object({ categoryId: z.string().uuid(), categoryName: z.string(), total: z.number() })),
});
export type FinancialReportByCategory = z.infer<typeof financialReportByCategorySchema>;

export const financialReportByUserSchema = z.object({
  rows: z.array(
    z.object({ userId: z.string().uuid(), userName: z.string(), totalRecettes: z.number(), totalDepenses: z.number() })
  ),
});
export type FinancialReportByUser = z.infer<typeof financialReportByUserSchema>;

export const financialReportByCashRegisterSchema = z.object({
  rows: z.array(z.object({ cashRegisterId: z.string().uuid(), cashRegisterName: z.string(), total: z.number() })),
});
export type FinancialReportByCashRegister = z.infer<typeof financialReportByCashRegisterSchema>;

/**
 * Journal de caisse (rapports comptables — extension du 2026-07-30) : mouvements espèces chronologiques
 * d'une session de caisse précise (une ouverture → fermeture), recettes et dépenses confondues.
 */
export const cashJournalMovementSchema = z.object({
  date: z.coerce.date(),
  label: z.string(),
  type: z.enum(["RECETTE", "DEPENSE"]),
  amount: z.number(),
  runningBalance: z.number(),
});
export type CashJournalMovement = z.infer<typeof cashJournalMovementSchema>;

export const cashRegisterJournalInputSchema = z.object({
  cashRegisterSessionId: z.string().uuid(),
});
export type CashRegisterJournalInput = z.infer<typeof cashRegisterJournalInputSchema>;

export const cashRegisterJournalResultSchema = z.object({
  cashRegisterSessionId: z.string().uuid(),
  cashRegisterName: z.string(),
  openedAt: z.coerce.date(),
  closedAt: z.coerce.date().nullable(),
  openingBalance: z.number(),
  movements: z.array(cashJournalMovementSchema),
  closingBalance: z.number(),
});
export type CashRegisterJournalResult = z.infer<typeof cashRegisterJournalResultSchema>;

/**
 * Situation de caisse journalière (rapports comptables — extension du 2026-07-30) : position d'une
 * caisse physique précise pour un jour donné (par opposition au Rapport de caisse quotidien, toutes
 * caisses confondues).
 */
export const dailyCashPositionInputSchema = z.object({
  cashRegisterId: z.string().uuid(),
  date: z.coerce.date().optional(),
});
export type DailyCashPositionInput = z.infer<typeof dailyCashPositionInputSchema>;

export const dailyCashPositionSchema = z.object({
  cashRegisterId: z.string().uuid(),
  cashRegisterName: z.string(),
  date: z.coerce.date(),
  openingBalance: z.number(),
  totalRecettes: z.number(),
  totalDepenses: z.number(),
  closingBalanceTheorique: z.number(),
  sessionDeclaredBalance: z.number().nullable(),
  sessionVariance: z.number().nullable(),
});
export type DailyCashPosition = z.infer<typeof dailyCashPositionSchema>;

/** Recettes (MODULE-07 §1.4) — vue filtrée des paiements existants (Module 4.3), pas de duplication. */
export const revenueSummaryInputSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});
export type RevenueSummaryInput = z.infer<typeof revenueSummaryInputSchema>;

export const revenueSummarySchema = z.object({
  total: z.number(),
  count: z.number().int(),
  byFeeType: z.array(z.object({ feeTypeId: z.string().uuid(), feeTypeName: z.string(), total: z.number() })),
});
export type RevenueSummary = z.infer<typeof revenueSummarySchema>;

/**
 * Bilan mensuel/semestriel/annuel (rapports comptables — dernier élément du périmètre validé le
 * 2026-07-30, voir ADR-053) : Actif = Passif + Capitaux propres + Résultat de l'exercice. Sur
 * année civile (référentiel OHADA/SYSCOHADA), pas année académique — décision déjà validée pour
 * les autres rapports comptables de ce lot. L'Actif regroupe les comptes ACTIF et TRESORERIE
 * (disponibilités) ; les soldes Actif/Passif/Capitaux propres sont cumulés depuis l'origine du
 * plan comptable jusqu'à la date de clôture demandée (comme une balance), tandis que le Résultat
 * de l'exercice ne cumule que depuis le 1er janvier de l'année civile de cette date (les comptes
 * de produits/charges sont des comptes de flux, remis à zéro chaque exercice).
 */
export const bilanPeriodSchema = z.enum(["MOIS", "SEMESTRE", "ANNEE"]);
export type BilanPeriod = z.infer<typeof bilanPeriodSchema>;

export const bilanInputSchema = z.object({
  period: bilanPeriodSchema,
  date: z.coerce.date().optional(),
});
export type BilanInput = z.infer<typeof bilanInputSchema>;

export const bilanAccountLineSchema = z.object({
  accountId: z.string().uuid(),
  accountCode: z.string(),
  accountLabel: z.string(),
  balance: z.number(),
});
export type BilanAccountLine = z.infer<typeof bilanAccountLineSchema>;

export const bilanResultSchema = z.object({
  periodLabel: z.string(),
  balanceDate: z.coerce.date(),
  fiscalYearStart: z.coerce.date(),
  actifLines: z.array(bilanAccountLineSchema),
  passifLines: z.array(bilanAccountLineSchema),
  capitauxPropresLines: z.array(bilanAccountLineSchema),
  resultatExercice: z.number(),
  totalActif: z.number(),
  totalPassif: z.number(),
  totalCapitauxPropres: z.number(),
  isBalanced: z.boolean(),
});
export type BilanResult = z.infer<typeof bilanResultSchema>;
