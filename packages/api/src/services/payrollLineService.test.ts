import { describe, expect, it } from "vitest";
import { computeMonthlyPlannedHours, computePayrollTotals, intersectDateRanges } from "./payrollLineService.js";

describe("intersectDateRanges", () => {
  it("retourne l'intersection quand les intervalles se chevauchent", () => {
    const result = intersectDateRanges(
      new Date("2026-01-01"),
      new Date("2026-06-30"),
      new Date("2026-02-01"),
      new Date("2026-02-28")
    );
    expect(result).toEqual({ start: new Date("2026-02-01"), end: new Date("2026-02-28") });
  });

  it("retourne null quand les intervalles ne se chevauchent pas", () => {
    const result = intersectDateRanges(
      new Date("2026-01-01"),
      new Date("2026-01-31"),
      new Date("2026-03-01"),
      new Date("2026-03-31")
    );
    expect(result).toBeNull();
  });
});

describe("computeMonthlyPlannedHours", () => {
  const monthStart = new Date("2026-02-01");
  const monthEnd = new Date("2026-02-28T23:59:59");

  it("retourne 0 si l'affectation ne chevauche pas le mois de paie", () => {
    const hours = computeMonthlyPlannedHours(
      [{ weeklyHours: 6, periodStart: new Date("2025-09-01"), periodEnd: new Date("2026-01-15") }],
      monthStart,
      monthEnd
    );
    expect(hours).toBe(0);
  });

  it("calcule les heures proportionnellement aux semaines du mois couvertes par le semestre", () => {
    // Semestre couvrant tout février (28 jours = 4 semaines) à 6h/semaine.
    const hours = computeMonthlyPlannedHours(
      [{ weeklyHours: 6, periodStart: new Date("2026-01-05"), periodEnd: new Date("2026-06-30") }],
      monthStart,
      monthEnd
    );
    expect(hours).toBeCloseTo(6 * 4, 0);
  });

  it("cumule plusieurs affectations actives sur le même mois", () => {
    const hours = computeMonthlyPlannedHours(
      [
        { weeklyHours: 4, periodStart: new Date("2026-01-05"), periodEnd: new Date("2026-06-30") },
        { weeklyHours: 3, periodStart: new Date("2026-01-05"), periodEnd: new Date("2026-06-30") },
      ],
      monthStart,
      monthEnd
    );
    expect(hours).toBeCloseTo(7 * 4, 0);
  });
});

describe("computePayrollTotals", () => {
  it("calcule le brut comme base + heures sup + primes + indemnités", () => {
    const { grossSalary } = computePayrollTotals({
      baseSalary: 500000,
      overtimeAmount: 20000,
      totalPrimes: 10000,
      totalIndemnites: 5000,
      totalRetenues: 0,
      totalCotisations: 0,
      totalAdvancesDeducted: 0,
    });
    expect(grossSalary).toBe(535000);
  });

  it("calcule le net comme brut - retenues - cotisations - avances déduites", () => {
    const { grossSalary, netSalary } = computePayrollTotals({
      baseSalary: 500000,
      overtimeAmount: 0,
      totalPrimes: 0,
      totalIndemnites: 0,
      totalRetenues: 15000,
      totalCotisations: 25000,
      totalAdvancesDeducted: 50000,
    });
    expect(grossSalary).toBe(500000);
    expect(netSalary).toBe(410000);
  });
});
