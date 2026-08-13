import { describe, expect, it } from "vitest";
import { findOverlappingPeriod, isPeriodWithinAcademicYear } from "./academicPeriodService.js";

describe("findOverlappingPeriod", () => {
  const module1 = { label: "Module 1", startDate: new Date(2026, 9, 5), endDate: new Date(2026, 11, 20) };

  it("détecte un chevauchement partiel", () => {
    const candidate = { startDate: new Date(2026, 11, 1), endDate: new Date(2027, 1, 1) };
    expect(findOverlappingPeriod(candidate, [module1])).toBe(module1);
  });

  it("détecte un chevauchement total (Module 2 englobe Module 1)", () => {
    const candidate = { startDate: new Date(2026, 9, 5), endDate: new Date(2027, 7, 30) };
    expect(findOverlappingPeriod(candidate, [module1])).toBe(module1);
  });

  it("ne signale rien pour des périodes consécutives sans chevauchement", () => {
    const candidate = { startDate: new Date(2026, 11, 20), endDate: new Date(2027, 5, 30) };
    expect(findOverlappingPeriod(candidate, [module1])).toBeNull();
  });
});

describe("isPeriodWithinAcademicYear", () => {
  const academicYear = { startDate: new Date(2026, 9, 5), endDate: new Date(2027, 5, 30) };

  it("accepte un module entièrement compris dans l'année", () => {
    const candidate = { startDate: new Date(2026, 9, 5), endDate: new Date(2026, 11, 20) };
    expect(isPeriodWithinAcademicYear(candidate, academicYear)).toBe(true);
  });

  it("rejette un module qui déborde avant le début de l'année", () => {
    const candidate = { startDate: new Date(2026, 3, 1), endDate: new Date(2026, 5, 28) };
    expect(isPeriodWithinAcademicYear(candidate, academicYear)).toBe(false);
  });

  it("rejette un module qui déborde après la fin de l'année", () => {
    const candidate = { startDate: new Date(2027, 4, 1), endDate: new Date(2027, 7, 30) };
    expect(isPeriodWithinAcademicYear(candidate, academicYear)).toBe(false);
  });
});
