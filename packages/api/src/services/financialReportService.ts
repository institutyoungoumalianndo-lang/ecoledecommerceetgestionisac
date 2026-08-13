import { prisma } from "@isac-erp/db";
import type {
  BilanInput,
  BilanResult,
  CashRegisterJournalInput,
  CashRegisterJournalResult,
  DailyCashPosition,
  DailyCashPositionInput,
  FinancialDashboard,
  FinancialReportByCashRegister,
  FinancialReportByCategory,
  FinancialReportByPeriod,
  FinancialReportByUser,
  FinancialReportPeriodInput,
  GeneralLedgerInput,
  GeneralLedgerResult,
  RevenueSummary,
  RevenueSummaryInput,
  TrialBalanceInput,
  TrialBalanceResult,
} from "@isac-erp/shared";

function fullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7)); // lundi
  return d;
}

export function startOfMonth(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function startOfSemester(date: Date): Date {
  const semesterStartMonth = date.getMonth() < 6 ? 0 : 6;
  return new Date(date.getFullYear(), semesterStartMonth, 1);
}

export function endOf(unit: "day" | "week" | "month" | "year", start: Date): Date {
  const end = new Date(start);
  if (unit === "day") end.setDate(end.getDate() + 1);
  if (unit === "week") end.setDate(end.getDate() + 7);
  if (unit === "month") end.setMonth(end.getMonth() + 1);
  if (unit === "year") end.setFullYear(end.getFullYear() + 1);
  return end;
}

/** Grand livre d'un compte (MODULE-07 §1.11) — calculé uniquement depuis journal_entry_lines. */
export async function getGeneralLedger(input: GeneralLedgerInput): Promise<GeneralLedgerResult> {
  const account = await prisma.chartAccount.findUniqueOrThrow({ where: { id: input.accountId } });

  // Statut non filtré : une écriture ANNULEE reste un mouvement réellement posté, sa
  // contre-passation (toujours VALIDEE) est un second mouvement séparé — les deux
  // doivent compter pour que la paire se neutralise exactement à zéro (voir MODULE-07 §1.6).
  const openingLines = input.dateFrom
    ? await prisma.journalEntryLine.findMany({
        where: { accountId: input.accountId, journalEntry: { entryDate: { lt: input.dateFrom } } },
        select: { debit: true, credit: true },
      })
    : [];
  const openingBalance = openingLines.reduce((sum, l) => sum + Number(l.debit) - Number(l.credit), 0);

  const lines = await prisma.journalEntryLine.findMany({
    where: {
      accountId: input.accountId,
      journalEntry: {
        entryDate: { gte: input.dateFrom, lte: input.dateTo },
      },
    },
    include: { journalEntry: true },
    orderBy: { journalEntry: { entryDate: "asc" } },
  });

  let running = openingBalance;
  const ledgerLines = lines.map((l) => {
    running += Number(l.debit) - Number(l.credit);
    return {
      journalEntryId: l.journalEntry.id,
      entryNumber: l.journalEntry.entryNumber,
      entryDate: l.journalEntry.entryDate,
      label: l.label ?? l.journalEntry.label,
      debit: Number(l.debit),
      credit: Number(l.credit),
      runningBalance: running,
    };
  });

  return {
    accountId: account.id,
    accountCode: account.code,
    accountLabel: account.label,
    openingBalance,
    lines: ledgerLines,
    closingBalance: running,
  };
}

/** Balance comptable (MODULE-07 §1.11) — tous les comptes actifs, agrégés depuis journal_entry_lines. */
export async function getTrialBalance(input: TrialBalanceInput): Promise<TrialBalanceResult> {
  const accounts = await prisma.chartAccount.findMany({ where: { isActive: true }, orderBy: { code: "asc" } });
  const grouped = await prisma.journalEntryLine.groupBy({
    by: ["accountId"],
    where: { journalEntry: { entryDate: { gte: input.dateFrom, lte: input.dateTo } } },
    _sum: { debit: true, credit: true },
  });
  const byAccount = new Map(grouped.map((g) => [g.accountId, { debit: Number(g._sum.debit ?? 0), credit: Number(g._sum.credit ?? 0) }]));

  const rows = accounts.map((a) => {
    const totals = byAccount.get(a.id) ?? { debit: 0, credit: 0 };
    return {
      accountId: a.id,
      accountCode: a.code,
      accountLabel: a.label,
      type: a.type,
      totalDebit: totals.debit,
      totalCredit: totals.credit,
      balance: totals.debit - totals.credit,
    };
  });

  return {
    rows,
    totalDebit: rows.reduce((sum, r) => sum + r.totalDebit, 0),
    totalCredit: rows.reduce((sum, r) => sum + r.totalCredit, 0),
  };
}

/** Exportée pour réutilisation par `financialTrendsService.ts` (MODULE-10 §1.2) — jamais dupliquée. */
export async function sumLinesByAccountType(type: "PRODUIT" | "CHARGE", side: "credit" | "debit", from: Date, to: Date): Promise<number> {
  const result = await prisma.journalEntryLine.aggregate({
    where: {
      journalEntry: { entryDate: { gte: from, lt: to } },
      account: { type },
    },
    _sum: { [side]: true },
  });
  return Number((result._sum as Record<string, unknown>)[side] ?? 0);
}

/** Tableau de bord financier (MODULE-07 §8.13) — recettes/dépenses = mouvements sur comptes de produits/charges. */
export async function getFinancialDashboard(): Promise<FinancialDashboard> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);

  const [recettesToday, depensesToday, recettesMonth, depensesMonth, treasuryLines] = await Promise.all([
    sumLinesByAccountType("PRODUIT", "credit", todayStart, endOf("day", todayStart)),
    sumLinesByAccountType("CHARGE", "debit", todayStart, endOf("day", todayStart)),
    sumLinesByAccountType("PRODUIT", "credit", monthStart, endOf("month", monthStart)),
    sumLinesByAccountType("CHARGE", "debit", monthStart, endOf("month", monthStart)),
    prisma.journalEntryLine.findMany({
      where: { account: { type: "TRESORERIE" } },
      select: { debit: true, credit: true },
    }),
  ]);
  const treasuryBalance = treasuryLines.reduce((sum, l) => sum + Number(l.debit) - Number(l.credit), 0);

  const recentMonths = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = startOfMonth(monthDate);
    const end = endOf("month", start);
    const [recettes, depenses] = await Promise.all([
      sumLinesByAccountType("PRODUIT", "credit", start, end),
      sumLinesByAccountType("CHARGE", "debit", start, end),
    ]);
    recentMonths.push({ label: start.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }), recettes, depenses });
  }

  return { recettesToday, depensesToday, recettesMonth, depensesMonth, treasuryBalance, recentMonths };
}

