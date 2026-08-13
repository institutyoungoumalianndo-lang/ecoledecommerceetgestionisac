import { describe, expect, it } from "vitest";
import { endOf, startOfWeek } from "./financialReportService.js";

describe("startOfWeek", () => {
  it("un lundi retombe sur lui-même", () => {
    const monday = new Date(2026, 6, 27); // lundi 27 juillet 2026
    expect(startOfWeek(monday).getDate()).toBe(27);
  });

  it("un dimanche retombe sur le lundi précédent", () => {
    const sunday = new Date(2026, 7, 2); // dimanche 2 août 2026
    const result = startOfWeek(sunday);
    expect(result.getDate()).toBe(27);
    expect(result.getMonth()).toBe(6); // juillet
  });
});

describe("endOf", () => {
  it("gère le changement d'année pour un mois de décembre", () => {
    const start = new Date(2026, 11, 1); // décembre 2026
    const end = endOf("month", start);
    expect(end.getFullYear()).toBe(2027);
    expect(end.getMonth()).toBe(0);
  });

  it("gère le changement d'année pour une période annuelle", () => {
    const start = new Date(2026, 0, 1);
    const end = endOf("year", start);
    expect(end.getFullYear()).toBe(2027);
  });
});
