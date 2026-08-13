import { describe, expect, it } from "vitest";
import { resolveCalendarYearForMonth } from "./academicCalendar";

describe("resolveCalendarYearForMonth", () => {
  const academicYear = { startDate: new Date(2026, 8, 1), endDate: new Date(2027, 6, 31) }; // 1 sept. 2026 → 31 juil. 2027

  it("résout à l'année de début pour un mois du premier semestre (ex. septembre, décembre)", () => {
    expect(resolveCalendarYearForMonth(9, academicYear)).toBe(2026);
    expect(resolveCalendarYearForMonth(12, academicYear)).toBe(2026);
  });

  it("résout à l'année de fin pour un mois du second semestre (ex. février, juillet)", () => {
    expect(resolveCalendarYearForMonth(2, academicYear)).toBe(2027);
    expect(resolveCalendarYearForMonth(7, academicYear)).toBe(2027);
  });

  it("retourne directement l'année si l'année scolaire ne chevauche pas deux années calendaires", () => {
    const sameYear = { startDate: new Date(2026, 0, 1), endDate: new Date(2026, 11, 31) };
    expect(resolveCalendarYearForMonth(6, sameYear)).toBe(2026);
  });
});