/** Rapport par période (MODULE-07 §8.12) — jour/semaine/mois/année, basé sur une date de référence. */
export async function getReportByPeriod(input: FinancialReportPeriodInput): Promise<FinancialReportByPeriod> {
  const reference = input.date ?? new Date();
  const unitMap = { JOUR: "day", SEMAINE: "week", MOIS: "month", ANNEE: "year" } as const;
  const unit = unitMap[input.period];
  const startFns = { day: startOfDay, week: startOfWeek, month: startOfMonth, year: startOfYear } as const;
  const start = startFns[unit](reference);
  const end = endOf(unit, start);

  const [totalRecettes, totalDepenses] = await Promise.all([
    sumLinesByAccountType("PRODUIT", "credit", start, end),
    sumLinesByAccountType("CHARGE", "debit", start, end),
  ]);

  const labelMap = { JOUR: "Journalier", SEMAINE: "Hebdomadaire", MOIS: "Mensuel", ANNEE: "Annuel" };
  return {
    periodLabel: `${labelMap[input.period]} — ${start.toLocaleDateString("fr-FR")}`,
    dateFrom: start,
    dateTo: end,
    totalRecettes,
    totalDepenses,
    solde: totalRecettes - totalDepenses,
  };
}

export async function getReportByCategory(dateFrom?: Date, dateTo?: Date): Promise<FinancialReportByCategory> {
  const grouped = await prisma.expense.groupBy({
    by: ["categoryId"],
    where: { status: "APPROUVEE", date: { gte: dateFrom, lte: dateTo } },
    _sum: { amount: true },
  });
  const categories = await prisma.expenseCategory.findMany({ where: { id: { in: grouped.map((g) => g.categoryId) } } });
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  return {
    rows: grouped.map((g) => ({
      categoryId: g.categoryId,
      categoryName: categoryById.get(g.categoryId)?.name ?? "?",
      total: Number(g._sum.amount ?? 0),
    })),
  };
}

