import { describe, expect, it } from "vitest";
import { computeWeeksInRange, computeWorkloadFromPeriods } from "./teacherAssignmentService.js";

describe("computeWeeksInRange", () => {
  it("calcule le nombre de semaines entre deux dates", () => {
    expect(computeWeeksInRange(new Date("2026-01-01"), new Date("2026-01-15"))).toBeCloseTo(2, 5);
  });

  it("ne retourne jamais une valeur négative si les dates sont inversées", () => {
    expect(computeWeeksInRange(new Date("2026-01-15"), new Date("2026-01-01"))).toBe(0);
  });
});

describe("computeWorkloadFromPeriods", () => {
  it("retourne des heures nulles si aucun semestre n'est en cours aujourd'hui", () => {
    const periods = [
      { startDate: new Date("2025-09-01"), endDate: new Date("2025-12-20"), weeklyHours: 6 },
    ];
    const result = computeWorkloadFromPeriods(periods, new Date("2026-07-27"));
    expect(result.weeklyHours).toBe(0);
    expect(result.monthlyHours).toBe(0);
    expect(result.semesterHours).toBe(0);
    // L'année reste calculée sur tous les semestres, même hors période courante.
    expect(result.yearlyHours).toBeGreaterThan(0);
  });

  it("calcule semaine/mois/semestre depuis le semestre en cours (celui contenant aujourd'hui)", () => {
    const periods = [
      { startDate: new Date("2026-01-05"), endDate: new Date("2026-06-30"), weeklyHours: 10 },
    ];
    const today = new Date("2026-02-15");
    const result = computeWorkloadFromPeriods(periods, today);
    expect(result.weeklyHours).toBe(10);
    expect(result.monthlyHours).toBeCloseTo(10 * 4.345, 5);
    expect(result.semesterHours).toBeCloseTo(10 * computeWeeksInRange(periods[0]!.startDate, periods[0]!.endDate), 5);
  });

  it("cumule l'année sur tous les semestres, même ceux hors période courante", () => {
    const semester1 = { startDate: new Date("2025-09-01"), endDate: new Date("2026-01-15"), weeklyHours: 8 };
    const semester2 = { startDate: new Date("2026-01-16"), endDate: new Date("2026-06-30"), weeklyHours: 5 };
    const today = new Date("2026-02-01");
    const result = computeWorkloadFromPeriods([semester1, semester2], today);
    expect(result.weeklyHours).toBe(5);
    const expectedYearly =
      8 * computeWeeksInRange(semester1.startDate, semester1.endDate) +
      5 * computeWeeksInRange(semester2.startDate, semester2.endDate);
    expect(result.yearlyHours).toBeCloseTo(expectedYearly, 5);
  });
});
