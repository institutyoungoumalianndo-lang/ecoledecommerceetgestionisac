import { z } from "zod";

/**
 * Tableau de bord d'accueil unifié — refonte UI/UX Phase 3 (2026-07-30). Chaque
 * carte/graphique est `nullable` : le serveur calcule uniquement les sections
 * couvertes par une permission de lecture que l'utilisateur possède déjà
 * (mêmes codes que les tableaux de bord de module existants) et renvoie `null`
 * pour le reste — jamais de donnée calculée puis simplement masquée côté UI.
 */
export const homeDashboardCardsSchema = z.object({
  activeStudentsCount: z.number().int().nullable(),
  enrolledTodayCount: z.number().int().nullable(),
  collectedTodayAmount: z.number().nullable(),
  collectedMonthAmount: z.number().nullable(),
  debtorStudentsCount: z.number().int().nullable(),
  activeTeachersCount: z.number().int().nullable(),
  classCount: z.number().int().nullable(),
  filiereCount: z.number().int().nullable(),
  seancesThisWeekCount: z.number().int().nullable(),
  // "Examens" du cahier des charges : aucune entité "examen" n'existe dans le modèle de données
  // (le Module 6 gère des notes/bulletins par période, pas des examens distincts) — indicateur de
  // substitution transparent : périodes d'évaluation actives à la date du jour.
  openEvaluationPeriodsCount: z.number().int().nullable(),
  pendingPaymentsAmount: z.number().nullable(),
  smsSentMonthCount: z.number().int().nullable(),
  whatsappSentMonthCount: z.number().int().nullable(),
  emailsSentMonthCount: z.number().int().nullable(),
  notificationsCount: z.number().int().nullable(),
  // "Alertes importantes" : aucun concept d'alerte générique n'existe — composite transparent
  // (messages échoués + cartes d'étudiant expirées) en attendant un vrai centre d'alertes.
  importantAlertsCount: z.number().int().nullable(),
});
export type HomeDashboardCards = z.infer<typeof homeDashboardCardsSchema>;

const monthlyPointSchema = z.object({ label: z.string(), value: z.number() });
const revenueMonthlyPointSchema = z.object({ label: z.string(), recettes: z.number(), depenses: z.number() });
const distributionPointSchema = z.object({ label: z.string(), count: z.number().int() });

export const homeDashboardChartsSchema = z.object({
  enrollmentsByMonth: z.array(monthlyPointSchema).nullable(),
  revenueByMonth: z.array(revenueMonthlyPointSchema).nullable(),
  byFiliere: z.array(distributionPointSchema).nullable(),
  byGender: z.object({ M: z.number().int(), F: z.number().int() }).nullable(),
  byLevel: z.array(distributionPointSchema).nullable(),
  paymentsByMonth: z.array(monthlyPointSchema).nullable(),
  collectionsHistory: z.array(monthlyPointSchema).nullable(),
});
export type HomeDashboardCharts = z.infer<typeof homeDashboardChartsSchema>;

export const homeDashboardSchema = z.object({
  cards: homeDashboardCardsSchema,
  charts: homeDashboardChartsSchema,
});
export type HomeDashboard = z.infer<typeof homeDashboardSchema>;