export async function getReportByUser(dateFrom?: Date, dateTo?: Date): Promise<FinancialReportByUser> {
  const [payments, expenses] = await Promise.all([
    prisma.payment.groupBy({
      by: ["recordedBy"],
      where: { status: "VALIDE", createdAt: { gte: dateFrom, lte: dateTo } },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["responsibleUserId"],
      where: { status: "APPROUVEE", date: { gte: dateFrom, lte: dateTo } },
      _sum: { amount: true },
    }),
  ]);

  const userIds = [...new Set([...payments.map((p) => p.recordedBy), ...expenses.map((e) => e.responsibleUserId)])];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
  const userById = new Map(users.map((u) => [u.id, u]));
  const recettesByUser = new Map(payments.map((p) => [p.recordedBy, Number(p._sum.amount ?? 0)]));
  const depensesByUser = new Map(expenses.map((e) => [e.responsibleUserId, Number(e._sum.amount ?? 0)]));

  return {
    rows: userIds.map((userId) => ({
      userId,
      userName: userById.get(userId) ? fullName(userById.get(userId)!) : "?",
      totalRecettes: recettesByUser.get(userId) ?? 0,
      totalDepenses: depensesByUser.get(userId) ?? 0,
    })),
  };
}

export async function getReportByCashRegister(dateFrom?: Date, dateTo?: Date): Promise<FinancialReportByCashRegister> {
  const payments = await prisma.payment.findMany({
    where: { status: "VALIDE", createdAt: { gte: dateFrom, lte: dateTo } },
    select: { amount: true, cashRegisterSession: { select: { cashRegisterId: true, cashRegister: { select: { name: true } } } } },
  });
  const byRegister = new Map<string, { name: string; total: number }>();
  for (const p of payments) {
    const id = p.cashRegisterSession.cashRegisterId;
    const entry = byRegister.get(id) ?? { name: p.cashRegisterSession.cashRegister.name, total: 0 };
    entry.total += Number(p.amount);
    byRegister.set(id, entry);
  }
  return { rows: [...byRegister.entries()].map(([cashRegisterId, v]) => ({ cashRegisterId, cashRegisterName: v.name, total: v.total })) };
}

/**
 * Journal de caisse (rapports comptables — extension du 2026-07-30) : mouvements espèces d'une session
 * de caisse précise, dans l'ordre chronologique, avec solde courant depuis le solde d'ouverture déclaré.
 */
