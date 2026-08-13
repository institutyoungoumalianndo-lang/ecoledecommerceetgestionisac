import { prisma } from "@isac-erp/db";
import type { AlertComparator } from "@isac-erp/shared";
import { getFinancialDashboard } from "./financialReportService.js";
import { getAllActiveStudentFeeSummaries, SCOLARITE_FEE_TYPE_CODE } from "./feeSummaryService.js";
import { getPayrollDashboard } from "./payrollDashboardService.js";
import { createInternalNotification } from "./internalNotificationService.js";

const CHECK_INTERVAL_MS = 5 * 60_000;

export function compare(value: number, comparator: AlertComparator, threshold: number): boolean {
  switch (comparator) {
    case "LT":
      return value < threshold;
    case "LTE":
      return value <= threshold;
    case "GT":
      return value > threshold;
    case "GTE":
      return value >= threshold;
  }
}

/**
 * Un calcul par `metricType` connu (voir docs/modules/MODULE-10-tableau-de-bord.md §1.3/§2) — chacun
 * réutilise un service déjà existant, jamais un nouveau calcul indépendant. `null` = métrique non
 * calculable dans l'état actuel des données (ex. aucune année universitaire active).
 */
async function computeMetricValue(metricType: string): Promise<number | null> {
  switch (metricType) {
    case "TRESORERIE_DISPONIBLE": {
      const dashboard = await getFinancialDashboard();
      return dashboard.treasuryBalance;
    }
    case "IMPAYES_EN_RETARD_MONTANT": {
      const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
      if (!activeYear) return null;
      const summaries = await getAllActiveStudentFeeSummaries(activeYear.id);
      const now = new Date();
      // Scolarité uniquement (2026-08-09, retour du porteur du projet) — `lines` couvre tous les
      // types de frais actifs, mais seule la scolarité entre dans un montant "dû"/"en retard".
      return summaries.reduce(
        (sum, s) =>
          sum +
          s.lines
            .filter((line) => line.feeTypeCode === SCOLARITE_FEE_TYPE_CODE)
            .reduce(
              (lineSum, line) =>
                lineSum +
                line.installments.reduce(
                  (instSum, inst) => (inst.dueDate < now && inst.remainingAmount > 0 ? instSum + inst.remainingAmount : instSum),
                  0
                ),
              0
            ),
        0
      );
    }
    case "TAUX_OCCUPATION_CLASSE_MAX": {
      const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
      if (!activeYear) return null;
      const classes = await prisma.class.findMany({
        where: { academicYearId: activeYear.id, isActive: true, maxCapacity: { not: null } },
        include: { _count: { select: { enrollments: { where: { cancelledAt: null } } } } },
      });
      if (classes.length === 0) return null;
      const rates = classes.map((c) => (c._count.enrollments / c.maxCapacity!) * 100);
      return Math.max(...rates);
    }
    case "MASSE_SALARIALE_MENSUELLE": {
      const dashboard = await getPayrollDashboard({});
      return dashboard.monthlyPayroll;
    }
    default:
      return null;
  }
}

async function getUserIdsWithPermission(permissionCode: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      roles: { some: { role: { permissions: { some: { permission: { code: permissionCode } } } } } },
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

/**
 * Évalue une règle active : crée un `AlertEvent` (et notifie) au premier franchissement, ne renotifie
 * pas tant que l'événement reste non résolu, marque `resolvedAt` quand la métrique repasse du bon
 * côté du seuil (voir §2 du doc — évite le bruit répété).
 */
async function evaluateRule(rule: {
  id: string;
  code: string;
  label: string;
  metricType: string;
  comparator: AlertComparator;
  threshold: number;
}): Promise<void> {
  const value = await computeMetricValue(rule.metricType);
  if (value === null) return;

  const breached = compare(value, rule.comparator, rule.threshold);
  const openEvent = await prisma.alertEvent.findFirst({ where: { ruleId: rule.id, resolvedAt: null }, orderBy: { triggeredAt: "desc" } });

  if (breached && !openEvent) {
    await prisma.alertEvent.create({ data: { ruleId: rule.id, value } });
    const recipientIds = await getUserIdsWithPermission("ALERTES:LECTURE");
    await Promise.all(
      recipientIds.map((userId) =>
        createInternalNotification(userId, `Alerte : ${rule.label}`, `Valeur mesurée : ${value.toLocaleString("fr-FR")}.`, {
          type: "alertRule",
          id: rule.id,
        })
      )
    );
  } else if (!breached && openEvent) {
    await prisma.alertEvent.update({ where: { id: openEvent.id }, data: { resolvedAt: new Date() } });
  }
}

async function tick(): Promise<void> {
  try {
    const rules = await prisma.alertRule.findMany({ where: { isActive: true } });
    for (const rule of rules) {
      await evaluateRule({ ...rule, comparator: rule.comparator as AlertComparator, threshold: Number(rule.threshold) });
    }
  } catch (err) {
    console.error("Boucle de vérification des règles d'alerte en échec :", err);
  }
}

/**
 * Boucle de vérification périodique (MODULE-10 §1.3) — même principe que
 * `communicationScheduler.ts` (Module 12 §1.6/§1.7) : aucune dépendance externe, cohérente avec le
 * serveur persistant par campus déjà acté (ADR-007).
 */
export function startAlertEngine(): void {
  setInterval(() => void tick(), CHECK_INTERVAL_MS);
}