export async function getCashRegisterJournal(input: CashRegisterJournalInput): Promise<CashRegisterJournalResult> {
  const session = await prisma.cashRegisterSession.findUniqueOrThrow({
    where: { id: input.cashRegisterSessionId },
    include: { cashRegister: true },
  });

  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: { cashRegisterSessionId: session.id, status: "VALIDE", paymentMethod: { code: "ESPECES" } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.expense.findMany({
      where: { cashRegisterSessionId: session.id, status: "APPROUVEE", paymentMethod: { code: "ESPECES" } },
      orderBy: { date: "asc" },
    }),
  ]);

  const raw = [
    ...payments.map((p) => ({ date: p.createdAt, label: `Reçu n° ${p.receiptNumber}`, type: "RECETTE" as const, amount: Number(p.amount) })),
    ...expenses.map((e) => ({ date: e.date, label: e.label, type: "DEPENSE" as const, amount: Number(e.amount) })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = Number(session.openingBalance);
  const movements = raw.map((m) => {
    running += m.type === "RECETTE" ? m.amount : -m.amount;
    return { ...m, runningBalance: running };
  });

  return {
    cashRegisterSessionId: session.id,
    cashRegisterName: session.cashRegister.name,
    openedAt: session.openedAt,
    closedAt: session.closedAt,
    openingBalance: Number(session.openingBalance),
    movements,
    closingBalance: running,
  };
}

/**
 * Situation de caisse journalière (rapports comptables — extension du 2026-07-30) : position d'une
 * caisse physique précise pour un jour donné — par opposition au Rapport de caisse quotidien (toutes
 * caisses confondues). Solde d'ouverture repris de la session ouverte ce jour, ou à défaut du solde de
 * clôture de la dernière session close avant cette date.
 */
export async function getDailyCashPosition(input: DailyCashPositionInput): Promise<DailyCashPosition> {
  const cashRegister = await prisma.cashRegister.findUniqueOrThrow({ where: { id: input.cashRegisterId } });
  const day = startOfDay(input.date ?? new Date());
  const dayEnd = endOf("day", day);

  const [recettesResult, depensesResult, sessionsToday, lastSessionBefore] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        status: "VALIDE",
        paymentMethod: { code: "ESPECES" },
        cashRegisterSession: { cashRegisterId: input.cashRegisterId },
        createdAt: { gte: day, lt: dayEnd },
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        status: "APPROUVEE",
        paymentMethod: { code: "ESPECES" },
        cashRegisterSession: { cashRegisterId: input.cashRegisterId },
        date: { gte: day, lt: dayEnd },
      },
      _sum: { amount: true },
    }),
    prisma.cashRegisterSession.findMany({
      where: { cashRegisterId: input.cashRegisterId, openedAt: { gte: day, lt: dayEnd } },
      orderBy: { openedAt: "asc" },
    }),
    prisma.cashRegisterSession.findFirst({
      where: { cashRegisterId: input.cashRegisterId, closedAt: { lt: day } },
      orderBy: { closedAt: "desc" },
    }),
  ]);

  const totalRecettes = Number(recettesResult._sum.amount ?? 0);
  const totalDepenses = Number(depensesResult._sum.amount ?? 0);
  const openingBalance = sessionsToday[0]
    ? Number(sessionsToday[0].openingBalance)
    : (lastSessionBefore?.closingBalanceComputed ?? null) !== null
      ? Number(lastSessionBefore!.closingBalanceComputed)
      : 0;

  const closedToday = sessionsToday.filter((s) => s.closedAt).at(-1) ?? null;

  return {
    cashRegisterId: cashRegister.id,
    cashRegisterName: cashRegister.name,
    date: day,
    openingBalance,
    totalRecettes,
    totalDepenses,
    closingBalanceTheorique: openingBalance + totalRecettes - totalDepenses,
    sessionDeclaredBalance: (closedToday?.closingBalanceDeclared ?? null) !== null ? Number(closedToday!.closingBalanceDeclared) : null,
    sessionVariance: (closedToday?.variance ?? null) !== null ? Number(closedToday!.variance) : null,
  };
}

/** Recettes (MODULE-07 §1.4) — lecture directe des paiements du Module 4.3, aucune duplication. */
export async function getRevenueSummary(input: RevenueSummaryInput): Promise<RevenueSummary> {
  const payments = await prisma.payment.findMany({
    where: { status: "VALIDE", createdAt: { gte: input.dateFrom, lte: input.dateTo } },
    include: { allocations: { include: { feeType: true } } },
  });

  const byFeeType = new Map<string, { name: string; total: number }>();
  let total = 0;
  for (const payment of payments) {
    total += Number(payment.amount);
    for (const allocation of payment.allocations) {
      const entry = byFeeType.get(allocation.feeTypeId) ?? { name: allocation.feeType.name, total: 0 };
      entry.total += Number(allocation.amount);
      byFeeType.set(allocation.feeTypeId, entry);
    }
  }

  return {
    total,
    count: payments.length,
    byFeeType: [...byFeeType.entries()].map(([feeTypeId, v]) => ({ feeTypeId, feeTypeName: v.name, total: v.total })),
  };
}

const BILAN_PERIOD_LABELS = { MOIS: "Mensuel", SEMESTRE: "Semestriel", ANNEE: "Annuel" } as const;

/**
 * Bilan mensuel/semestriel/annuel (rapports comptables — extension du 2026-07-30, voir ADR-053) :
 * Actif = Passif + Capitaux propres + Résultat de l'exercice. Réutilise getTrialBalance pour les
 * soldes Actif/Passif/Capitaux propres, cumulés depuis l'origine du plan comptable jusqu'à la date
 * de clôture de la période (comme une balance) ; le Résultat de l'exercice, lui, ne cumule que
 * depuis le 1er janvier de l'année civile de cette date (comptes de flux, remis à zéro chaque exercice).
 */
export async function getBilan(input: BilanInput): Promise<BilanResult> {
  const reference = input.date ?? new Date();
  const periodStart =
    input.period === "MOIS" ? startOfMonth(reference) : input.period === "SEMESTRE" ? startOfSemester(reference) : startOfYear(reference);
  const periodEnd =
    input.period === "MOIS"
      ? endOf("month", periodStart)
      : input.period === "SEMESTRE"
        ? new Date(periodStart.getFullYear(), periodStart.getMonth() + 6, 1)
        : endOf("year", periodStart);
  const balanceDate = new Date(periodEnd.getTime() - 1);
  const fiscalYearStart = startOfYear(balanceDate);

  const [trialBalance, produitsExercice, chargesExercice] = await Promise.all([
    getTrialBalance({ dateTo: balanceDate }),
    sumLinesByAccountType("PRODUIT", "credit", fiscalYearStart, periodEnd),
    sumLinesByAccountType("CHARGE", "debit", fiscalYearStart, periodEnd),
  ]);
  const resultatExercice = produitsExercice - chargesExercice;

  const toLine = (r: TrialBalanceResult["rows"][number], balance: number) => ({
    accountId: r.accountId,
    accountCode: r.accountCode,
    accountLabel: r.accountLabel,
    balance,
  });

  const actifLines = trialBalance.rows
    .filter((r) => (r.type === "ACTIF" || r.type === "TRESORERIE") && r.balance !== 0)
    .map((r) => toLine(r, r.balance));
  const passifLines = trialBalance.rows
    .filter((r) => r.type === "PASSIF" && r.balance !== 0)
    .map((r) => toLine(r, -r.balance));
  const capitauxPropresLines = trialBalance.rows
    .filter((r) => r.type === "CAPITAUX_PROPRES" && r.balance !== 0)
    .map((r) => toLine(r, -r.balance));

  const totalActif = actifLines.reduce((sum, l) => sum + l.balance, 0);
  const totalPassif = passifLines.reduce((sum, l) => sum + l.balance, 0);
  const totalCapitauxPropres = capitauxPropresLines.reduce((sum, l) => sum + l.balance, 0) + resultatExercice;

  return {
    periodLabel: `${BILAN_PERIOD_LABELS[input.period]} — ${balanceDate.toLocaleDateString("fr-FR")}`,
    balanceDate,
    fiscalYearStart,
    actifLines,
    passifLines,
    capitauxPropresLines,
    resultatExercice,
    totalActif,
    totalPassif,
    totalCapitauxPropres,
    isBalanced: Math.abs(totalActif - (totalPassif + totalCapitauxPropres)) < 1,
  };
}
